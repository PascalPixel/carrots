import semver from "semver";
import { createElement as o, CSSProperties, ReactNode } from "react";
import { renderToString } from "react-dom/server";

import { Configuration } from "./index.js";
import { PlatformAssets } from "./cache.js";
import { PLATFORMS, PlatformIdentifier } from "./platforms.js";

function Header({ children }: { children?: ReactNode }) {
  return o(
    "h1",
    {
      style: {
        fontSize: "1.25rem",
        fontWeight: 700,
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
        color: "hsla(0, 0%, 100%, 0.85)",
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
        color: "hsla(142, 76%, 55%, 1)",
        textDecoration: "none",
        fontSize: "0.875rem",
        transition: "all 0.2s ease",
        borderBottom: "1px solid transparent",
        paddingBottom: "1px",
        ":hover": {
          color: "hsla(142, 70%, 65%, 1)",
          borderBottomColor: "hsla(142, 70%, 65%, 1)",
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
      background: "hsla(0, 0%, 20%, 0.5)",
      color: "hsla(0, 0%, 100%, 0.85)",
    },
    prerelease: {
      background: "hsla(0, 0%, 25%, 0.6)",
      color: "hsla(0, 0%, 100%, 0.9)",
    },
    latest: {
      background: "hsla(142, 76%, 36%, 0.3)",
      color: "hsla(142, 70%, 65%, 1)",
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

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function PlatformCount({ count }: { count: number }) {
  return o(
    "span",
    {
      style: {
        display: "inline-block",
        fontSize: "0.875rem",
        fontWeight: 500,
        color: "hsla(0, 0%, 100%, 0.85)",
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
    background: "hsla(0, 0%, 100%, 0.08)",
    border: "1px solid hsla(0, 0%, 100%, 0.2)",
    borderRadius: "0.5rem",
    transition: "all 0.2s ease",
    color: "hsla(0, 0%, 100%, 1)",
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
        borderBottom: "1px solid hsla(0, 0%, 100%, 0.1)",
        borderRight: "1px solid hsla(0, 0%, 100%, 0.1)",
        fontSize: "0.75rem",
        color: "hsla(0, 0%, 100%, 1)",
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
        borderBottom: "1px solid hsla(0, 0%, 100%, 0.1)",
        borderRight: "1px solid hsla(0, 0%, 100%, 0.1)",
        fontSize: "0.875rem",
        lineHeight: 1.5,
        color: primary ? "hsla(0, 0%, 100%, 1)" : "hsla(0, 0%, 100%, 0.65)",
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
                width: "25%",
              },
            },
            ["Version"],
          ),
          o(
            TableHeader,
            {
              key: "status",
              style: {
                borderTop: "none",
                width: "20%",
              },
            },
            ["Status"],
          ),
          o(
            TableHeader,
            {
              key: "platforms",
              style: {
                borderTop: "none",
                width: "15%",
              },
            },
            ["Platforms"],
          ),
          o(
            TableHeader,
            {
              key: "date",
              style: {
                borderTop: "none",
                borderRight: "none",
                width: "40%",
              },
            },
            ["Release Date"],
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
                key: "status",
                style: {
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
                key: "date",
                style: {
                  borderRight: "none",
                  borderBottom:
                    rowIndex === array.length - 1
                      ? "none"
                      : "1px solid #27272a",
                },
              },
              [formatDate(details.date)],
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
      key: "svg",
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
        key: "path",
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
    [
      o(DownloadIcon, { key: "icon" }),
      o("span", { key: "version" }, [asset.version]),
    ],
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
    o(
      "span",
      {
        key: "name",
        style: {
          color: "hsla(0, 0%, 100%, 1)",
          fontWeight: 500,
        },
      },
      name,
    ),
    " ",
    o(
      "span",
      {
        key: "extension",
        style: {
          color: "hsla(0, 0%, 100%, 0.5)",
          fontWeight: 400,
        },
      },
      [`(${extension})`],
    ),
  ]);
}

function FormatPlatformName({ filetypeOs }: { filetypeOs: string }) {
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
  return extension
    ? o(PlatformName, { key: filetypeOs, name, extension })
    : o("span", { key: filetypeOs }, name);
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
                [o(FormatPlatformName, { key: filetypeOs, filetypeOs })],
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
                          key: `${asset.id}-${asset.arch}`,
                          asset: asset.asset,
                          id: asset.id,
                        })
                      : o("span", { key: "na", style: { opacity: "50%" } }, [
                          "N/A",
                        ]),
                  ],
                );
              }),
            ]),
        ),
      ],
    ),
  ]);
}

function Layout({ children }: { children?: ReactNode }) {
  return o("html", { lang: "en" }, [
    o("head", { key: "head" }, [
      o("meta", { key: "charset", charSet: "utf-8" }),
      o("meta", {
        key: "viewport",
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      }),
      o("link", {
        key: "fonts",
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap",
      }),
    ]),
    o(
      "body",
      {
        key: "body",
        style: {
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          margin: 0,
          background: "hsla(0, 0%, 5%, 1)",
          color: "hsla(0, 0%, 100%, 1)",
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
            key: "main",
            style: {
              padding: "2rem 1.5rem",
              margin: "0 auto",
              maxWidth: "768px",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            },
          },
          children,
        ),
      ],
    ),
  ]);
}

function HomePage({
  config,
  releases,
}: {
  config: Configuration;
  releases: Map<PlatformIdentifier, PlatformAssets[]>;
}) {
  // Process releases to find latest version
  const versions = new Map<
    string,
    {
      date: string;
      platforms: Set<PlatformIdentifier>;
      isDraft: boolean;
      isPrerelease: boolean;
      notes: string;
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

    // Build versions map for finding latest version
    for (const asset of assets) {
      if (!versions.has(asset.version)) {
        versions.set(asset.version, {
          date: asset.date,
          platforms: new Set([platform]),
          isDraft: asset.isDraft,
          isPrerelease: asset.isPrerelease,
          notes: asset.notes || "",
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

  // Group data by filetype+OS for the download table
  const groupedData: Map<
    `${NodeJS.Platform}-${string}`,
    {
      id: PlatformIdentifier;
      arch: NodeJS.Architecture;
      asset: PlatformAssets;
    }[]
  > = new Map();

  [...latestAssets.entries()].forEach(([id, asset]) => {
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

  return o(Layout, null, [
    o("div", { key: "header" }, [
      o(Header, null, [`${config.account}/${config.repository}`]),
      o(SubHeader, null, [
        "Latest Version ",
        o("span", { key: "version", style: { opacity: "50%" } }, [
          `(${latestVersion})`,
        ]),
      ]),
    ]),
    o(DownloadTable, { key: "downloads", groupedData, architectures }),
    o(
      "div",
      {
        key: "footer",
        style: {
          marginTop: "2rem",
          textAlign: "center",
        },
      },
      [o(Link, { href: "/versions" }, ["View all versions →"])],
    ),
  ]);
}

function VersionsPage({
  config,
  releases,
}: {
  config: Configuration;
  releases: Map<PlatformIdentifier, PlatformAssets[]>;
}) {
  // Process releases into versions map
  const versions = new Map<
    string,
    {
      date: string;
      platforms: Set<PlatformIdentifier>;
      isDraft: boolean;
      isPrerelease: boolean;
      notes: string;
    }
  >();

  for (const [platform, assets] of releases.entries()) {
    // Build versions map
    for (const asset of assets) {
      if (!versions.has(asset.version)) {
        versions.set(asset.version, {
          date: asset.date,
          platforms: new Set([platform]),
          isDraft: asset.isDraft,
          isPrerelease: asset.isPrerelease,
          notes: asset.notes || "",
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

  return o(Layout, null, [
    o("div", { key: "header" }, [
      o("p", { key: "back" }, [
        o(Link, { href: "/" }, ["← Back to latest version"]),
      ]),
      o(Header, { key: "title" }, [`${config.account}/${config.repository}`]),
      o(SubHeader, { key: "subtitle" }, ["All Versions"]),
    ]),
    o(VersionListTable, { key: "versions", versions: sortedVersions }),
  ]);
}

function VersionPage({
  config,
  version,
  assets,
}: {
  config: Configuration;
  version: string;
  assets: Map<PlatformIdentifier, PlatformAssets>;
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

  // Get release notes from any asset (they should all be the same for a version)
  const releaseNotes = Array.from(assets.values())[0]?.notes || "";

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

  return o(Layout, null, [
    o("div", null, [
      o("p", null, [o(Link, { href: "/versions" }, "← Back to all versions")]),
      o(Header, null, [`${config.account}/${config.repository}`]),
      o(SubHeader, null, [`Version ${version}`]),
    ]),
    o(DownloadTable, { groupedData, architectures }),
    releaseNotes &&
      o(
        "div",
        {
          style: {
            background: "hsla(0, 0%, 10%, 1)",
            border: "1px solid hsla(0, 0%, 30%, 1)",
            borderRadius: "0.5rem",
            padding: "1.5rem",
            marginTop: "2rem",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontSize: "0.875rem",
            lineHeight: 1.5,
            color: "hsla(0, 0%, 95%, 1)",
          },
        },
        [releaseNotes],
      ),
  ]);
}

export function renderHomePage(
  config: Configuration,
  releases: Map<PlatformIdentifier, PlatformAssets[]>,
) {
  return renderToString(o(HomePage, { config, releases }));
}

export function renderVersionsPage(
  config: Configuration,
  releases: Map<PlatformIdentifier, PlatformAssets[]>,
) {
  return renderToString(o(VersionsPage, { config, releases }));
}

export function renderVersionPage(
  config: Configuration,
  version: string,
  assets: Map<PlatformIdentifier, PlatformAssets>,
) {
  return renderToString(o(VersionPage, { config, version, assets }));
}
