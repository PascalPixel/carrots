import { PlatformAssets } from "./cache.js";
import { PLATFORMS, PlatformIdentifier } from "./platforms.js";
import semver from "semver";
import { createElement as o, CSSProperties } from "react";
import { renderToString } from "react-dom/server";

function Layout({ children }: { children: any }) {
  return o("html", { lang: "en" }, [
    o("head", null, [
      o("meta", { charset: "utf-8" }),
      o("meta", {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      }),
      o("link", {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css?family=Inter:400,500,600,700,800&display=swap",
      }),
    ]),
    o(
      "body",
      {
        style: {
          fontFamily: "'Inter', sans-serif",
          margin: 0,
          background: "#000",
          color: "#fff",
        },
      },
      [
        o(
          "main",
          {
            style: {
              padding: "2rem",
              margin: "0 auto",
              maxWidth: "768px",
            },
          },
          children,
        ),
      ],
    ),
  ]);
}

function Header({ children }: { children: string }) {
  return o(
    "h1",
    {
      style: {
        fontSize: "2rem",
        fontWeight: 800,
        marginBottom: "1rem",
      },
    },
    children,
  );
}

function SubHeader({ children }: { children: string }) {
  return o(
    "h2",
    {
      style: {
        fontSize: "1.5rem",
        fontWeight: 600,
        marginBottom: "1rem",
        color: "#888",
      },
    },
    children,
  );
}

function Link({ href, children }: { href: string; children: any }) {
  return o(
    "a",
    {
      href,
      style: {
        color: "#0070f3",
        textDecoration: "none",
        transition: "color 0.2s ease",
      },
    },
    children,
  );
}

function DownloadIcon() {
  return o(
    "svg",
    {
      style: {
        display: "inline-block",
        marginRight: "0.5rem",
        verticalAlign: "middle",
      },
      width: 16,
      height: 12,
      fill: "currentColor",
    },
    o("path", {
      d: "M0 5h1v7H0V5zm15 0h1v7h-1V5zM7.52941176 0h1v7h-1V0zM4.66999817 4.66673379L5.33673196 4l3.33326621 3.33326621L8.00326438 8 4.66999817 4.66673379zM10.6732625 4l.6667338.66673379L8.00673013 8l-.66673379-.66673379L10.6732625 4zM0 12v-1h16v1H0z",
    }),
  );
}

function Badge({
  variant,
  children,
}: {
  variant: "draft" | "prerelease";
  children: string;
}) {
  const baseStyle = {
    display: "inline-block",
    padding: "0.25rem 0.75rem",
    borderRadius: "1rem",
    fontSize: "0.75rem",
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.025em",
  };

  const variantStyles = {
    draft: {
      background: "#2d2d2d",
      color: "#888",
    },
    prerelease: {
      background: "#0d2231",
      color: "#0070f3",
    },
  };

  return o(
    "span",
    {
      style: { ...baseStyle, ...variantStyles[variant] },
    },
    children,
  );
}

function PlatformCount({ count }: { count: number }) {
  return o(
    "span",
    {
      style: {
        display: "inline-block",
        background: "#222",
        padding: "0.25rem 0.75rem",
        borderRadius: "1rem",
        fontSize: "0.875rem",
        color: "#888",
      },
    },
    `${count} platforms`,
  );
}

function VersionCard({
  version,
  details,
}: {
  version: string;
  details: {
    date: string;
    platforms: Set<PlatformIdentifier>;
    isDraft: boolean;
    isPrerelease: boolean;
  };
}) {
  const baseStyle = {
    background: "#111",
    border: "1px solid #333",
    borderRadius: "0.5rem",
    padding: "1.5rem",
    transition: "all 0.2s ease",
    color: "#fff",
    textDecoration: "none",
  };

  const variantStyle = details.isDraft
    ? { opacity: 0.7 }
    : details.isPrerelease
      ? { background: "#0d2231", borderColor: "#0d2231" }
      : {};

  return o(
    "a",
    {
      href: `/versions/${version}`,
      style: { ...baseStyle, ...variantStyle },
    },
    [
      o(
        "div",
        {
          style: {
            fontSize: "1.25rem",
            fontWeight: 600,
            margin: "0 0 0.5rem 0",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            flexWrap: "wrap",
          },
        },
        [
          `Version ${version}`,
          details.isDraft
            ? o(Badge, { variant: "draft", children: "Draft" })
            : null,
          details.isPrerelease
            ? o(Badge, { variant: "prerelease", children: "Pre-release" })
            : null,
          o(PlatformCount, { count: details.platforms.size }),
        ],
      ),
      o(
        "div",
        {
          style: {
            color: "#888",
            fontSize: "0.875rem",
          },
        },
        `Released ${new Date(details.date).toLocaleDateString()}`,
      ),
    ],
  );
}

function DownloadCell({
  asset,
  id,
}: {
  asset: PlatformAssets;
  id: PlatformIdentifier;
}) {
  return o(Link, {
    href: `/download/${id}`,
    children: [o(DownloadIcon), asset.version],
  });
}

function TableHeader({
  children,
  style,
}: {
  children: any;
  style?: CSSProperties;
}) {
  return o(
    "th",
    {
      style: {
        fontWeight: 600,
        background: "#111",
        border: "1px solid #333",
        padding: "1rem",
        textAlign: "left",
        verticalAlign: "top",
        position: "relative",
        wordBreak: "break-word",
        ...style,
      },
    },
    children,
  );
}

function TableCell({ children, html }: { children?: any; html?: string }) {
  return o(
    "td",
    {
      style: {
        border: "1px solid #333",
        padding: "1rem",
        textAlign: "left",
        verticalAlign: "top",
        position: "relative",
        wordBreak: "break-word",
      },
      dangerouslySetInnerHTML: html ? { __html: html } : undefined,
    },
    html ? undefined : children,
  );
}

function EmptyTableHeader() {
  return o(TableHeader, {
    style: {
      borderTopColor: "transparent",
      borderLeftColor: "transparent",
      background: "transparent",
    },
    children: null,
  });
}

function PlatformTable({
  groupedData,
  architectures,
}: {
  groupedData: Map<
    string,
    {
      id: PlatformIdentifier;
      arch: NodeJS.Architecture;
      asset: PlatformAssets;
    }[]
  >;
  architectures: Set<NodeJS.Architecture>;
}) {
  return o(
    "table",
    {
      style: {
        width: "100%",
        borderCollapse: "collapse",
        marginBottom: "2rem",
        tableLayout: "fixed",
      },
    },
    [
      o("tr", null, [
        o(EmptyTableHeader),
        ...Array.from(architectures).map((arch) => o(TableHeader, null, arch)),
      ]),
      ...Array.from(groupedData).map(([filetypeOs, assets]) =>
        o("tr", null, [
          o(TableCell, { html: formatPlatformName(filetypeOs) }),
          ...Array.from(architectures).map((arch) => {
            const asset = assets.find((a) => a.arch === arch);
            return o(
              TableCell,
              null,
              asset
                ? o(DownloadCell, { asset: asset.asset, id: asset.id })
                : o("span", { style: { opacity: "50%" } }, "N/A"),
            );
          }),
        ]),
      ),
    ],
  );
}

function VersionList({
  versions,
}: {
  versions: [
    string,
    {
      date: string;
      platforms: Set<PlatformIdentifier>;
      isDraft: boolean;
      isPrerelease: boolean;
    },
  ][];
}) {
  return o(
    "div",
    {
      style: {
        display: "grid",
        gap: "1rem",
      },
    },
    versions.map(([version, details]) => o(VersionCard, { version, details })),
  );
}

function wrapHtml(content: any) {
  return renderToString(o(Layout, null, content));
}

function formatPlatformName(filetypeOs: string) {
  const platformMap: Record<string, string> = {
    "linux-deb": 'Debian <span style="opacity: 50%;">(.deb)</span>',
    "linux-rpm": 'Fedora <span style="opacity: 50%;">(.rpm)</span>',
    "linux-appimage": 'Linux <span style="opacity: 50%;">(.AppImage)</span>',
    "linux-AppImage": 'Linux <span style="opacity: 50%;">(.AppImage)</span>',
    "linux-snap": 'Linux <span style="opacity: 50%;">(.snap)</span>',
    "darwin-dmg": 'macOS <span style="opacity: 50%;">(.dmg)</span>',
    "darwin-zip": 'macOS <span style="opacity: 50%;">(.zip)</span>',
    "win32-exe": 'Windows <span style="opacity: 50%;">(.exe)</span>',
    "win32-nupkg": 'Squirrel <span style="opacity: 50%;">(.nupkg)</span>',
  };
  return platformMap[filetypeOs] || filetypeOs;
}

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

  // Step 3: Create table
  const table = o(PlatformTable, { groupedData, architectures });

  if (!showHeader) {
    return table;
  }

  const content = o("div", null, [
    o(Header, null, `Version ${version}`),
    o(SubHeader, null, "Downloads"),
    table,
    o("p", null, [o(Link, { href: "/", children: "← Back to all versions" })]),
  ]);

  return wrapHtml(content);
}

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

  // Create version list content
  const content = o("div", null, [
    o(Header, null, `Latest Version (${latestVersion})`),
    latestTable,
    o(SubHeader, null, "All Versions"),
    o(
      "div",
      {
        style: {
          display: "grid",
          gap: "1rem",
        },
      },
      sortedVersions.map(([version, details]) =>
        o(VersionCard, { version, details }),
      ),
    ),
  ]);

  return wrapHtml(content);
}
