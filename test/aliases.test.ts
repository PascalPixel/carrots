import { checkAlias } from "../src/lib/aliases.js";

describe("aliases", () => {
  it("should return the correct platform", () => {
    const result = checkAlias("mac");
    expect(result).toBe("darwin");
  });

  it("should return the platform when the platform is provided", () => {
    const result = checkAlias("darwin");
    expect(result).toBe("darwin");
  });

  it("should return false if no platform is found", () => {
    const result = checkAlias("test");
    expect(result).toBe(null);
  });
});