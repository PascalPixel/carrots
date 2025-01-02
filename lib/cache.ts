import semver from "semver";

import { PLATFORMS, PlatformIdentifier } from "./platforms.js";
import { Configuration } from "./index.js";

let cachedReleases: Map<PlatformIdentifier, PlatformAssets[]> | null = null;
let backupCachedReleases: Map<PlatformIdentifier, PlatformAssets[]> | null =
  null;
let lastUpdated: number = 0;
const cacheDuration = 1000 * 60 * 5; /* 5 minutes */

// Function to update the cache and prepare common response data
export async function getLatest(config: Configuration) {
  let latest: Map<PlatformIdentifier, PlatformAssets> | null = null;
  let platforms: PlatformIdentifier[] = [];
  let version: string | undefined = "";
  let date: string | undefined = "";

  try {
    const releases = await getAllReleases(config);
    if (releases) {
      latest = new Map();
      platforms = Array.from(releases.keys());

      // Get latest version for each platform
      for (const platform of platforms) {
        const platformReleases = releases.get(platform);
        if (platformReleases && platformReleases.length > 0) {
          // Sort by version and get the latest
          const latestRelease = platformReleases.reduce((latest, current) => {
            return semver.gt(current.version, latest.version)
              ? current
              : latest;
          }, platformReleases[0]);
          latest.set(platform, latestRelease);
        }
      }

      if (platforms.length > 0 && latest.has(platforms[0])) {
        version = latest.get(platforms[0])?.version;
        date = latest.get(platforms[0])?.date;
      }
    }
  } catch (e) {
    console.error(e);
    return { latest, platforms, version, date };
  }

  return { latest, platforms, version, date };
}

const getAllReleases = async (config: Configuration) => {
  const now = Date.now();

  if (!cachedReleases || now - lastUpdated > cacheDuration) {
    const fetchedReleases = await fetchAllReleases(config);
    if (fetchedReleases) {
      cachedReleases = fetchedReleases;
      backupCachedReleases = fetchedReleases;
      lastUpdated = now;
    } else if (backupCachedReleases) {
      cachedReleases = backupCachedReleases;
    }
  }

  return cachedReleases;
};

async function fetchReleaseContent(
  url: string,
  token: string | undefined,
  version: string,
  contentMap: Map<string, string>,
): Promise<void> {
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/octet-stream",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    const content = await response.text();
    contentMap.set(version, content);
  } catch (e) {
    console.error(`Failed to fetch RELEASES for ${version}:`, e);
  }
}

// Fetches all release information from GitHub
async function fetchAllReleases(
  config: Configuration,
): Promise<Map<PlatformIdentifier, PlatformAssets[]> | null> {
  const allReleases = new Map<PlatformIdentifier, PlatformAssets[]>();

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

  // Fetch all RELEASES content in parallel
  const releasesContent = new Map<string, string>();
  const releasesPromises: Promise<void>[] = [];

  for (let i = releases.length - 1; i >= 0; i--) {
    const release = releases[i];
    if (
      !semver.valid(release.tag_name) ||
      release.draft ||
      release.prerelease
    ) {
      continue;
    }

    // Process all assets in one pass
    const releasesAsset = release.assets.find(
      (asset) => asset.name === "RELEASES",
    );
    if (releasesAsset) {
      releasesPromises.push(
        fetchReleaseContent(
          releasesAsset.url,
          config.token,
          release.tag_name,
          releasesContent,
        ),
      );
    }

    // Process other assets
    for (const asset of release.assets) {
      if (asset.name === "RELEASES") continue;

      // Try direct platform match first
      let platforms = fileNameToPlatforms(asset.name);

      // If no match, try with x64 suffix
      if (!platforms.length) {
        const insertIndex = asset.name.lastIndexOf(".");
        if (insertIndex >= 0) {
          const patchedName = `${asset.name.substring(0, insertIndex)}-x64${asset.name.substring(insertIndex)}`;
          platforms = fileNameToPlatforms(patchedName);
        }
      }

      // Add asset to each matching platform
      if (platforms.length) {
        const assetData = {
          name: release.name,
          notes: release.body,
          version: release.tag_name,
          date: release.published_at,
          url: asset.browser_download_url,
          api_url: asset.url,
          content_type: asset.content_type,
          size: Math.round((asset.size / 1000000) * 10) / 10,
        };

        for (const platform of platforms) {
          if (!allReleases.has(platform)) {
            allReleases.set(platform, []);
          }
          // Add RELEASES content only for Windows platforms
          allReleases.get(platform)?.push({
            ...assetData,
            RELEASES: platform.startsWith("win32")
              ? releasesContent.get(release.tag_name)
              : undefined,
          });
        }
      } else {
        console.debug(`Unknown platform for ${asset.name}`);
      }
    }
  }

  // Wait for all RELEASES content to be fetched
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

// Get a specific version for a platform
export async function getVersion(
  config: Configuration,
  platform: PlatformIdentifier,
  version: string,
) {
  const releases = await getAllReleases(config);
  if (!releases) return null;

  const platformReleases = releases.get(platform);
  if (!platformReleases) return null;

  return (
    platformReleases.find((release) => release.version === version) || null
  );
}
