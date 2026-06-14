import http from "http";
import semver from "semver";
import Router from "find-my-way";
import { PLATFORMS, PlatformIdentifier } from "./platforms.js";
import {
  renderHomePage,
  renderVersionPage,
  renderVersionsPage,
} from "./page.js";

// Configuration
export interface Configuration {
  account: string;
  repository: string;
  token?: string;
  hideVersions?: boolean;
}

// Types
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
  created_at: string;
  assets: GitHubAsset[];
}

export interface PlatformAssets {
  url: string;
  date: string;
  name: string;
  size: number;
  notes: string;
  version: string;
  api_url: string;
  RELEASES?: string;
  content_type: string;
  isDraft: boolean;
  isPrerelease: boolean;
}

// Cache
const CACHE_DURATION = 1000 * 60 * 5;
let cache: Map<PlatformIdentifier, PlatformAssets[]> | null = null;
let backupCache: Map<PlatformIdentifier, PlatformAssets[]> | null = null;
let cacheTime = 0;

async function getCache(config: Configuration) {
  const now = Date.now();
  if (!cache || now - cacheTime > CACHE_DURATION) {
    const fetched = await fetchAllReleases(config);
    if (fetched) {
      cache = fetched;
      backupCache = fetched;
      cacheTime = now;
    } else if (backupCache) {
      // Failed refresh: serve last-known-good without advancing cacheTime,
      // so a transient GitHub 403/5xx keeps a warm server serving.
      cache = backupCache;
    }
  }
  return cache;
}

// GitHub API
async function fetchGitHubReleases(
  config: Configuration,
): Promise<GitHubRelease[] | null> {
  const url = `https://api.github.com/repos/${encodeURIComponent(config.account)}/${encodeURIComponent(config.repository)}/releases?per_page=100`;
  const headers: HeadersInit = { Accept: "application/vnd.github.preview" };
  if (config.token) headers.Authorization = `token ${config.token}`;

  const res = await fetch(url, { headers });
  if (res.status === 403) {
    console.error("Rate Limited!");
    return null;
  }
  if (res.status >= 400) return null;
  return res.json();
}

async function fetchReleaseContent(
  url: string,
  token?: string,
): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/octet-stream",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return res.text();
  } catch {
    return null;
  }
}

// Platform matching
function matchPlatform(fileName: string): PlatformIdentifier[] {
  const name = fileName.toLowerCase().replace(/_/g, "-");
  const matches: PlatformIdentifier[] = [];

  for (const [platform, info] of Object.entries(PLATFORMS) as [
    PlatformIdentifier,
    (typeof PLATFORMS)[PlatformIdentifier],
  ][]) {
    if (info.filePatterns.some((p) => p.test(name))) matches.push(platform);
  }

  // Fallback: try with x64 suffix
  if (!matches.length) {
    const i = fileName.lastIndexOf(".");
    if (i >= 0) {
      const patched = `${fileName.substring(0, i)}-x64${fileName.substring(i)}`
        .toLowerCase()
        .replace(/_/g, "-");
      for (const [platform, info] of Object.entries(PLATFORMS) as [
        PlatformIdentifier,
        (typeof PLATFORMS)[PlatformIdentifier],
      ][]) {
        if (info.filePatterns.some((p) => p.test(patched)))
          matches.push(platform);
      }
    }
  }

  return matches;
}

async function fetchAllReleases(
  config: Configuration,
): Promise<Map<PlatformIdentifier, PlatformAssets[]> | null> {
  const releases = await fetchGitHubReleases(config);
  if (!releases) return null;

  const all = new Map<PlatformIdentifier, PlatformAssets[]>();
  const releasesContent = new Map<string, string>();

  // Fetch RELEASES files in parallel
  await Promise.all(
    releases.map(async (release) => {
      const releasesAsset = release.assets.find((a) => a.name === "RELEASES");
      if (releasesAsset) {
        const content = await fetchReleaseContent(
          releasesAsset.url,
          config.token,
        );
        if (content) releasesContent.set(release.tag_name, content);
      }
    }),
  );

  // Iterate oldest-first so cache key-insertion order matches the original
  // server, keeping /api/latest + /api/semver's scalar stable for repos that
  // diverge per platform.
  for (let i = releases.length - 1; i >= 0; i--) {
    const release = releases[i];
    if (!semver.valid(release.tag_name)) continue;

    for (const asset of release.assets) {
      if (asset.name === "RELEASES") continue;

      const platforms = matchPlatform(asset.name);
      if (!platforms.length) continue;

      const data: PlatformAssets = {
        name: release.name,
        notes: release.body,
        version: release.tag_name,
        date: release.created_at,
        url: asset.browser_download_url,
        api_url: asset.url,
        content_type: asset.content_type,
        size: Math.round((asset.size / 1000000) * 10) / 10,
        isDraft: release.draft,
        isPrerelease: release.prerelease,
        RELEASES: releasesContent.get(release.tag_name),
      };

      for (const platform of platforms) {
        if (!all.has(platform)) all.set(platform, []);
        all.get(platform)!.push(data);
      }
    }
  }

  return all;
}

// Update channels. "stable" serves only non-prerelease releases (the
// default, what every client gets unless it opts in). "prerelease" serves
// the newest non-draft release of EITHER kind, so the beta channel is a
// superset: a tester still receives a newer stable the moment one ships.
export type Channel = "stable" | "prerelease";

async function getLatest(config: Configuration, channel: Channel = "stable") {
  // A network-level fetch rejection (DNS / ECONNRESET) must degrade to a
  // clean 500 instead of an unhandled rejection that hangs the socket.
  const releases = await getCache(config).catch((e) => {
    console.error(e);
    return null;
  });
  if (!releases) return { latest: null, platforms: [], version: "", date: "" };

  const latest = new Map<PlatformIdentifier, PlatformAssets>();
  const platforms = Array.from(releases.keys());

  for (const platform of platforms) {
    const candidates = releases
      .get(platform)!
      .filter((r) =>
        channel === "prerelease" ? !r.isDraft : !r.isDraft && !r.isPrerelease,
      );
    if (candidates.length) {
      latest.set(
        platform,
        candidates.reduce((a, b) => (semver.gt(a.version, b.version) ? a : b)),
      );
    }
  }

  const first = latest.values().next().value;
  return {
    latest,
    platforms,
    version: first?.version || "",
    date: first?.date || "",
  };
}

function requestToPlatform(request: string): PlatformIdentifier | null {
  const req = request.toLowerCase().replace(/_/g, "-");
  for (const [platform, info] of Object.entries(PLATFORMS) as [
    PlatformIdentifier,
    (typeof PLATFORMS)[PlatformIdentifier],
  ][]) {
    if (platform === req || info.aliases.includes(req)) return platform;
  }
  return null;
}

// Resolve and 302-redirect to the GitHub asset for a platform on a channel.
// Channel-aware so /download (stable) and /download-prerelease point at the
// matching binary: the update JSON below hands the client a download URL
// that re-resolves "latest", so a beta update must download a beta binary.
async function respondDownload(
  config: Configuration,
  channel: Channel,
  res: http.ServerResponse,
  params: { platform?: string },
) {
  const { latest } = await getLatest(config, channel);
  if (!latest) return end(res, 500, "Failed to fetch releases");

  const platform = requestToPlatform(params.platform || "");
  if (!platform || !latest.has(platform))
    return end(res, 400, "Invalid platform");

  const asset = latest.get(platform)!;
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
}

// Squirrel update feed for a channel. downloadPath is the route the response
// points the client at for the actual binary (and for the rewritten Windows
// nupkg URLs), so it must match the channel: "download" for stable,
// "download-prerelease" for beta.
async function respondUpdate(
  config: Configuration,
  channel: Channel,
  downloadPath: string,
  req: http.IncomingMessage,
  res: http.ServerResponse,
  params: { platform?: string; version?: string; file?: string },
) {
  const { latest } = await getLatest(config, channel);
  if (!latest) return end(res, 500, "Failed to fetch releases");

  const platform = requestToPlatform(params.platform || "");
  if (!platform || !latest.has(platform))
    return end(res, 400, "Invalid platform");
  if (!params.version || !semver.valid(params.version))
    return end(res, 400, "Invalid version");

  const asset = latest.get(platform)!;
  if (semver.eq(params.version, asset.version)) {
    res.statusCode = 204;
    res.end();
    return;
  }

  const proto =
    req.headers.host?.includes("localhost") ||
    req.headers.host?.includes("[::]")
      ? "http"
      : "https";
  const address = `${proto}://${req.headers.host}/`;

  // Windows RELEASES file
  if (params.file?.toUpperCase() === "RELEASES") {
    if (!asset.RELEASES) {
      res.statusCode = 204;
      res.end();
      return;
    }
    const patched = asset.RELEASES.replace(
      /([A-Fa-f0-9]+)\s([^\s]+\.nupkg)\s(\d+)/g,
      `$1 ${address}${downloadPath}/nupkg/$2 $3`,
    );
    res.statusCode = 200;
    res.setHeader("content-length", Buffer.byteLength(patched, "utf8"));
    res.setHeader("content-type", "application/octet-stream");
    res.end(patched);
    return;
  }

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(
    JSON.stringify({
      url: `${address}${downloadPath}/${params.platform}`,
      name: asset.version,
      notes: asset.notes,
      pub_date: asset.date,
    }),
  );
}

// Main server
export async function carrots(config: Configuration) {
  const router = Router();

  router.get("/", async (req, res) => {
    const releases = await getCache(config);
    if (!releases) return end(res, 500, "Failed to fetch releases");
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html");
    res.end(renderHomePage(config, releases));
  });

  if (!config.hideVersions) {
    router.get("/versions", async (req, res) => {
      const releases = await getCache(config);
      if (!releases) return end(res, 500, "Failed to fetch releases");
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html");
      res.end(renderVersionsPage(config, releases));
    });

    router.get("/versions/:version", async (req, res, params) => {
      const releases = await getCache(config);
      if (!releases || !params.version)
        return end(res, 500, "Failed to fetch releases");

      const assets = new Map<PlatformIdentifier, PlatformAssets>();
      for (const [platform, list] of releases) {
        const asset = list.find((a) => a.version === params.version);
        if (asset) assets.set(platform, asset);
      }
      if (!assets.size) return end(res, 404, "Version not found");

      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html");
      res.end(renderVersionPage(config, params.version, assets));
    });
  } else {
    router.get("/versions", (req, res) => end(res, 404, "Not Found"));
    router.get("/versions/:version", (req, res) => end(res, 404, "Not Found"));
  }

  router.get("/robots.txt", (req, res) => {
    res.statusCode = 200;
    res.setHeader("Content-Type", "text/plain");
    res.end("User-agent: *\nDisallow: /");
  });

  // Stable channel (default) and prerelease/beta channel. The channel lives
  // in the path prefix, not a query string: Squirrel.Windows appends
  // "/RELEASES" to the feed URL and would mangle a query string, but a path
  // prefix survives. Clients opt in by hitting the "-prerelease" routes.
  router.get("/download/:platform/:file?", (req, res, params) =>
    respondDownload(config, "stable", res, params),
  );
  router.get("/download-prerelease/:platform/:file?", (req, res, params) =>
    respondDownload(config, "prerelease", res, params),
  );

  router.get("/update/:platform/:version/:file?", (req, res, params) =>
    respondUpdate(config, "stable", "download", req, res, params),
  );
  router.get(
    "/update-prerelease/:platform/:version/:file?",
    (req, res, params) =>
      respondUpdate(
        config,
        "prerelease",
        "download-prerelease",
        req,
        res,
        params,
      ),
  );

  router.get("/api/semver", async (req, res) => {
    const { latest, version } = await getLatest(config);
    if (!latest) return end(res, 500, "Failed to fetch latest releases");
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ version }));
  });

  router.get("/api/latest", async (req, res) => {
    const { latest, platforms } = await getLatest(config);
    if (!latest) return end(res, 500, "Failed to fetch releases");

    const data = platforms
      .map((p) => {
        const asset = latest.get(p);
        if (!asset) return null;
        return {
          id: p,
          platform: PLATFORMS[p].os,
          arch: PLATFORMS[p].arch,
          version: asset.version,
          date: asset.date,
        };
      })
      .filter(Boolean);

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(data));
  });

  return (req: http.IncomingMessage, res: http.ServerResponse) =>
    router.lookup(req, res);
}

function end(res: http.ServerResponse, code: number, message: string) {
  res.statusCode = code;
  res.statusMessage = message;
  res.end();
}
