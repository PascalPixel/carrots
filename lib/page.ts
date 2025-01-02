import semver from "semver";
import { createElement as o, CSSProperties, ReactNode } from "react";
import { renderToString } from "react-dom/server";

import { Configuration } from "./index.js";
import { PlatformAssets } from "./cache.js";
import { PLATFORMS, PlatformIdentifier } from "./platforms.js";

function Layout({ children }: { children: ReactNode }) {
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

function Link({ href, children }: { href: string; children: ReactNode }) {
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
        padding: "0.25rem 0.75rem",
        borderRadius: "1rem",
        fontSize: "0.875rem",
        color: "#888",
      },
    },
    `${count} platforms`,
  );
}

function Card({
  href,
  children,
  variant = "default",
}: {
  href?: string;
  children: ReactNode;
  variant?: "default" | "draft" | "prerelease";
}) {
  const baseStyle = {
    background: "#111",
    border: "1px solid #333",
    borderRadius: "0.5rem",
    padding:
      typeof children === "object" &&
      children !== null &&
      "type" in children &&
      children.type === "table"
        ? 0
        : "1.5rem",
    transition: "all 0.2s ease",
    color: "#fff",
    textDecoration: "none",
  };

  const variantStyle = variant === "draft" ? { opacity: 0.7 } : {};

  const props = {
    ...(href ? { href } : {}),
    style: { ...baseStyle, ...variantStyle },
  };

  return o(href ? "a" : "div", props, children);
}

function TableHeader({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return o(
    "th",
    {
      style: {
        fontWeight: 600,
        padding: "1rem",
        textAlign: "left",
        verticalAlign: "top",
        position: "relative",
        wordBreak: "break-word",
        borderBottom: "1px solid #333",
        borderRight: "1px solid #333",
        ...style,
      },
    },
    children,
  );
}

function TableCell({
  children,
  style,
}: {
  children?: ReactNode;
  style?: CSSProperties;
}) {
  return o(
    "td",
    {
      style: {
        padding: "1rem",
        textAlign: "left",
        verticalAlign: "top",
        position: "relative",
        wordBreak: "break-word",
        borderBottom: "1px solid #333",
        borderRight: "1px solid #333",
        ...style,
      },
    },
    children,
  );
}

function VersionListTable({
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
  return o(Card, {
    children: o(
      "table",
      {
        style: {
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: 0,
          marginBottom: 0,
          tableLayout: "fixed",
        },
      },
      [
        o("tr", { key: "header" }, [
          o(TableHeader, {
            key: "version",
            style: {
              borderTop: "none",
              borderLeft: "none",
              width: "30%",
            },
            children: "Version",
          }),
          o(TableHeader, {
            key: "date",
            style: {
              borderTop: "none",
              width: "20%",
            },
            children: "Release Date",
          }),
          o(TableHeader, {
            key: "platforms",
            style: {
              borderTop: "none",
              width: "20%",
            },
            children: "Platforms",
          }),
          o(TableHeader, {
            key: "status",
            style: {
              borderTop: "none",
              borderRight: "none",
              width: "30%",
            },
            children: "Status",
          }),
        ]),
        ...versions.map(([version, details], rowIndex, array) =>
          o("tr", { key: version }, [
            o(TableCell, {
              key: "version",
              style: {
                borderLeft: "none",
                borderBottom:
                  rowIndex === array.length - 1 ? "none" : "1px solid #333",
              },
              children: o(Link, {
                href: `/versions/${version}`,
                children: version,
              }),
            }),
            o(TableCell, {
              key: "date",
              style: {
                borderBottom:
                  rowIndex === array.length - 1 ? "none" : "1px solid #333",
              },
              children: new Date(details.date).toLocaleDateString(),
            }),
            o(TableCell, {
              key: "platforms",
              style: {
                borderBottom:
                  rowIndex === array.length - 1 ? "none" : "1px solid #333",
              },
              children: o(PlatformCount, { count: details.platforms.size }),
            }),
            o(TableCell, {
              key: "status",
              style: {
                borderRight: "none",
                borderBottom:
                  rowIndex === array.length - 1 ? "none" : "1px solid #333",
              },
              children: o(
                "div",
                {
                  style: {
                    display: "flex",
                    gap: "0.5rem",
                    flexWrap: "wrap",
                  },
                },
                [
                  details.isDraft
                    ? o(Badge, { variant: "draft", children: "Draft" })
                    : null,
                  details.isPrerelease
                    ? o(Badge, {
                        variant: "prerelease",
                        children: "Pre-release",
                      })
                    : null,
                ].filter(Boolean),
              ),
            }),
          ]),
        ),
      ],
    ),
  });
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

function PlatformName({
  name,
  extension,
}: {
  name: string;
  extension: string;
}) {
  return o("span", null, [
    name,
    " ",
    o("span", { style: { opacity: "50%" } }, `(${extension})`),
  ]);
}

function formatPlatformName(filetypeOs: string): ReactNode {
  const platformMap: Record<string, [string, string]> = {
    "linux-deb": ["Debian", ".deb"],
    "linux-rpm": ["Fedora", ".rpm"],
    "linux-appimage": ["Linux", ".AppImage"],
    "linux-AppImage": ["Linux", ".AppImage"],
    "linux-snap": ["Linux", ".snap"],
    "darwin-dmg": ["macOS", ".dmg"],
    "darwin-zip": ["macOS", ".zip"],
    "win32-exe": ["Windows", ".exe"],
    "win32-nupkg": ["Squirrel", ".nupkg"],
  };

  const [name, extension] = platformMap[filetypeOs] || [filetypeOs, ""];
  return extension ? o(PlatformName, { name, extension }) : name;
}

function DownloadTable({
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
  return o(Card, {
    children: o(
      "table",
      {
        style: {
          width: "100%",
          borderCollapse: "separate",
          borderSpacing: 0,
          marginBottom: 0,
          tableLayout: "fixed",
        },
      },
      [
        o("tr", { key: "header" }, [
          o(TableHeader, {
            key: "empty",
            style: {
              borderTop: "none",
              borderLeft: "none",
              borderRight: "1px solid #333",
            },
            children: null,
          }),
          ...Array.from(architectures).map((arch, index, array) =>
            o(TableHeader, {
              key: arch,
              style: {
                borderTop: "none",
                borderRight:
                  index === array.length - 1 ? "none" : "1px solid #333",
              },
              children: arch,
            }),
          ),
        ]),
        ...Array.from(groupedData).map(
          ([filetypeOs, assets], rowIndex, array) =>
            o("tr", { key: filetypeOs }, [
              o(TableCell, {
                key: "platform",
                style: {
                  borderLeft: "none",
                  borderBottom:
                    rowIndex === array.length - 1 ? "none" : "1px solid #333",
                },
                children: formatPlatformName(filetypeOs),
              }),
              ...Array.from(architectures).map((arch, colIndex, archArray) => {
                const asset = assets.find((a) => a.arch === arch);
                const isLastColumn = colIndex === archArray.length - 1;
                return o(
                  TableCell,
                  {
                    key: arch,
                    style: {
                      borderRight: isLastColumn ? "none" : "1px solid #333",
                      borderBottom:
                        rowIndex === array.length - 1
                          ? "none"
                          : "1px solid #333",
                    },
                  },
                  asset
                    ? o(DownloadCell, { asset: asset.asset, id: asset.id })
                    : o("span", { style: { opacity: "50%" } }, "N/A"),
                );
              }),
            ]),
        ),
      ],
    ),
  });
}

function VersionPage({
  version,
  assets,
  showHeader = true,
}: {
  version: string;
  assets: Map<PlatformIdentifier, PlatformAssets>;
  showHeader?: boolean;
}) {
  // Group data by filetype+OS
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

  // Determine available architectures
  const architectures: Set<NodeJS.Architecture> = new Set();
  groupedData.forEach((assets) => {
    assets.forEach((asset) => {
      if (asset.arch) architectures.add(asset.arch);
    });
  });

  const table = o(DownloadTable, { groupedData, architectures });

  if (!showHeader) {
    return table;
  }

  return o(Layout, {
    children: [
      o(Header, { children: `Version ${version}` }),
      o(SubHeader, { children: "Downloads" }),
      table,
      o("p", null, [
        o(Link, { href: "/", children: "← Back to all versions" }),
      ]),
    ],
  });
}

function VersionListPage({
  releases,
  account,
  repository,
}: {
  releases: Map<PlatformIdentifier, PlatformAssets[]>;
  account: string;
  repository: string;
}) {
  // Process releases into versions map
  const versions = new Map<
    string,
    {
      date: string;
      platforms: Set<PlatformIdentifier>;
      isDraft: boolean;
      isPrerelease: boolean;
    }
  >();
  const latestAssets = new Map<PlatformIdentifier, PlatformAssets>();

  for (const [platform, assets] of releases.entries()) {
    // Find latest stable version
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

    // Build versions map
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

  // Get latest stable version
  const latestVersion =
    sortedVersions.find(
      ([_, details]) => !details.isDraft && !details.isPrerelease,
    )?.[0] || "";

  return o(Layout, {
    children: [
      o(Header, null, `${account}/${repository}`),
      o(SubHeader, null, `Latest Version (${latestVersion})`),
      o(VersionPage, {
        version: latestVersion,
        assets: latestAssets,
        showHeader: false,
      }),
      o(SubHeader, null, "All Versions"),
      o(VersionListTable, { versions: sortedVersions }),
    ],
  });
}

export function makeVersionPage(
  config: Configuration,
  version: string,
  assets: Map<PlatformIdentifier, PlatformAssets>,
  showHeader = true,
) {
  return renderToString(
    o(VersionPage, {
      version,
      assets,
      showHeader,
    }),
  );
}

export function makeVersionListPage(
  config: Configuration,
  releases: Map<PlatformIdentifier, PlatformAssets[]>,
) {
  return renderToString(
    o(VersionListPage, {
      releases,
      account: config.account,
      repository: config.repository,
    }),
  );
}
