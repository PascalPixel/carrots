import { PlatformAssets } from "./cache.js";
import { PLATFORMS, PlatformIdentifier } from "./platforms.js";
import semver from "semver";

// Common styles for both pages
const commonStyles = `
  body {
    font-family: 'Inter', sans-serif;
    margin: 0;
    background: #000;
    color: #fff;
  }
  h1 {
    font-size: 2rem;
    font-weight: 800;
    margin-bottom: 1rem;
  }
  h2 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1rem;
    color: #888;
  }
  a {
    color: #0070f3;
    text-decoration: none;
    transition: color 0.2s ease;
  }
  a:hover {
    color: #0070f3;
    text-decoration: underline;
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
    font-weight: 600;
    background: #111;
  }
  th, td {
    border: 1px solid #333;
    padding: 1rem;
    text-align: left;
    vertical-align: top;
    position: relative;
    word-break: break-word;
  }
  .version-list {
    display: grid;
    gap: 1rem;
  }
  .version-card {
    background: #111;
    border: 1px solid #333;
    border-radius: 0.5rem;
    padding: 1.5rem;
    transition: all 0.2s ease;
  }
  .version-card:hover {
    border-color: #0070f3;
  }
  .version-title {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .version-date {
    color: #888;
    font-size: 0.875rem;
  }
  .download-icon {
    display: inline-block;
    margin-right: 0.5rem;
    vertical-align: middle;
  }
  .platform-count {
    display: inline-block;
    background: #222;
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.875rem;
    color: #888;
  }
  .badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }
  .badge-draft {
    background: #2d2d2d;
    color: #888;
  }
  .badge-prerelease {
    background: #0d2231;
    color: #0070f3;
  }
  .version-card.is-draft {
    opacity: 0.7;
  }
  .version-card.is-prerelease {
    background: #0d2231;
    border-color: #0d2231;
  }
  .version-card.is-prerelease:hover {
    border-color: #0070f3;
  }
`;

// Common HTML wrapper
function wrapHtml(content: string) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Inter:400,500,600,700,800&display=swap">
        <style>${commonStyles}</style>
    </head>
    <body>
        <main>${content}</main>
    </body>
    </html>
  `;
}

// Create version list page
export function makeVersionListPage(
  releases: Map<PlatformIdentifier, PlatformAssets[]>,
) {
  // Get unique versions and their details
  const versions = new Map<
    string,
    {
      date: string;
      platforms: Set<PlatformIdentifier>;
      isDraft: boolean;
      isPrerelease: boolean;
    }
  >();

  // Get latest version assets
  const latestAssets = new Map<PlatformIdentifier, PlatformAssets>();
  for (const [platform, assets] of releases.entries()) {
    if (assets.length > 0) {
      const stableAssets = assets.filter(
        (asset) => !asset.isDraft && !asset.isPrerelease,
      );
      if (stableAssets.length > 0) {
        const latestAsset = stableAssets.reduce((latest, current) =>
          semver.gt(current.version, latest.version) ? current : latest,
        );
        latestAssets.set(platform, latestAsset);
      }
    }

    for (const asset of assets) {
      if (!versions.has(asset.version)) {
        versions.set(asset.version, {
          date: asset.date,
          platforms: new Set([platform]),
          isDraft: asset.isDraft,
          isPrerelease: asset.isPrerelease,
        });
      } else {
        versions.get(asset.version)?.platforms.add(platform);
      }
    }
  }

  // Sort versions by semver
  const sortedVersions = Array.from(versions.entries()).sort(
    (a, b) => -a[0].localeCompare(b[0], undefined, { numeric: true }),
  );

  // Get the latest version number (excluding drafts and prereleases)
  const latestVersion =
    sortedVersions.find(
      ([_, details]) => !details.isDraft && !details.isPrerelease,
    )?.[0] || "";

  // Create latest version table
  const latestTable = makeVersionPage(latestVersion, latestAssets, false);

  // Create version cards
  const versionCards = sortedVersions
    .map(
      ([version, details]) => `
    <a href="/versions/${version}" class="version-card${details.isDraft ? " is-draft" : ""}${details.isPrerelease ? " is-prerelease" : ""}">
      <div class="version-title">
        Version ${version}
        ${details.isDraft ? '<span class="badge badge-draft">Draft</span>' : ""}
        ${details.isPrerelease ? '<span class="badge badge-prerelease">Pre-release</span>' : ""}
        <span class="platform-count">${details.platforms.size} platforms</span>
      </div>
      <div class="version-date">Released ${new Date(details.date).toLocaleDateString()}</div>
    </a>
  `,
    )
    .join("");

  const content = `
    <h1>Latest Version (${latestVersion})</h1>
    ${latestTable}
    <h2>All Versions</h2>
    <div class="version-list">
      ${versionCards}
    </div>
  `;

  return wrapHtml(content);
}

// Create version details page
export function makeVersionPage(
  version: string,
  assets: Map<PlatformIdentifier, PlatformAssets>,
  showHeader = true,
) {
  // Step 1: Group data by filetype+OS
  const groupedData: Map<
    `${NodeJS.Platform}-${string}`,
    {
      id: PlatformIdentifier;
      arch: NodeJS.Architecture;
      asset: PlatformAssets;
    }[]
  > = new Map();

  [...assets.entries()].forEach(([id, asset]) => {
    const key: `${NodeJS.Platform}-${string}` = `${PLATFORMS[id].os}-${PLATFORMS[id].ext}`;
    if (!groupedData.has(key)) groupedData.set(key, []);
    groupedData.get(key)?.push({ id, arch: PLATFORMS[id].arch, asset });
  });

  // Step 2: Determine available architectures
  const architectures: Set<NodeJS.Architecture> = new Set();
  groupedData.forEach((assets) => {
    assets.forEach((asset) => {
      if (asset.arch) architectures.add(asset.arch);
    });
  });

  // Step 3: Create table rows and columns dynamically
  const rows = Array.from(groupedData)
    .map(([filetypeOs, assets]) => {
      const cells = Array.from(architectures).map((arch) => {
        const asset = assets.find((a) => a.arch === arch);
        return asset
          ? `
              <a href="/download/${asset.id}">
                <svg class="download-icon" width="16" height="12" fill="currentColor">
                  <path d="M0 5h1v7H0V5zm15 0h1v7h-1V5zM7.52941176 0h1v7h-1V0zM4.66999817 4.66673379L5.33673196 4l3.33326621 3.33326621L8.00326438 8 4.66999817 4.66673379zM10.6732625 4l.6667338.66673379L8.00673013 8l-.66673379-.66673379L10.6732625 4zM0 12v-1h16v1H0z"></path>
                </svg>
                ${asset.asset.version}
              </a>
            `
          : `<span style="opacity: 50%">N/A</span>`;
      });

      return `
        <tr>
          <td>
            ${
              filetypeOs === "linux-deb"
                ? 'Debian <span style="opacity: 50%;">(.deb)</span>'
                : filetypeOs === "linux-rpm"
                  ? 'Fedora <span style="opacity: 50%;">(.rpm)</span>'
                  : filetypeOs === "linux-appimage"
                    ? 'Linux <span style="opacity: 50%;">(.AppImage)</span>'
                    : filetypeOs === "linux-AppImage"
                      ? 'Linux <span style="opacity: 50%;">(.AppImage)</span>'
                      : filetypeOs === "linux-snap"
                        ? 'Linux <span style="opacity: 50%;">(.snap)</span>'
                        : filetypeOs === "darwin-dmg"
                          ? 'macOS <span style="opacity: 50%;">(.dmg)</span>'
                          : filetypeOs === "darwin-zip"
                            ? 'macOS <span style="opacity: 50%;">(.zip)</span>'
                            : filetypeOs === "win32-exe"
                              ? 'Windows <span style="opacity: 50%;">(.exe)</span>'
                              : filetypeOs === "win32-nupkg"
                                ? 'Squirrel <span style="opacity: 50%;">(.nupkg)</span>'
                                : filetypeOs
            }
           </td>
         <td>${cells.join("</td><td>")}</td>
       </tr>
    `;
    })
    .join("\n");

  const table = `
    <table>
      <tr>
        <th style="border-top-color: transparent; border-left-color: transparent; background: transparent;"></th>
        ${Array.from(architectures)
          .map((arch) => `<th>${arch}</th>`)
          .join("")}
      </tr>
      ${rows}
    </table>
  `;

  if (!showHeader) {
    return table;
  }

  const content = `
    <h1>Version ${version}</h1>
    <h2>Downloads</h2>
    ${table}
    <p><a href="/">← Back to all versions</a></p>
  `;

  return wrapHtml(content);
}
