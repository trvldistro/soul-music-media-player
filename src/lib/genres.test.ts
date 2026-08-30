import { describe, expect, it } from "vitest";
import { GENRES } from "./genres";

// code-consistent — pins the list the forms and the edit command share
describe("GENRES", () => {
  it("includes the newly requested genres", () => {
    expect(GENRES).toContain("Hip Hop");
    expect(GENRES).toContain("Amapiano");
  });

  it("has no duplicates", () => {
    expect(new Set(GENRES).size).toBe(GENRES.length);
  });

  it("keeps every value within the edit command's 64-character genre limit", () => {
    for (const g of GENRES) {
      expect(g.length).toBeLessThanOrEqual(64);
    }
  });
});
