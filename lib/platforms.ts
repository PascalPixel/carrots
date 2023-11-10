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
    name: string;
    platform: "darwin" | "linux" | "win32";
    arch: "arm64" | "ia32" | "x64";
    aliases: string[];
    filePatterns: RegExp[];
  }
> = {
  [PlatformIdentifier.DMG_ARM64]: {
    name: "macOS Apple Silicon",
    platform: "darwin",
    arch: "arm64",
    aliases: ["dmg-arm64"],
    filePatterns: [
      /.*darwin-arm.*\.dmg$/,
      /.*mac-arm.*\.dmg$/,
      /.*osx-arm.*\.dmg$/,
    ],
  },
  [PlatformIdentifier.DMG_X64]: {
    name: "macOS Intel",
    platform: "darwin",
    arch: "x64",
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
    platform: "darwin",
    arch: "arm64",
    aliases: ["darwin-arm64", "mac-arm64", "macos-arm64", "osx-arm64"],
    filePatterns: [
      /.*darwin-arm.*\.zip$/,
      /.*mac-arm.*\.zip$/,
      /.*osx-arm.*\.zip$/,
    ],
  },
  [PlatformIdentifier.DARWIN_X64]: {
    name: "macOS Intel",
    platform: "darwin",
    arch: "x64",
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
    platform: "win32",
    arch: "ia32",
    aliases: ["x86"],
    filePatterns: [/.*win32-ia32.*/],
  },
  [PlatformIdentifier.WIN32_ARM64]: {
    name: "Windows ARM",
    platform: "win32",
    arch: "arm64",
    aliases: [],
    filePatterns: [/.*win32-arm64.*/],
  },
  [PlatformIdentifier.WIN32_X64]: {
    name: "Windows 64-bit",
    platform: "win32",
    arch: "x64",
    aliases: ["exe", "win", "win32", "windows", "win64", "x64"],
    filePatterns: [/.*win32-x64.*/, /.*\.exe$/],
  },
  [PlatformIdentifier.NUPKG]: {
    name: "Windows Update",
    platform: "win32",
    arch: "x64",
    aliases: [],
    filePatterns: [/.*\.nupkg$/],
  },
  [PlatformIdentifier.APPIMAGE_ARM64]: {
    name: "Linux aarch64",
    platform: "linux",
    arch: "arm64",
    aliases: ["appimage-arm64", "linux-arm64"],
    filePatterns: [/.*arm64.*\.appimage$/, /.*aarch64.*\.appimage$/],
  },
  [PlatformIdentifier.APPIMAGE_X64]: {
    name: "Linux x86_64",
    platform: "linux",
    arch: "x64",
    aliases: ["appimage", "linux"],
    filePatterns: [/.*\.appimage$/],
  },
  [PlatformIdentifier.DEBIAN_ARM64]: {
    name: "Linux aarch64",
    platform: "linux",
    arch: "arm64",
    aliases: ["deb-arm64", "debian-arm64"],
    filePatterns: [/.*arm64.*\.deb$/, /.*aarch64.*\.deb$/],
  },
  [PlatformIdentifier.DEBIAN_X64]: {
    name: "Linux x86_64",
    platform: "linux",
    arch: "x64",
    aliases: ["deb", "debian"],
    filePatterns: [/.*\.deb$/],
  },
  [PlatformIdentifier.FEDORA_ARM64]: {
    name: "Linux aarch64",
    platform: "linux",
    arch: "arm64",
    aliases: ["rpm-arm64"],
    filePatterns: [/.*arm64.*\.rpm$/, /.*aarch64.*\.rpm$/],
  },
  [PlatformIdentifier.FEDORA_X64]: {
    name: "Linux x86_64",
    platform: "linux",
    arch: "x64",
    aliases: ["fedora", "rpm"],
    filePatterns: [/.*\.rpm$/],
  },
  [PlatformIdentifier.SNAP_ARM64]: {
    name: "Linux aarch64",
    platform: "linux",
    arch: "arm64",
    aliases: ["snap-arm64"],
    filePatterns: [/.*arm64.*\.snap$/, /.*aarch64.*\.snap$/],
  },
  [PlatformIdentifier.SNAP_X64]: {
    name: "Linux x86_64",
    platform: "linux",
    arch: "x64",
    aliases: ["snap"],
    filePatterns: [/.*\.snap$/],
  },
};
