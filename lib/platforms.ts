// Enum for supported platforms
export enum PlatformIdentifier {
  APPIMAGE_ARM64 = "appimage-arm64",
  APPIMAGE_X64 = "appimage-x64",
  DARWIN_ARM64 = "darwin-arm64",
  DARWIN_X64 = "darwin-x64",
  DMG_ARM64 = "dmg-arm64",
  DMG_X64 = "dmg-x64",
  DEBIAN_ARM64 = "deb-arm64",
  DEBIAN_X64 = "deb-x64",
  FEDORA_ARM64 = "rpm-arm64",
  FEDORA_X64 = "rpm-x64",
  WIN32_ARM64 = "win32-arm64",
  WIN32_IA32 = "win32-ia32",
  WIN32_X64 = "win32-x64",
  NUPKG = "nupkg",
  SNAP_ARM64 = "snap-arm64",
  SNAP_X64 = "snap-x64",
}

// Platform information mapping
// Order is important for file to platform matching
export const PLATFORMS: Record<
  PlatformIdentifier,
  {
    os: NodeJS.Platform;
    arch: NodeJS.Architecture;
    ext: string;
    aliases: string[];
    filePatterns: RegExp[];
  }
> = {
  [PlatformIdentifier.DMG_ARM64]: {
    os: "darwin",
    arch: "arm64",
    ext: "dmg",
    aliases: ["dmg-arm64"],
    filePatterns: [
      /.*darwin-arm.*\.dmg$/,
      /.*mac-arm.*\.dmg$/,
      /.*osx-arm.*\.dmg$/,
    ],
  },
  [PlatformIdentifier.DMG_X64]: {
    os: "darwin",
    arch: "x64",
    ext: "dmg",
    aliases: ["dmg"],
    filePatterns: [
      /.*darwin.*\.dmg$/,
      /.*mac.*\.dmg$/,
      /.*osx.*\.dmg$/,
      /.*\.dmg$/,
    ],
  },
  [PlatformIdentifier.DARWIN_ARM64]: {
    os: "darwin",
    arch: "arm64",
    ext: "zip",
    aliases: ["darwin-arm64", "mac-arm64", "macos-arm64", "osx-arm64"],
    filePatterns: [
      /.*darwin-arm.*\.zip$/,
      /.*mac-arm.*\.zip$/,
      /.*osx-arm.*\.zip$/,
    ],
  },
  [PlatformIdentifier.DARWIN_X64]: {
    os: "darwin",
    arch: "x64",
    ext: "zip",
    aliases: ["darwin", "mac", "macos", "osx"],
    filePatterns: [
      /.*darwin.*\.zip$/,
      /.*mac.*\.zip$/,
      /.*osx.*\.zip$/,
      /.*\.zip$/,
    ],
  },
  [PlatformIdentifier.WIN32_IA32]: {
    os: "win32",
    arch: "ia32",
    ext: "exe",
    aliases: ["x86"],
    filePatterns: [/.*win32-ia32.*/],
  },
  [PlatformIdentifier.WIN32_ARM64]: {
    os: "win32",
    arch: "arm64",
    ext: "exe",
    aliases: [],
    filePatterns: [/.*win32-arm64.*/],
  },
  [PlatformIdentifier.WIN32_X64]: {
    os: "win32",
    arch: "x64",
    ext: "exe",
    aliases: ["exe", "win", "win32", "windows", "win64", "x64"],
    filePatterns: [/.*win32-x64.*/, /.*\.exe$/],
  },
  [PlatformIdentifier.NUPKG]: {
    os: "win32",
    arch: "x64",
    ext: "nupkg",
    aliases: [],
    filePatterns: [/.*\.nupkg$/],
  },
  [PlatformIdentifier.APPIMAGE_ARM64]: {
    os: "linux",
    arch: "arm64",
    ext: "AppImage",
    aliases: ["appimage-arm64", "linux-arm64"],
    filePatterns: [/.*arm64.*\.appimage$/, /.*aarch64.*\.appimage$/],
  },
  [PlatformIdentifier.APPIMAGE_X64]: {
    os: "linux",
    arch: "x64",
    ext: "AppImage",
    aliases: ["appimage", "linux"],
    filePatterns: [/.*\.appimage$/],
  },
  [PlatformIdentifier.DEBIAN_ARM64]: {
    os: "linux",
    arch: "arm64",
    ext: "deb",
    aliases: ["deb-arm64", "debian-arm64"],
    filePatterns: [/.*arm64.*\.deb$/, /.*aarch64.*\.deb$/],
  },
  [PlatformIdentifier.DEBIAN_X64]: {
    os: "linux",
    arch: "x64",
    ext: "deb",
    aliases: ["deb", "debian"],
    filePatterns: [/.*\.deb$/],
  },
  [PlatformIdentifier.FEDORA_ARM64]: {
    os: "linux",
    arch: "arm64",
    ext: "rpm",
    aliases: ["rpm-arm64"],
    filePatterns: [/.*arm64.*\.rpm$/, /.*aarch64.*\.rpm$/],
  },
  [PlatformIdentifier.FEDORA_X64]: {
    os: "linux",
    arch: "x64",
    ext: "rpm",
    aliases: ["fedora", "rpm"],
    filePatterns: [/.*\.rpm$/],
  },
  [PlatformIdentifier.SNAP_ARM64]: {
    os: "linux",
    arch: "arm64",
    ext: "snap",
    aliases: ["snap-arm64"],
    filePatterns: [/.*arm64.*\.snap$/, /.*aarch64.*\.snap$/],
  },
  [PlatformIdentifier.SNAP_X64]: {
    os: "linux",
    arch: "x64",
    ext: "snap",
    aliases: ["snap"],
    filePatterns: [/.*\.snap$/],
  },
};
