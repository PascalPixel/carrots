import http from "http";
import dotenv from "dotenv";
import { listen } from "async-listen";

import { carrots } from "./index.js";

dotenv.config();

let server: http.Server;
let address: URL;
let currentVersion: string;

beforeAll(async () => {
  if (!process.env.ACCOUNT) throw new Error("Missing ACCOUNT");
  if (!process.env.REPOSITORY) throw new Error("Missing REPOSITORY");
  const listener = await carrots({
    account: process.env.ACCOUNT,
    repository: process.env.REPOSITORY,
    token: process.env.TOKEN,
  });
  server = http.createServer(listener);
  address = await listen(server);
  const response = await fetch(`${address}api/semver`);
  const data = await response.json();
  currentVersion = data.version.replace("v", "");
});

afterAll(() => {
  server.close();
});

describe("api", () => {
  it("should give semver", async () => {
    const res = await fetch(`${address}api/semver`);
    expect(res.status).toEqual(200);
    const data = await res.json();
    expect(data.version).toMatch(/\d+\.\d+\.\d+/);
  });

  it("should give assets as json", async () => {
    const res = await fetch(`${address}api/latest`);
    expect(res.status).toEqual(200);
    const data = await res.json();
    expect(data[0].id).toBeDefined();
    expect(data[0].platform).toBeDefined();
    expect(data[0].arch).toBeDefined();
    expect(data[0].version).toBeDefined();
    expect(data[0].date).toBeDefined();
  });
});

describe("html", () => {
  it("should give html for root", async () => {
    const res = await fetch(`${address}`);
    expect(res.status).toEqual(200);
    const text = await res.text();
    expect(text).toContain("<main>");
  });

  it("should throw 404 for favicon", async () => {
    const res = await fetch(`${address}favicon.ico`);
    expect(res.status).toEqual(404);
  });

  it("should resolve robots.txt", async () => {
    const res = await fetch(`${address}robots.txt`);
    expect(res.status).toEqual(200);
  });

  it("should throw 404 for wp-login.php", async () => {
    const res = await fetch(`${address}wp-login.php`);
    expect(res.status).toEqual(404);
  });
});

describe("download", () => {
  it("should give download for windows x64", async () => {
    const res = await fetch(`${address}download/exe`);
    expect(res.status).toEqual(200);
    expect(res.headers.get("content-disposition")).toBe(
      `attachment; filename=horse-${currentVersion}-win32-x64-setup.exe`,
    );
  });

  it("should give download for mac arm", async () => {
    const res = await fetch(`${address}download/darwin_arm64`);
    expect(res.status).toEqual(200);
    expect(res.headers.get("content-disposition")).toBe(
      `attachment; filename=Horse-darwin-arm64-${currentVersion}.zip`,
    );
  });

  it("should give download for mac x64", async () => {
    const res = await fetch(`${address}download/darwin`);
    expect(res.status).toEqual(200);
    expect(res.headers.get("content-disposition")).toBe(
      `attachment; filename=Horse-darwin-x64-${currentVersion}.zip`,
    );
  });

  it("should give download for debian arm", async () => {
    const res = await fetch(`${address}download/deb_arm64`);
    expect(res.status).toEqual(200);
    expect(res.headers.get("content-disposition")).toBe(
      `attachment; filename=horse_${currentVersion}_arm64.deb`,
    );
  });

  it("should give download for debian x64", async () => {
    const res = await fetch(`${address}download/deb`);
    expect(res.status).toEqual(200);
    expect(res.headers.get("content-disposition")).toBe(
      `attachment; filename=horse_${currentVersion}_amd64.deb`,
    );
  });

  it("should give download for red hat arm", async () => {
    const res = await fetch(`${address}download/rpm_arm64`);
    expect(res.status).toEqual(200);
    expect(res.headers.get("content-disposition")).toBe(
      `attachment; filename=horse-${currentVersion}-1.arm64.rpm`,
    );
  });

  it("should give download for red hat x64", async () => {
    const res = await fetch(`${address}download/rpm`);
    expect(res.status).toEqual(200);
    expect(res.headers.get("content-disposition")).toBe(
      `attachment; filename=horse-${currentVersion}-1.x86_64.rpm`,
    );
  });
});

describe("update", () => {
  it("should give nupkg info for an old version of windows x64", async () => {
    const res = await fetch(`${address}update/win32/0.57.0/RELEASES`);
    expect(res.status).toEqual(200);
    const text = await res.text();
    expect(text).toContain(
      ` ${address}download/nupkg/horse-${currentVersion}-full.nupkg `,
    );
  });

  it("should give update download for an old version of windows x64", async () => {
    const res = await fetch(
      `${address}download/nupkg/horse-${currentVersion}-full.nupkg`,
    );
    expect(res.status).toEqual(200);
    expect(res.headers.get("content-disposition")).toBe(
      `attachment; filename=horse-${currentVersion}-full.nupkg`,
    );
  });

  it("should give update for an old version of windows x64", async () => {
    const res = await fetch(`${address}update/win32/0.57.0`);
    expect(res.status).toEqual(200);
    expect(res.headers.get("content-type")).toBe(
      "application/json; charset=utf-8",
    );
    const data = await res.json();
    expect(data.url).toBe(`${address}download/win32`);
  });

  it("should give update for an old version of mac arm", async () => {
    const res = await fetch(`${address}update/darwin_arm64/0.57.0`);
    expect(res.status).toEqual(200);
    expect(res.headers.get("content-type")).toBe(
      "application/json; charset=utf-8",
    );
    const data = await res.json();
    expect(data.url).toBe(`${address}download/darwin_arm64`);
  });

  it("should give update for an old version of mac arm", async () => {
    const res = await fetch(`${address}download/darwin_arm64`);
    expect(res.status).toEqual(200);
    expect(res.headers.get("content-disposition")).toBe(
      `attachment; filename=Horse-darwin-arm64-${currentVersion}.zip`,
    );
  });

  it("should give update for an old version mac x64", async () => {
    const res = await fetch(`${address}update/darwin/0.57.0`);
    expect(res.status).toEqual(200);
    expect(res.headers.get("content-type")).toBe(
      "application/json; charset=utf-8",
    );
    const data = await res.json();
    expect(data.url).toBe(`${address}download/darwin`);
  });

  it("should give update for an old version mac x64", async () => {
    const res = await fetch(`${address}download/darwin`);
    expect(res.status).toEqual(200);
    expect(res.headers.get("content-disposition")).toBe(
      `attachment; filename=Horse-darwin-x64-${currentVersion}.zip`,
    );
  });
});

describe("latest", () => {
  it("should not give update for up-to-date windows x64", async () => {
    const res = await fetch(
      `${address}update/win32/${currentVersion}/RELEASES`,
    );
    expect(res.status).toEqual(204);
  });

  it("should not give update for up-to-date windows x64", async () => {
    const res = await fetch(
      `${address}update/win32/${currentVersion}/releases`,
    );
    expect(res.status).toEqual(204);
  });

  it("should not give update for up-to-date mac arm", async () => {
    const res = await fetch(`${address}update/darwin_arm64/${currentVersion}`);
    expect(res.status).toEqual(204);
  });

  it("should give update for up-to-date mac x64", async () => {
    const res = await fetch(`${address}update/darwin/${currentVersion}`);
    expect(res.status).toEqual(204);
  });
});
