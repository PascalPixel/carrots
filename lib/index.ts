import http from "http";
import path from "path";
import semver from "semver";
import fs from "fs/promises";
import Router from "find-my-way";
import Handlebars from "handlebars";
import { formatDistanceToNow } from "date-fns";

interface Config {
  account: string;
  repository: string;
  token?: string;
}

interface GitHubAsset {
  url: string;
  name: string;
  size: number;
  content_type: string;
  browser_download_url: string;
}

interface GitHubRelease {
  name: string;
  body: string;
  draft: boolean;
  tag_name: string;
  prerelease: boolean;
  published_at: string;
  assets: GitHubAsset[];
}

interface PlatformAssets {
  url: string;
  date: string;
  name: string;
  size: number;
  notes: string;
  version: string;
  api_url: string;
  RELEASES?: string;
  content_type: string;
}

interface FileDetail {
  key: string;
  url: string;
  size: number;
  filename: string;
  platform: string;
}

interface TemplateVariables {
  date: string;
  github: string;
  account: string;
  version: string;
  repository: string;
  allReleases: string;
  files: Record<string, FileDetail>;
  releaseNotes: string;
}

interface PlatformInfo {
  name: string;
  aliases: string[];
  filePatterns: RegExp[];
}

enum Platform {
  APPIMAGE_ARM64 = "appimage-arm64",
  APPIMAGE_X64 = "appimage-x64",
  DARWIN_ARM64 = "darwin-arm64",
  DARWIN_X64 = "darwin-x64",
  DMG_ARM64 = "dmg-arm64",
  DMG_X64 = "dmg-x64",
  DEBIAN_ARM64 = "deb-arm64",
  DEBIAN_X64 = "deb-x64",
  FEDORA_ARM64 = "rpm-arm64",
  FEDORA_X64 = "rpm-x64",
  WIN32_ARM64 = "win32-arm64",
  WIN32_IA32 = "win32-ia32",
  WIN32_X64 = "win32-x64",
  NUPKG = "nupkg",
  SNAP_ARM64 = "snap-arm64",
  SNAP_X64 = "snap-x64",
}

const PLATFORMS: Record<Platform, PlatformInfo> = {
  [Platform.DMG_ARM64]: {
    name: "macOS Apple Silicon",
    aliases: ["dmg-arm64"],
    filePatterns: [
      /.*darwin-arm.*\.dmg/,
      /.*mac-arm.*\.dmg/,
      /.*osx-arm.*\.dmg/,
    ],
  },
  [Platform.DMG_X64]: {
    name: "macOS Intel",
    aliases: ["dmg"],
    filePatterns: [/.*darwin.*\.dmg/, /.*mac.*\.dmg/, /.*osx.*\.dmg/],
  },
  [Platform.DARWIN_ARM64]: {
    name: "macOS Apple Silicon",
    aliases: ["darwin-arm64"],
    filePatterns: [/.*darwin-arm*\.zip/, /.*mac-arm*\.zip/, /.*osx-arm*\.zip/],
  },
  [Platform.DARWIN_X64]: {
    name: "macOS Intel",
    aliases: ["darwin", "mac", "macos", "osx"],
    filePatterns: [/.*darwin.*\.zip/, /.*mac.*\.zip/, /.*osx.*\.zip/],
  },
  [Platform.WIN32_IA32]: {
    name: "Windows 32-bit",
    aliases: ["x86"],
    filePatterns: [/.*win32-ia32.*/],
  },
  [Platform.WIN32_X64]: {
    name: "Windows 64-bit",
    aliases: ["exe", "win", "win32", "windows", "win64", "x64"],
    filePatterns: [/.*win32-x64.*/],
  },
  [Platform.WIN32_ARM64]: {
    name: "Windows ARM",
    aliases: [],
    filePatterns: [/.*win32-arm64.*/],
  },
  [Platform.NUPKG]: {
    name: "Windows Update",
    aliases: [],
    filePatterns: [/.*\.nupkg/],
  },
  [Platform.APPIMAGE_ARM64]: {
    name: "Linux aarch64",
    aliases: ["appimage-arm64", "linux-arm64"],
    filePatterns: [/.*arm64.*\.appimage/, /.*aarch64.*\.appimage/],
  },
  [Platform.APPIMAGE_X64]: {
    name: "Linux x86_64",
    aliases: ["appimage", "linux"],
    filePatterns: [/.*\.appimage/],
  },
  [Platform.DEBIAN_ARM64]: {
    name: "Linux aarch64",
    aliases: ["deb-arm64", "debian-arm64"],
    filePatterns: [/.*arm64.*\.deb/, /.*aarch64.*\.deb/],
  },
  [Platform.DEBIAN_X64]: {
    name: "Linux x86_64",
    aliases: ["deb", "debian"],
    filePatterns: [/.*\.deb/],
  },
  [Platform.FEDORA_ARM64]: {
    name: "Linux aarch64",
    aliases: ["rpm-arm64"],
    filePatterns: [/.*arm64.*\.rpm/, /.*aarch64.*\.rpm/],
  },
  [Platform.FEDORA_X64]: {
    name: "Linux x86_64",
    aliases: ["fedora", "rpm"],
    filePatterns: [/.*\.rpm/],
  },
  [Platform.SNAP_ARM64]: {
    name: "Linux aarch64",
    aliases: ["snap-arm64"],
    filePatterns: [/.*arm64.*\.snap/, /.*aarch64.*\.snap/],
  },
  [Platform.SNAP_X64]: {
    name: "Linux x86_64",
    aliases: ["snap"],
    filePatterns: [/.*\.snap/],
  },
};

function fileNameToPlatform(fileName: string): Platform | null {
  const lowerCaseFileName = fileName.toLowerCase();
  for (const key of Object.keys(PLATFORMS)) {
    const platformInfo = PLATFORMS[key as Platform];
    for (const filePattern of platformInfo.filePatterns) {
      if (filePattern.test(lowerCaseFileName)) return key as Platform;
    }
  }
  return null;
}

function requestToPlatform(request: string): Platform | null {
  const lowerCaseRequest = request.toLowerCase();
  for (const key of Object.keys(PLATFORMS)) {
    const platformInfo = PLATFORMS[key as Platform];
    if (platformInfo.aliases.includes(lowerCaseRequest)) return key as Platform;
  }
  return null;
}

async function fetchLatestRelease(
  config: Config,
): Promise<Map<Platform, PlatformAssets> | null> {
  const latest = new Map<Platform, PlatformAssets>();
  const indexes = new Map<string, string>();

  const account = encodeURIComponent(config.account || "");
  const repository = encodeURIComponent(config.repository || "");
  const url = `https://api.github.com/repos/${account}/${repository}/releases?per_page=100`;
  const headers: HeadersInit = { Accept: "application/vnd.github.preview" };
  if (config.token) headers.Authorization = `token ${config.token}`;
  const releasesResponse = await fetch(url, { headers });

  if (releasesResponse.status === 403) {
    console.error("Rate Limited!");
    return null;
  }

  if (releasesResponse.status >= 400) {
    return null;
  }

  const releases: GitHubRelease[] = await releasesResponse.json();

  for (const release of releases) {
    if (
      !(!semver.valid(release.tag_name) || release.draft || release.prerelease)
    ) {
      for (const asset of release.assets) {
        if (asset.name === "RELEASES") {
          // Store in indexes
          indexes.set(release.tag_name, asset.url);
        } else {
          // Store in latest
          const platform = fileNameToPlatform(asset.name);
          if (platform && !latest.has(platform)) {
            latest.set(platform, {
              name: release.name,
              notes: release.body,
              version: release.tag_name,
              date: release.published_at,
              url: asset.browser_download_url,
              api_url: asset.url,
              content_type: asset.content_type,
              size: Math.round((asset.size / 1000000) * 10) / 10,
            });
          }
        }
      }
    }
  }

  for (const key of [
    Platform.WIN32_X64,
    Platform.WIN32_IA32,
    Platform.WIN32_ARM64,
  ]) {
    const asset = latest.get(key);
    if (asset && indexes.has(asset.version)) {
      const indexURL = indexes.get(asset.version) || "";
      const indexResponse = await fetch(indexURL, {
        headers: {
          Accept: "application/octet-stream",
          ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
        },
      });
      const content = await indexResponse.text();
      asset.RELEASES = content;
    }
  }

  return latest;
}

function createCache(config: Config) {
  let cachedLatest: Map<Platform, PlatformAssets> | null = null;
  let backupCachedLatest: Map<Platform, PlatformAssets> | null = null;
  let lastUpdated: number = 0;

  const getLatest = async () => {
    const now = Date.now();

    if (!cachedLatest || now - lastUpdated > 1000 * 60 * 15 /* 15 minutes */) {
      const fetchedLatest = await fetchLatestRelease(config);
      if (fetchedLatest) {
        cachedLatest = fetchedLatest;
        backupCachedLatest = fetchedLatest;
        lastUpdated = now;
      } else if (backupCachedLatest) {
        cachedLatest = backupCachedLatest;
      }
    }

    return cachedLatest;
  };

  return getLatest;
}

async function carrots(config: Config) {
  const router = Router();
  const getLatest = createCache(config);

  async function updateCache(res: http.ServerResponse) {
    let latest: Map<Platform, PlatformAssets> | null = null;
    let platforms: Platform[] = [];
    let version: string | undefined = "";
    let date: string | undefined = "";

    try {
      latest = await getLatest();
      if (latest) {
        platforms = Array.from(latest.keys());
        version = latest.get(platforms[0])?.version;
        date = latest.get(platforms[0])?.date;
      }
    } catch (e) {
      console.error(e);
      res.statusCode = 500;
      res.end("Failed to fetch latest releases");
      return { latest, platforms, version, date };
    }

    return { latest, platforms, version, date };
  }

  // Overview of all downloads
  router.get("/", async (req, res, params) => {
    const { latest, platforms, version, date } = await updateCache(res);
    if (!latest) {
      res.statusCode = 500;
      res.end("Failed to fetch latest releases");
      return;
    }

    // Render page
    const filepath = path.join(process.cwd(), "lib", "index.hbs");
    const filecontent = await fs.readFile(filepath, "utf8");
    const template = Handlebars.compile(filecontent);
    const files: Record<string, FileDetail> = {};
    for (const platform of platforms) {
      const asset = latest.get(platform);
      if (asset) {
        files[platform] = {
          key: platform,
          url: asset.url,
          size: asset.size,
          filename: asset.url.split("/").pop() || "",
          platform: PLATFORMS[platform].name,
        };
      }
    }
    const sortedFiles: Record<string, FileDetail> = {};
    Object.keys(files)
      .sort((a, b) => {
        return files[a].platform.localeCompare(files[b].platform);
      })
      .forEach((key) => {
        sortedFiles[key] = files[key];
      });
    const variables: TemplateVariables = {
      account: config.account || "",
      repository: config.repository || "",
      date: date
        ? formatDistanceToNow(new Date(date), { addSuffix: true })
        : "",
      files: sortedFiles,
      version: version || "",
      releaseNotes: `https://github.com/${config.account}/${config.repository}/releases/tag/${version}`,
      allReleases: `https://github.com/${config.account}/${config.repository}/releases`,
      github: `https://github.com/${config.account}/${config.repository}`,
    };
    const html = template(variables);

    // Send response
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html");
    res.end(html);
    return;
  });

  // Redirect to download latest release
  router.get("/download/:platform/:file?", async (req, res, params) => {
    const { latest, platforms, version, date } = await updateCache(res);
    if (!latest) {
      res.statusCode = 500;
      res.end("Failed to fetch latest releases");
      return;
    }

    // Parse platform
    if (!params.platform) {
      res.statusCode = 400;
      res.end("Missing platform");
      return;
    }
    const resolvedPlatform = requestToPlatform(params.platform);
    const isPlatform = latest.has(resolvedPlatform as Platform);
    if (!isPlatform) {
      res.statusCode = 400;
      res.end("Invalid platform");
      return;
    }

    // Get latest version
    const asset = latest.get(resolvedPlatform as Platform);
    if (!asset) {
      res.statusCode = 400;
      res.end("Invalid platform");
      return;
    }

    // Proxy the download
    const assetRes = await fetch(asset.api_url, {
      headers: {
        Accept: "application/octet-stream",
        ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
      },
      redirect: "manual",
    });
    res.statusCode = 302;
    res.setHeader("Location", assetRes.headers.get("Location") || "");
    res.end();
    return;
  });

  // Electron.autoUpdater
  router.get("/update/:platform/:version/:file?", async (req, res, params) => {
    const { latest, platforms, version, date } = await updateCache(res);
    if (!latest) {
      res.statusCode = 500;
      res.end("Failed to fetch latest releases");
      return;
    }

    // Address
    const address = `${
      req.headers.protocol ||
      req.headers.host?.includes("localhost") ||
      req.headers.host?.includes("[::]")
        ? "http"
        : "https"
    }://${req.headers.host || ""}/`;

    // Parse platform
    if (!params.platform) {
      res.statusCode = 400;
      res.end("Missing platform");
      return;
    }
    const resolvedPlatform = requestToPlatform(params.platform);
    const isPlatform = latest.has(resolvedPlatform as Platform);
    if (!isPlatform) {
      res.statusCode = 400;
      res.end("Invalid platform");
      return;
    }
    const validPlatform = resolvedPlatform as Platform;

    // Parse version
    if (!params.version) {
      res.statusCode = 400;
      res.end("Missing version");
      return;
    }
    const isVersion = semver.valid(params.version);
    if (!isVersion) {
      res.statusCode = 400;
      res.end("Invalid version");
      return;
    }

    // Get latest version
    const asset = latest.get(validPlatform);
    if (!asset) {
      res.statusCode = 400;
      res.end("Invalid platform");
      return;
    }

    // Upgrade or Downgrade(!) to the 'latest version' on the server
    const isLatestVersion = semver.eq(params.version, asset.version);
    if (isLatestVersion) {
      res.statusCode = 204;
      res.end();
      return;
    }

    // Windows update
    if (params.file?.toUpperCase() === "RELEASES") {
      if (!asset || !asset.RELEASES) {
        // not found
        res.statusCode = 204;
        res.end();
        return;
      }

      const patchedReleases = asset.RELEASES.replace(
        /([A-Fa-f0-9]+)\s([^\s]+\.nupkg)\s(\d+)/g,
        `$1 ${address}download/nupkg/$2 $3`,
      );

      res.statusCode = 200;
      res.setHeader(
        "content-length",
        Buffer.byteLength(patchedReleases, "utf8"),
      );
      res.setHeader("content-type", "application/octet-stream");
      res.end(patchedReleases);
      return;
    }

    // Proxy the update
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({
        url: `${address}download/${params.platform}`,
        name: asset.version,
        notes: asset.notes,
        pub_date: asset.date,
      }),
    );
    return;
  });

  // Get latest release version tag
  router.get("/api/semver", async (req, res, params) => {
    const { latest, platforms, version, date } = await updateCache(res);
    if (!latest) {
      res.statusCode = 500;
      res.end("Failed to fetch latest releases");
      return;
    }

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ version }));
  });

  return async (
    req: http.IncomingMessage,
    res: http.ServerResponse<http.IncomingMessage>,
  ) => {
    router.lookup(req, res);
  };
}

export default carrots;
