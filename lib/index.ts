import http from "http";
import semver from "semver";
import Router from "find-my-way";
import { formatDistanceToNow } from "date-fns";

import { getLatest } from "./cache.js";
import { PLATFORMS, PlatformIdentifier } from "./platforms.js";

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

    const data = platforms.map((platform) => {
      const asset = latest.get(platform);
      if (!asset) return null;
      return {
        id: platform,
        platform: PLATFORMS[platform].platform,
        arch: PLATFORMS[platform].arch,
        version: asset.version,
        date: asset.date,
        fileName: asset.name,
      };
    });

    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>${config.account}/${config.repository}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Inter">
          <style>
            body {
              font-family: 'Inter', sans-serif;
              margin: 0;
              background: #000;
              color: #fff;
            }
            h1 {
              font-size: 2rem;
            }
            a {
              color: #fa0;
            }
            main {
              padding: 2rem;
              margin: 0 auto;
              max-width: 768px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 2rem;
              table-layout: fixed;
            }
            th {
              font-weight: bold;
              background: #111;
            }
            th, td {
              border: 1px solid #444;
              padding: 0.5rem;
              text-align: left;
              vertical-align: top;
              position: relative;
              word-break: break-word;
            }
          </style>
        </head>
        <body>
          <main>
            <h1>${config.account}/${config.repository}</h1>
            <table>
              <tr>
                <th>OS</th>
                <th>Chip</th>
                <th>Version</th>
                <th colspan="2">Date</th>
                <th>Download</th>
              </tr>
              ${data
                .map((asset) =>
                  asset
                    ? `
                        <tr id="${asset.id}">
                          <td>${asset.platform}</td> 
                          <td>${asset.arch}</td>
                          <td>${asset.version}</td>
                          <td colspan="2">${formatDistanceToNow(
                            new Date(asset.date),
                            {
                              addSuffix: true,
                            },
                          )}</td>
                          <td><a href="/download/${asset.id}">${
                            asset.fileName
                          }</a></td>
                        </tr>
                      `
                    : ``,
                )
                .join("")}
            </table>
          </main>
        </body>
      </html>
    `;

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
          platform: PLATFORMS[platform].platform,
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
