import http from "http";
import path from "path";
import semver from "semver";
import fs from "fs/promises";
import Router from "find-my-way";
import Handlebars from "handlebars";
import { formatDistanceToNow } from "date-fns";

import { getLatest } from "./cache.js";
import { PLATFORMS } from "./platforms.js";

// Main function to handle routing and responses
export async function carrots(config: Configuration) {
  const router = Router();

  // Overview of all downloads
  router.get("/", async (req, res, params) => {
    const { latest, platforms, version, date } = await getLatest(config);
    if (!latest) {
      res.statusCode = 500;
      res.statusMessage = "Failed to fetch latest releases";
      res.end();
      return;
    }

    // Render html from handlebars template
    const filepath = path.join(process.cwd(), "lib", "index.hbs");
    const filecontent = await fs.readFile(filepath, "utf8");
    const template = Handlebars.compile(filecontent);
    const files: Record<string, TemplateFile> = {};
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
    const sortedFiles: Record<string, TemplateFile> = {};
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
    const { latest, platforms, version, date } = await getLatest(config);
    if (!latest) {
      res.statusCode = 500;
      res.statusMessage = "Failed to fetch latest releases";
      res.end();
      return;
    }

    // Parse platform
    if (!params.platform) {
      res.statusCode = 400;
      res.statusMessage = "Missing platform";
      res.end();
      return;
    }
    const resolvedPlatform = requestToPlatform(params.platform);
    const isPlatform = latest.has(resolvedPlatform as PlatformIdentifier);
    if (!isPlatform) {
      res.statusCode = 400;
      res.statusMessage = "Invalid platform";
      res.end();
      return;
    }

    // Get latest version
    const asset = latest.get(resolvedPlatform as PlatformIdentifier);
    if (!asset) {
      res.statusCode = 400;
      res.statusMessage = "Invalid platform";
      res.end();
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
    const { latest, platforms, version, date } = await getLatest(config);
    if (!latest) {
      res.statusCode = 500;
      res.statusMessage = "Failed to fetch latest releases";
      res.end();
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
      res.statusMessage = "Missing platform";
      res.end();
      return;
    }
    const resolvedPlatform = requestToPlatform(params.platform);
    const isPlatform = latest.has(resolvedPlatform as PlatformIdentifier);
    if (!isPlatform) {
      res.statusCode = 400;
      res.statusMessage = "Invalid platform";
      res.end();
      return;
    }
    const validPlatform = resolvedPlatform as PlatformIdentifier;

    // Parse version
    if (!params.version) {
      res.statusCode = 400;
      res.statusMessage = "Missing version";
      res.end();
      return;
    }
    const isVersion = semver.valid(params.version);
    if (!isVersion) {
      res.statusCode = 400;
      res.statusMessage = "Invalid version";
      res.end();
      return;
    }

    // Get latest version
    const asset = latest.get(validPlatform);
    if (!asset) {
      res.statusCode = 400;
      res.statusMessage = "Invalid platform";
      res.end();
      return;
    }

    // Upgrade or Downgrade the client version to match the latest release on the server
    // Downgrade allows updates to be pulled from the server
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
    const { latest, platforms, version, date } = await getLatest(config);
    if (!latest) {
      res.statusCode = 500;
      res.statusMessage = "Failed to fetch latest releases";
      res.end();
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

// Converts a request string to a platform enum
function requestToPlatform(request: string): PlatformIdentifier | null {
  const sanitizedRequest = request.toLowerCase().replace(/_/g, "-");
  for (const platform of Object.keys(PLATFORMS) as PlatformIdentifier[]) {
    if (platform === sanitizedRequest) return platform;
    const platformInfo = PLATFORMS[platform];
    if (platformInfo.aliases.includes(sanitizedRequest)) return platform;
  }
  return null;
}

// Configuration interface for GitHub repository details
export interface Configuration {
  account: string;
  repository: string;
  token?: string;
}

// Enum for supported platforms
export enum PlatformIdentifier {
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

// Details of a file for download
interface TemplateFile {
  key: string;
  url: string;
  size: number;
  filename: string;
  platform: string;
}

// Variables for handlebars template
interface TemplateVariables {
  date: string;
  github: string;
  account: string;
  version: string;
  repository: string;
  allReleases: string;
  files: Record<string, TemplateFile>;
  releaseNotes: string;
}
