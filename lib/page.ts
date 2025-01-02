import semver from "semver";
import { createElement as o, CSSProperties, ReactNode } from "react";
import { renderToString } from "react-dom/server";

import { Configuration } from "./index.js";
import { PlatformAssets } from "./cache.js";
import { PLATFORMS, PlatformIdentifier } from "./platforms.js";

function Layout({ children }: { children?: ReactNode }) {
  return o("html", { lang: "en" }, [
    o("head", null, [
      o("meta", { charset: "utf-8" }),
      o("meta", {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      }),
      o("link", {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap",
      }),
    ]),
    o(
      "body",
      {
        style: {
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          margin: 0,
          background: "#000",
          color: "#fff",
          fontSize: "0.875rem",
          lineHeight: 1.5,
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
        },
      },
      [
        o(
          "main",
          {
            style: {
              padding: "2rem 1.5rem",
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

function Header({ children }: { children?: ReactNode }) {
  return o(
    "h1",
    {
      style: {
        fontSize: "1.25rem",
        fontWeight: 600,
        marginBottom: "1.25rem",
        letterSpacing: "-0.025em",
        lineHeight: 1.4,
      },
    },
    children,
  );
}

function SubHeader({ children }: { children?: ReactNode }) {
  return o(
    "h2",
    {
      style: {
        fontSize: "1rem",
        fontWeight: 500,
        marginTop: "2rem",
        marginBottom: "1.25rem",
        color: "#a1a1aa",
        letterSpacing: "-0.025em",
        lineHeight: 1.4,
      },
    },
    children,
  );
}

function Link({ href, children }: { href: string; children?: ReactNode }) {
  return o(
    "a",
    {
      href,
      style: {
        color: "#60a5fa",
        textDecoration: "none",
        fontSize: "0.875rem",
        transition: "all 0.2s ease",
        borderBottom: "1px solid transparent",
        paddingBottom: "1px",
        ":hover": {
          color: "#93c5fd",
          borderBottomColor: "#93c5fd",
        },
      },
    },
    children,
  );
}

function Badge({
  variant,
  children,
}: {
  variant: "draft" | "prerelease" | "latest";
  children?: ReactNode;
}) {
  const baseStyle = {
    display: "inline-block",
    padding: "0.1rem 0.625rem",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: 500,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  const variantStyles = {
    draft: {
      background: "#27272a",
      color: "#a1a1aa",
    },
    prerelease: {
      background: "#0c4a6e",
      color: "#7dd3fc",
    },
    latest: {
      background: "#064e3b",
      color: "#34d399",
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
        fontSize: "0.875rem",
        fontWeight: 500,
        color: "#a1a1aa",
      },
    },
    [`${count} platforms`],
  );
}

function Card({
  href,
  children,
  variant = "default",
}: {
  href?: string;
  variant?: "default" | "draft" | "prerelease";
  children?: ReactNode;
}) {
  const baseStyle = {
    background: "#111",
    border: "1px solid #333",
    borderRadius: "0.5rem",
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
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return o(
    "th",
    {
      style: {
        fontWeight: 500,
        padding: "0.75rem 1rem",
        textAlign: "left",
        verticalAlign: "top",
        position: "relative",
        wordBreak: "break-word",
        borderBottom: "1px solid #27272a",
        borderRight: "1px solid #27272a",
        fontSize: "0.75rem",
        color: "#fff",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        ...style,
      },
    },
    children,
  );
}

function TableCell({
  primary,
  style,
  children,
}: {
  primary?: boolean;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return o(
    "td",
    {
      style: {
        padding: "0.75rem 1rem",
        textAlign: "left",
        verticalAlign: "top",
        position: "relative",
        wordBreak: "break-word",
        borderBottom: "1px solid #27272a",
        borderRight: "1px solid #27272a",
        fontSize: "0.875rem",
        lineHeight: 1.5,
        color: primary ? "#fff" : "#a1a1aa",
        ...style,
      },
    },
    children ? children : [],
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
  // Find the latest stable version
  const latestVersion = versions.find(
    ([_, details]) => !details.isDraft && !details.isPrerelease,
  )?.[0];

  return o(Card, null, [
    o(
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
          o(
            TableHeader,
            {
              key: "version",
              style: {
                borderTop: "none",
                borderLeft: "none",
                width: "30%",
              },
            },
            ["Version"],
          ),
          o(
            TableHeader,
            {
              key: "date",
              style: {
                borderTop: "none",
                width: "20%",
              },
            },
            ["Release Date"],
          ),
          o(
            TableHeader,
            {
              key: "platforms",
              style: {
                borderTop: "none",
                width: "20%",
              },
            },
            ["Platforms"],
          ),
          o(
            TableHeader,
            {
              key: "status",
              style: {
                borderTop: "none",
                borderRight: "none",
                width: "30%",
              },
            },
            ["Status"],
          ),
        ]),
        ...versions.map(([version, details], rowIndex, array) =>
          o("tr", { key: version }, [
            o(
              TableCell,
              {
                key: "version",
                primary: true,
                style: {
                  borderLeft: "none",
                  borderBottom:
                    rowIndex === array.length - 1
                      ? "none"
                      : "1px solid #27272a",
                },
              },
              [
                o(
                  Link,
                  {
                    href: `/versions/${version}`,
                  },
                  [version],
                ),
              ],
            ),
            o(
              TableCell,
              {
                key: "date",
                style: {
                  borderBottom:
                    rowIndex === array.length - 1
                      ? "none"
                      : "1px solid #27272a",
                },
              },
              [new Date(details.date).toLocaleDateString()],
            ),
            o(
              TableCell,
              {
                key: "platforms",
                style: {
                  borderBottom:
                    rowIndex === array.length - 1
                      ? "none"
                      : "1px solid #27272a",
                },
              },
              [
                o(PlatformCount, {
                  count: details.platforms.size,
                }),
              ],
            ),
            o(
              TableCell,
              {
                key: "status",
                style: {
                  borderRight: "none",
                  borderBottom:
                    rowIndex === array.length - 1
                      ? "none"
                      : "1px solid #27272a",
                },
              },
              [
                o(
                  "div",
                  {
                    style: {
                      display: "flex",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                    },
                  },
                  [
                    version === latestVersion
                      ? o(
                          Badge,
                          {
                            key: "latest",
                            variant: "latest",
                          },
                          ["Latest"],
                        )
                      : null,
                    details.isDraft
                      ? o(
                          Badge,
                          {
                            key: "draft",
                            variant: "draft",
                          },
                          ["Draft"],
                        )
                      : null,
                    details.isPrerelease
                      ? o(
                          Badge,
                          {
                            key: "prerelease",
                            variant: "prerelease",
                          },
                          ["Pre-release"],
                        )
                      : null,
                  ].filter(Boolean),
                ),
              ],
            ),
          ]),
        ),
      ],
    ),
  ]);
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
    [
      o("path", {
        d: "M0 5h1v7H0V5zm15 0h1v7h-1V5zM7.52941176 0h1v7h-1V0zM4.66999817 4.66673379L5.33673196 4l3.33326621 3.33326621L8.00326438 8 4.66999817 4.66673379zM10.6732625 4l.6667338.66673379L8.00673013 8l-.66673379-.66673379L10.6732625 4zM0 12v-1h16v1H0z",
      }),
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
  return o(
    Link,
    {
      href: `/download/${id}`,
    },
    [o(DownloadIcon), o("span", null, [asset.version])],
  );
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
    o("span", { style: { opacity: "50%" } }, [`(${extension})`]),
  ]);
}

function FormatPlatformName({ filetypeOs }: { filetypeOs: string }): ReactNode {
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
  return o(Card, null, [
    o(
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
          o(
            TableHeader,
            {
              key: "empty",
              style: {
                borderTop: "none",
                borderLeft: "none",
                borderRight: "1px solid #333",
              },
            },
            [""],
          ),
          ...Array.from(architectures).map((arch, index, array) =>
            o(
              TableHeader,
              {
                key: arch,
                style: {
                  borderTop: "none",
                  borderRight:
                    index === array.length - 1 ? "none" : "1px solid #333",
                },
              },
              [arch],
            ),
          ),
        ]),
        ...Array.from(groupedData).map(
          ([filetypeOs, assets], rowIndex, array) =>
            o("tr", { key: filetypeOs }, [
              o(
                TableCell,
                {
                  key: "platform",
                  style: {
                    borderLeft: "none",
                    borderBottom:
                      rowIndex === array.length - 1 ? "none" : "1px solid #333",
                  },
                },
                [o(FormatPlatformName, { filetypeOs })],
              ),
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
                  [
                    asset
                      ? o(DownloadCell, {
                          asset: asset.asset,
                          id: asset.id,
                        })
                      : o("span", { style: { opacity: "50%" } }, ["N/A"]),
                  ],
                );
              }),
            ]),
        ),
      ],
    ),
  ]);
}

function VersionPage({
  version,
  assets,
  showHeader = true,
  account,
  repository,
}: {
  version: string;
  assets: Map<PlatformIdentifier, PlatformAssets>;
  showHeader?: boolean;
  account: string;
  repository: string;
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

  if (!showHeader) {
    return o(DownloadTable, { groupedData, architectures });
  }

  return o(Layout, null, [
    o("p", null, [o(Link, { href: "/" }, "← Back to all versions")]),
    o(Header, null, [`${account}/${repository}`]),
    o(SubHeader, null, [`Version ${version}`]),
    o(DownloadTable, { groupedData, architectures }),
  ]);
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

  return o(Layout, null, [
    o(Header, null, [`${account}/${repository}`]),
    o(SubHeader, null, [
      "Latest Version ",
      o("span", { style: { opacity: "50%" } }, [`(${latestVersion})`]),
    ]),
    o(VersionPage, {
      version: latestVersion,
      assets: latestAssets,
      showHeader: false,
      account,
      repository,
    }),
    o(SubHeader, null, ["All Versions"]),
    o(VersionListTable, { versions: sortedVersions }),
  ]);
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
      account: config.account,
      repository: config.repository,
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
