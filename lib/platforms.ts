import { PlatformIdentifier } from "./index.js";

// Platform information mapping
// Order is important for file to platform matching
export const PLATFORMS: Record<
  PlatformIdentifier,
  {
    name: string;
    aliases: string[];
    filePatterns: RegExp[];
  }
> = {
  [PlatformIdentifier.DMG_ARM64]: {
    name: "macOS Apple Silicon",
    aliases: ["dmg-arm64"],
    filePatterns: [
      /.*darwin-arm.*\.dmg$/,
      /.*mac-arm.*\.dmg$/,
      /.*osx-arm.*\.dmg$/,
    ],
  },
  [PlatformIdentifier.DMG_X64]: {
    name: "macOS Intel",
    aliases: ["dmg"],
    filePatterns: [
      /.*darwin.*\.dmg$/,
      /.*mac.*\.dmg$/,
      /.*osx.*\.dmg$/,
      /.*\.dmg$/,
    ],
  },
  [PlatformIdentifier.DARWIN_ARM64]: {
    name: "macOS Apple Silicon",
    aliases: ["darwin-arm64", "mac-arm64", "macos-arm64", "osx-arm64"],
    filePatterns: [
      /.*darwin-arm.*\.zip$/,
      /.*mac-arm.*\.zip$/,
      /.*osx-arm.*\.zip$/,
    ],
  },
  [PlatformIdentifier.DARWIN_X64]: {
    name: "macOS Intel",
    aliases: ["darwin", "mac", "macos", "osx"],
    filePatterns: [
      /.*darwin.*\.zip$/,
      /.*mac.*\.zip$/,
      /.*osx.*\.zip$/,
      /.*\.zip$/,
    ],
  },
  [PlatformIdentifier.WIN32_IA32]: {
    name: "Windows 32-bit",
    aliases: ["x86"],
    filePatterns: [/.*win32-ia32.*/],
  },
  [PlatformIdentifier.WIN32_ARM64]: {
    name: "Windows ARM",
    aliases: [],
    filePatterns: [/.*win32-arm64.*/],
  },
  [PlatformIdentifier.WIN32_X64]: {
    name: "Windows 64-bit",
    aliases: ["exe", "win", "win32", "windows", "win64", "x64"],
    filePatterns: [/.*win32-x64.*/, /.*\.exe$/],
  },
  [PlatformIdentifier.NUPKG]: {
    name: "Windows Update",
    aliases: [],
    filePatterns: [/.*\.nupkg$/],
  },
  [PlatformIdentifier.APPIMAGE_ARM64]: {
    name: "Linux aarch64",
    aliases: ["appimage-arm64", "linux-arm64"],
    filePatterns: [/.*arm64.*\.appimage$/, /.*aarch64.*\.appimage$/],
  },
  [PlatformIdentifier.APPIMAGE_X64]: {
    name: "Linux x86_64",
    aliases: ["appimage", "linux"],
    filePatterns: [/.*\.appimage$/],
  },
  [PlatformIdentifier.DEBIAN_ARM64]: {
    name: "Linux aarch64",
    aliases: ["deb-arm64", "debian-arm64"],
    filePatterns: [/.*arm64.*\.deb$/, /.*aarch64.*\.deb$/],
  },
  [PlatformIdentifier.DEBIAN_X64]: {
    name: "Linux x86_64",
    aliases: ["deb", "debian"],
    filePatterns: [/.*\.deb$/],
  },
  [PlatformIdentifier.FEDORA_ARM64]: {
    name: "Linux aarch64",
    aliases: ["rpm-arm64"],
    filePatterns: [/.*arm64.*\.rpm$/, /.*aarch64.*\.rpm$/],
  },
  [PlatformIdentifier.FEDORA_X64]: {
    name: "Linux x86_64",
    aliases: ["fedora", "rpm"],
    filePatterns: [/.*\.rpm$/],
  },
  [PlatformIdentifier.SNAP_ARM64]: {
    name: "Linux aarch64",
    aliases: ["snap-arm64"],
    filePatterns: [/.*arm64.*\.snap$/, /.*aarch64.*\.snap$/],
  },
  [PlatformIdentifier.SNAP_X64]: {
    name: "Linux x86_64",
    aliases: ["snap"],
    filePatterns: [/.*\.snap$/],
  },
};
