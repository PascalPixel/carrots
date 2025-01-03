import http from "http";
import semver from "semver";
import Router from "find-my-way";

import { PLATFORMS, PlatformIdentifier } from "./platforms.js";
import { makeVersionListPage, makeVersionPage } from "./page.js";
import { getLatest, releaseCache, PlatformAssets } from "./cache.js";

// Main function to handle routing and responses
export async function carrots(config: Configuration) {
  const router = Router();

  // Overview of all versions
  router.get("/", async (req, res, params) => {
    const { latest, platforms, version, date } = await getLatest(config);
    if (!latest) {
      res.statusCode = 500;
      res.statusMessage = "Failed to fetch latest releases";
      res.end();
      return;
    }

    const releases = await releaseCache.get(config);
    if (!releases) {
      res.statusCode = 500;
      res.statusMessage = "Failed to fetch releases";
      res.end();
      return;
    }

    const html = makeVersionListPage(config, releases);

    // Send response
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html");
    res.end(html);
    return;
  });

  // Version-specific page
  router.get("/versions/:version", async (req, res, params) => {
    const {
      latest,
      platforms,
      version: latestVersion,
      date,
    } = await getLatest(config);
    if (!latest || !params.version) {
      res.statusCode = 500;
      res.statusMessage = "Failed to fetch latest releases";
      res.end();
      return;
    }

    const releases = await releaseCache.get(config);
    if (!releases) {
      res.statusCode = 500;
      res.statusMessage = "Failed to fetch releases";
      res.end();
      return;
    }

    // Create a map of assets for this version
    const versionAssets = new Map<PlatformIdentifier, PlatformAssets>();
    for (const [platform, assets] of releases.entries()) {
      const asset = assets.find(
        (a: PlatformAssets) => a.version === params.version,
      );
      if (asset) {
        versionAssets.set(platform, asset);
      }
    }

    if (versionAssets.size === 0) {
      res.statusCode = 404;
      res.statusMessage = "Version not found";
      res.end();
      return;
    }

    const html = makeVersionPage(config, params.version, versionAssets);

    // Send response
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html");
    res.end(html);
    return;
  });

  // Disallow Crawlers
  router.get("/robots.txt", (req, res) => {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain");
    res.end("User-agent: *\nDisallow: /");
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

  // Get latest release as json
  router.get("/api/latest", async (req, res, params) => {
    const { latest, platforms, version, date } = await getLatest(config);
    if (!latest) {
      res.statusCode = 500;
      res.statusMessage = "Failed to fetch latest releases";
      res.end();
      return;
    }

    const data = platforms
      .map((platform) => {
        const asset = latest.get(platform);
        if (!asset) return null;
        return {
          id: platform,
          platform: PLATFORMS[platform].os,
          arch: PLATFORMS[platform].arch,
          version: asset.version,
          date: asset.date,
        };
      })
      .filter((asset) => asset);

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
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
