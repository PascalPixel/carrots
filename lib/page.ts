import { Configuration, PlatformAssets } from "./index.js";
import { PLATFORMS, PlatformIdentifier } from "./platforms.js";

// Simple HTML escaping
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ] || c,
  );

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(dateString));
}

const PLATFORM_NAMES: Record<string, [string, string]> = {
  "linux-deb": ["Debian", ".deb"],
  "linux-rpm": ["Fedora", ".rpm"],
  "linux-AppImage": ["Linux", ".AppImage"],
  "linux-snap": ["Linux", ".snap"],
  "darwin-dmg": ["macOS", ".dmg"],
  "darwin-zip": ["macOS", ".zip"],
  "win32-exe": ["Windows", ".exe"],
  "win32-nupkg": ["Squirrel", ".nupkg"],
};

function layout(content: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap">
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, sans-serif; margin: 0; background: #0d0d0d; color: #fff; font-size: 14px; line-height: 1.5; -webkit-font-smoothing: antialiased; }
    main { padding: 2rem 1.5rem; margin: 0 auto; max-width: 768px; }
    h1 { font-size: 1.25rem; font-weight: 700; letter-spacing: -0.025em; margin: 0 0 0.25rem; }
    h2 { font-size: 1rem; font-weight: 500; color: rgba(255,255,255,0.85); margin: 0 0 1rem; }
    a { color: #4ade80; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .card { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); border-radius: 0.5rem; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.1); }
    th { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 500; color: rgba(255,255,255,0.7); }
    td { color: rgba(255,255,255,0.65); }
    tr:last-child td { border-bottom: none; }
    .primary { color: #fff; }
    .badge { display: inline-block; padding: 0.1rem 0.625rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; }
    .badge-latest { background: rgba(74,222,128,0.2); color: #4ade80; }
    .badge-draft { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.7); }
    .badge-prerelease { background: rgba(255,255,255,0.15); color: rgba(255,255,255,0.8); }
    .muted { color: rgba(255,255,255,0.5); }
    .center { text-align: center; margin-top: 2rem; }
    .notes { background: #1a1a1a; border: 1px solid #333; border-radius: 0.5rem; padding: 1.5rem; margin-top: 2rem; white-space: pre-wrap; word-break: break-word; }
    svg { vertical-align: middle; margin-right: 0.5rem; }
  </style>
</head>
<body><main>${content}</main></body>
</html>`;
}

function downloadIcon() {
  return `<svg width="16" height="12" fill="currentColor"><path d="M0 5h1v7H0V5zm15 0h1v7h-1V5zM7.52941176 0h1v7h-1V0zM4.66999817 4.66673379L5.33673196 4l3.33326621 3.33326621L8.00326438 8 4.66999817 4.66673379zM10.6732625 4l.6667338.66673379L8.00673013 8l-.66673379-.66673379L10.6732625 4zM0 12v-1h16v1H0z"/></svg>`;
}

function downloadTable(latestAssets: Map<PlatformIdentifier, PlatformAssets>) {
  // Group by OS+ext
  const grouped = new Map<
    string,
    { id: PlatformIdentifier; arch: string; asset: PlatformAssets }[]
  >();
  const archs = new Set<string>();

  for (const [id, asset] of latestAssets) {
    const p = PLATFORMS[id];
    const key = `${p.os}-${p.ext}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push({ id, arch: p.arch, asset });
    archs.add(p.arch);
  }

  const archList = Array.from(archs);

  const headerCells = archList.map((a) => `<th>${esc(a)}</th>`).join("");

  const rows = Array.from(grouped)
    .map(([key, assets]) => {
      const [name, ext] = PLATFORM_NAMES[key] || [key, ""];
      const label = ext
        ? `<span class="primary">${esc(name)}</span> <span class="muted">(${esc(ext)})</span>`
        : esc(name);

      const cells = archList
        .map((arch) => {
          const found = assets.find((a) => a.arch === arch);
          if (found) {
            return `<td><a href="/download/${found.id}">${downloadIcon()}${esc(found.asset.version)}</a></td>`;
          }
          return `<td class="muted">N/A</td>`;
        })
        .join("");

      return `<tr><td>${label}</td>${cells}</tr>`;
    })
    .join("");

  return `<div class="card"><table><tr><th></th>${headerCells}</tr>${rows}</table></div>`;
}

function versionTable(
  versions: [
    string,
    {
      date: string;
      platforms: Set<PlatformIdentifier>;
      isDraft: boolean;
      isPrerelease: boolean;
    },
  ][],
  latestVersion: string,
) {
  const rows = versions
    .map(([version, details]) => {
      const badges: string[] = [];
      if (version === latestVersion)
        badges.push(`<span class="badge badge-latest">Latest</span>`);
      if (details.isDraft)
        badges.push(`<span class="badge badge-draft">Draft</span>`);
      if (details.isPrerelease)
        badges.push(`<span class="badge badge-prerelease">Pre-release</span>`);

      return `<tr>
      <td class="primary"><a href="/versions/${esc(version)}">${esc(version)}</a></td>
      <td>${badges.join(" ")}</td>
      <td>${details.platforms.size} platforms</td>
      <td>${formatDate(details.date)}</td>
    </tr>`;
    })
    .join("");

  return `<div class="card"><table>
    <tr><th>Version</th><th>Status</th><th>Platforms</th><th>Date</th></tr>
    ${rows}
  </table></div>`;
}

export function renderHomePage(
  config: Configuration,
  releases: Map<PlatformIdentifier, PlatformAssets[]>,
) {
  // Find latest stable for each platform
  const latestAssets = new Map<PlatformIdentifier, PlatformAssets>();
  const versions = new Map<
    string,
    {
      date: string;
      platforms: Set<PlatformIdentifier>;
      isDraft: boolean;
      isPrerelease: boolean;
    }
  >();

  for (const [platform, assets] of releases) {
    const stable = assets.filter((a) => !a.isDraft && !a.isPrerelease);
    if (stable.length) {
      const latest = stable.reduce((a, b) => (a.version > b.version ? a : b));
      latestAssets.set(platform, latest);
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
        versions.get(asset.version)!.platforms.add(platform);
      }
    }
  }

  const sortedVersions = Array.from(versions).sort((a, b) =>
    b[0].localeCompare(a[0], undefined, { numeric: true }),
  );
  const latestVersion =
    sortedVersions.find(([_, d]) => !d.isDraft && !d.isPrerelease)?.[0] || "";

  const footer = config.hideVersions
    ? ""
    : `<p class="center"><a href="/versions">View all versions →</a></p>`;

  return layout(`
    <h1>${esc(config.account)}/${esc(config.repository)}</h1>
    <h2>Latest Version <span class="muted">(${esc(latestVersion)})</span></h2>
    ${downloadTable(latestAssets)}
    ${footer}
  `);
}

export function renderVersionsPage(
  config: Configuration,
  releases: Map<PlatformIdentifier, PlatformAssets[]>,
) {
  const versions = new Map<
    string,
    {
      date: string;
      platforms: Set<PlatformIdentifier>;
      isDraft: boolean;
      isPrerelease: boolean;
    }
  >();

  for (const [platform, assets] of releases) {
    for (const asset of assets) {
      if (!versions.has(asset.version)) {
        versions.set(asset.version, {
          date: asset.date,
          platforms: new Set([platform]),
          isDraft: asset.isDraft,
          isPrerelease: asset.isPrerelease,
        });
      } else {
        versions.get(asset.version)!.platforms.add(platform);
      }
    }
  }

  const sortedVersions = Array.from(versions).sort((a, b) =>
    b[0].localeCompare(a[0], undefined, { numeric: true }),
  );
  const latestVersion =
    sortedVersions.find(([_, d]) => !d.isDraft && !d.isPrerelease)?.[0] || "";

  return layout(`
    <p><a href="/">← Back to latest version</a></p>
    <h1>${esc(config.account)}/${esc(config.repository)}</h1>
    <h2>All Versions</h2>
    ${versionTable(sortedVersions, latestVersion)}
  `);
}

export function renderVersionPage(
  config: Configuration,
  version: string,
  assets: Map<PlatformIdentifier, PlatformAssets>,
) {
  const notes = Array.from(assets.values())[0]?.notes || "";
  const notesHtml = notes ? `<div class="notes">${esc(notes)}</div>` : "";

  return layout(`
    <p><a href="/versions">← Back to all versions</a></p>
    <h1>${esc(config.account)}/${esc(config.repository)}</h1>
    <h2>Version ${esc(version)}</h2>
    ${downloadTable(assets)}
    ${notesHtml}
  `);
}
