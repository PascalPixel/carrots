import { PlatformAssets } from "./cache.js";
import { PLATFORMS, PlatformIdentifier } from "./platforms.js";

export function makePage(latest: Map<PlatformIdentifier, PlatformAssets>) {
  // Step 1: Group data by filetype+OS
  const groupedData: Map<
    `${NodeJS.Platform}-${string}`,
    {
      id: PlatformIdentifier;
      arch: NodeJS.Architecture;
      asset: PlatformAssets;
    }[]
  > = new Map();
  [...latest.entries()].forEach(([id, asset]) => {
    const key: `${NodeJS.Platform}-${string}` = `${PLATFORMS[id].os}-${PLATFORMS[id].ext}`;
    if (!groupedData.has(key)) groupedData.set(key, []);
    groupedData.get(key)?.push({ id, arch: PLATFORMS[id].arch, asset });
  });

  // Step 2: Determine available architectures
  const architectures: Set<NodeJS.Architecture> = new Set();
  groupedData.forEach((assets) => {
    assets.forEach((asset) => {
      if (asset.arch) {
        // Assuming each asset has an 'arch' property
        architectures.add(asset.arch);
      }
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
                <svg width="16" height="12" fill="currentColor">
                  <path d="M0 5h1v7H0V5zm15 0h1v7h-1V5zM7.52941176 0h1v7h-1V0zM4.66999817 4.66673379L5.33673196 4l3.33326621 3.33326621L8.00326438 8 4.66999817 4.66673379zM10.6732625 4l.6667338.66673379L8.00673013 8l-.66673379-.66673379L10.6732625 4zM0 12v-1h16v1H0z"></path>
                </svg>
                ${asset.asset.version}
              </a>
            `
          : `<span style=\"opacity: 50%\">N/A</span>`;
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

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Inter">
        <style>
        body {
            font-family: 'Inter', sans-serif;
            margin: 0;
            background: #000;
            color: #fff;
        }
        h1 {
            font-size: 2rem;
        }
        a {
            color: #ff8849;
            text-decoration: none;
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
            font-weight: bold;
            background: #111;
        }
        th, td {
            border: 1px solid #444;
            padding: 1rem;
            text-align: left;
            vertical-align: top;
            position: relative;
            word-break: break-word;
        }
        </style>
    </head>
    <body>
        <main>
        <table>
            <tr>
            <th style="border-top-color: transparent; border-left-color: transparent; background: transparent;">
            ${Array.from(architectures)
              .map((arch) => `<th>${arch}</th>`)
              .join("")}
            </tr>
            ${rows}
        </table>
        </main>
    </body>
    </html>
    `;

  return html;
}
