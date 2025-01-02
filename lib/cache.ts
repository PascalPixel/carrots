import semver from "semver";
import { PLATFORMS, PlatformIdentifier } from "./platforms.js";
import { Configuration } from "./index.js";

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
  published_at: string;
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
}

// Cache management
const CACHE_DURATION = 1000 * 60 * 5; /* 5 minutes */

class ReleaseCache {
  private cache: Map<PlatformIdentifier, PlatformAssets[]> | null = null;
  private backupCache: Map<PlatformIdentifier, PlatformAssets[]> | null = null;
  private lastUpdated: number = 0;

  async get(
    config: Configuration,
  ): Promise<Map<PlatformIdentifier, PlatformAssets[]> | null> {
    const now = Date.now();
    if (!this.cache || now - this.lastUpdated > CACHE_DURATION) {
      const fetchedReleases = await fetchAllReleases(config);
      if (fetchedReleases) {
        this.cache = fetchedReleases;
        this.backupCache = fetchedReleases;
        this.lastUpdated = now;
      } else if (this.backupCache) {
        this.cache = this.backupCache;
      }
    }
    return this.cache;
  }
}

const releaseCache = new ReleaseCache();

// GitHub API helpers
async function fetchGitHubReleases(
  config: Configuration,
): Promise<GitHubRelease[] | null> {
  const account = encodeURIComponent(config.account || "");
  const repository = encodeURIComponent(config.repository || "");
  const url = `https://api.github.com/repos/${account}/${repository}/releases?per_page=100`;
  const headers: HeadersInit = { Accept: "application/vnd.github.preview" };
  if (config.token) headers.Authorization = `token ${config.token}`;

  const response = await fetch(url, { headers });
  if (response.status === 403) {
    console.error("Rate Limited!");
    return null;
  }
  if (response.status >= 400) return null;

  return response.json();
}

async function fetchReleaseContent(
  url: string,
  token: string | undefined,
): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/octet-stream",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return await response.text();
  } catch (e) {
    console.error(`Failed to fetch RELEASES content:`, e);
    return null;
  }
}

// Platform matching
function fileNameToPlatforms(fileName: string): PlatformIdentifier[] {
  const sanitizedFileName = fileName.toLowerCase().replace(/_/g, "-");
  const matchedPlatforms: PlatformIdentifier[] = [];

  for (const platform of Object.keys(PLATFORMS) as PlatformIdentifier[]) {
    const platformInfo = PLATFORMS[platform];
    for (const filePattern of platformInfo.filePatterns) {
      if (filePattern.test(sanitizedFileName)) {
        matchedPlatforms.push(platform);
      }
    }
  }
  return matchedPlatforms;
}

function tryMatchPlatform(assetName: string): PlatformIdentifier[] {
  // Try direct match first
  let platforms = fileNameToPlatforms(assetName);

  // If no match, try with x64 suffix
  if (!platforms.length) {
    const insertIndex = assetName.lastIndexOf(".");
    if (insertIndex >= 0) {
      const patchedName = `${assetName.substring(0, insertIndex)}-x64${assetName.substring(insertIndex)}`;
      platforms = fileNameToPlatforms(patchedName);
    }
  }

  return platforms;
}

// Asset processing
function createAssetData(
  release: GitHubRelease,
  asset: GitHubAsset,
): Omit<PlatformAssets, "RELEASES"> {
  return {
    name: release.name,
    notes: release.body,
    version: release.tag_name,
    date: release.published_at,
    url: asset.browser_download_url,
    api_url: asset.url,
    content_type: asset.content_type,
    size: Math.round((asset.size / 1000000) * 10) / 10,
  };
}

// Main functions
async function fetchAllReleases(
  config: Configuration,
): Promise<Map<PlatformIdentifier, PlatformAssets[]> | null> {
  const releases = await fetchGitHubReleases(config);
  if (!releases) return null;

  const allReleases = new Map<PlatformIdentifier, PlatformAssets[]>();
  const releasesContent = new Map<string, string>();
  const releasesPromises: Promise<void>[] = [];

  // Process releases in reverse chronological order
  for (let i = releases.length - 1; i >= 0; i--) {
    const release = releases[i];
    if (!semver.valid(release.tag_name) || release.draft || release.prerelease)
      continue;

    // Fetch RELEASES content in parallel
    const releasesAsset = release.assets.find(
      (asset) => asset.name === "RELEASES",
    );
    if (releasesAsset) {
      releasesPromises.push(
        (async () => {
          const content = await fetchReleaseContent(
            releasesAsset.url,
            config.token,
          );
          if (content) releasesContent.set(release.tag_name, content);
        })(),
      );
    }

    // Process other assets
    for (const asset of release.assets) {
      if (asset.name === "RELEASES") continue;

      const platforms = tryMatchPlatform(asset.name);
      if (!platforms.length) {
        console.warn(`Unknown platform for ${asset.name}`);
        continue;
      }

      const assetData = createAssetData(release, asset);
      for (const platform of platforms) {
        if (!allReleases.has(platform)) {
          allReleases.set(platform, []);
        }
        allReleases.get(platform)?.push({
          ...assetData,
          RELEASES: platform.startsWith("win32")
            ? releasesContent.get(release.tag_name)
            : undefined,
        });
      }
    }
  }

  await Promise.all(releasesPromises);

  // Update Windows assets with RELEASES content
  for (const [platform, assets] of allReleases.entries()) {
    if (platform.startsWith("win32")) {
      for (const asset of assets) {
        asset.RELEASES = releasesContent.get(asset.version);
      }
    }
  }

  return allReleases;
}

export async function getLatest(config: Configuration) {
  let latest: Map<PlatformIdentifier, PlatformAssets> | null = null;
  let platforms: PlatformIdentifier[] = [];
  let version: string | undefined = "";
  let date: string | undefined = "";

  try {
    const releases = await releaseCache.get(config);
    if (releases) {
      latest = new Map();
      platforms = Array.from(releases.keys());

      // Get latest version for each platform
      for (const platform of platforms) {
        const platformReleases = releases.get(platform);
        if (platformReleases?.length) {
          const latestRelease = platformReleases.reduce((latest, current) =>
            semver.gt(current.version, latest.version) ? current : latest,
          );
          latest.set(platform, latestRelease);
        }
      }

      if (platforms.length && latest.has(platforms[0])) {
        const firstPlatform = latest.get(platforms[0]);
        version = firstPlatform?.version;
        date = firstPlatform?.date;
      }
    }
  } catch (e) {
    console.error(e);
  }

  return { latest, platforms, version, date };
}

export async function getVersion(
  config: Configuration,
  platform: PlatformIdentifier,
  version: string,
) {
  const releases = await releaseCache.get(config);
  if (!releases) return null;

  const platformReleases = releases.get(platform);
  if (!platformReleases) return null;

  return (
    platformReleases.find((release) => release.version === version) || null
  );
}
