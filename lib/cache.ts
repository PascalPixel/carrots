import semver from "semver";

import { PLATFORMS, PlatformIdentifier } from "./platforms.js";
import { Configuration } from "./index.js";

let cachedLatest: Map<PlatformIdentifier, PlatformAssets> | null = null;
let backupCachedLatest: Map<PlatformIdentifier, PlatformAssets> | null = null;
let lastUpdated: number = 0;

// Function to update the cache and prepare common response data
export async function getLatest(config: Configuration) {
  let latest: Map<PlatformIdentifier, PlatformAssets> | null = null;
  let platforms: PlatformIdentifier[] = [];
  let version: string | undefined = "";
  let date: string | undefined = "";

  try {
    latest = await getLatestRelease(config);
    if (latest) {
      platforms = Array.from(latest.keys());
      version = latest.get(platforms[0])?.version;
      date = latest.get(platforms[0])?.date;
    }
  } catch (e) {
    console.error(e);
    return { latest, platforms, version, date };
  }

  return { latest, platforms, version, date };
}

const getLatestRelease = async (config: Configuration) => {
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

// Fetches the latest release information from GitHub
async function fetchLatestRelease(
  config: Configuration,
): Promise<Map<PlatformIdentifier, PlatformAssets> | null> {
  const latest = new Map<PlatformIdentifier, PlatformAssets>();
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
    PlatformIdentifier.WIN32_X64,
    PlatformIdentifier.WIN32_IA32,
    PlatformIdentifier.WIN32_ARM64,
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

// Converts a file name to a platform enum
function fileNameToPlatform(fileName: string): PlatformIdentifier | null {
  const sanitizedFileName = fileName.toLowerCase().replace(/_/g, "-");
  for (const platform of Object.keys(PLATFORMS) as PlatformIdentifier[]) {
    const platformInfo = PLATFORMS[platform];
    for (const filePattern of platformInfo.filePatterns) {
      if (filePattern.test(sanitizedFileName)) return platform;
    }
  }
  return null;
}

// Structure for GitHub assets in a release
interface GitHubAsset {
  url: string;
  name: string;
  size: number;
  content_type: string;
  browser_download_url: string;
}

// Structure for GitHub release information
interface GitHubRelease {
  name: string;
  body: string;
  draft: boolean;
  tag_name: string;
  prerelease: boolean;
  published_at: string;
  assets: GitHubAsset[];
}

// Structure for platform-specific release assets
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
}
