import { describe, expect, it } from "vitest";
import {
  activeLineIndex,
  formatStamp,
  parseLines,
  serializeLines,
  splitLyricsText,
  type LyricLine,
} from "./lyrics";

describe("splitLyricsText", () => {
  // @kliv-spec-derived — from user intent: "paste track lyrics" line-by-line
  it("splits pasted lyrics into trimmed, non-empty lines", () => {
    expect(splitLyricsText("  Keep on keeping on  \n\n\r\nThrough the night\n")).toEqual([
      "Keep on keeping on",
      "Through the night",
    ]);
  });

  it("returns an empty list for blank input", () => {
    expect(splitLyricsText("   \n \n")).toEqual([]);
  });
});

describe("activeLineIndex", () => {
  const lines: LyricLine[] = [
    { t: 4.0, text: "first" },
    { t: 9.5, text: "second" },
    { t: 20.0, text: "third" },
  ];

  // @kliv-spec-derived — karaoke display: the line on screen is the latest stamped line reached
  it("is -1 before the first stamp", () => {
    expect(activeLineIndex(lines, 0)).toBe(-1);
    expect(activeLineIndex(lines, 3.99)).toBe(-1);
  });

  it("highlights a line exactly at its stamp", () => {
    expect(activeLineIndex(lines, 4.0)).toBe(0);
    expect(activeLineIndex(lines, 20.0)).toBe(2);
  });

  it("keeps the earlier line between stamps", () => {
    expect(activeLineIndex(lines, 9.4)).toBe(0);
    expect(activeLineIndex(lines, 19.9)).toBe(1);
  });

  it("holds the last line until the end", () => {
    expect(activeLineIndex(lines, 500)).toBe(2);
  });

  it("handles an empty line list", () => {
    expect(activeLineIndex([], 10)).toBe(-1);
  });
});

describe("parseLines", () => {
  it("round-trips through serializeLines", () => {
    const lines: LyricLine[] = [
      { t: 3.5, text: "a" },
      { t: 7, text: "b" },
    ];
    expect(parseLines(serializeLines(lines))).toEqual(lines);
  });

  it("returns an empty list for invalid JSON", () => {
    expect(parseLines("not json")).toEqual([]);
  });

  it("drops malformed entries and sorts by time", () => {
    const raw = JSON.stringify([
      { t: 12, text: "later" },
      { t: "bad", text: "no time" },
      { t: 2, text: "earlier" },
      { t: 5 },
    ]);
    expect(parseLines(raw)).toEqual([
      { t: 2, text: "earlier" },
      { t: 12, text: "later" },
    ]);
  });

  it("returns [] for a non-array payload", () => {
    expect(parseLines(JSON.stringify({ t: 1, text: "x" }))).toEqual([]);
  });
});

describe("formatStamp", () => {
  it("formats minutes, seconds and tenths", () => {
    expect(formatStamp(65.46)).toBe("1:05.4");
    expect(formatStamp(5)).toBe("0:05.0");
    expect(formatStamp(0)).toBe("0:00.0");
  });
});
