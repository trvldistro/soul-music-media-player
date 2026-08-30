import { describe, expect, it } from "vitest";
import { formatDuration, formatPlayCount, formatTrackTotal, initials } from "./format";

describe("formatDuration", () => {
  // @kliv-spec-derived — from intent: "show track lengths the way music apps do"
  it("formats minutes and zero-padded seconds", () => {
    expect(formatDuration(83)).toBe("1:23");
    expect(formatDuration(0)).toBe("0:00");
  });

  it("shows hours once a track passes an hour", () => {
    expect(formatDuration(3671)).toBe("1:01:11");
  });

  it("treats unknown durations as zero", () => {
    expect(formatDuration(Number.NaN)).toBe("0:00");
    expect(formatDuration(-5)).toBe("0:00");
  });
});

describe("formatTrackTotal", () => {
  it("pluralizes tracks and minutes", () => {
    expect(formatTrackTotal(1, 59)).toBe("1 track");
    expect(formatTrackTotal(6, 360)).toBe("6 tracks · 6 minutes");
  });
});

describe("initials", () => {
  it("takes the first letters of the first and last word", () => {
    expect(initials("Otis Grey")).toBe("OG");
    expect(initials("Marlena Ray")).toBe("MR");
  });

  it("falls back when there is nothing to draw from", () => {
    expect(initials("   ")).toBe("SM");
  });
});

// @kliv-spec-derived — from user intent: "count how many times a song has been played" —
// the counter must read compactly everywhere it is shown.
describe("formatPlayCount", () => {
  it("shows small counts verbatim", () => {
    expect(formatPlayCount(0)).toBe("0");
    expect(formatPlayCount(7)).toBe("7");
    expect(formatPlayCount(999)).toBe("999");
  });
  it("compacts thousands and millions", () => {
    expect(formatPlayCount(1000)).toBe("1k");
    expect(formatPlayCount(1234)).toBe("1.2k");
    expect(formatPlayCount(2500000)).toBe("2.5M");
  });
  it("never shows negatives or fractions", () => {
    expect(formatPlayCount(-5)).toBe("0");
    expect(formatPlayCount(Number.NaN)).toBe("0");
  });
});
