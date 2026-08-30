import { describe, expect, it } from "vitest";
import {
  comparePaths,
  deviceKindFor,
  deviceRowIdFor,
  formatBytes,
  isDeviceRowId,
  mergeDeviceFiles,
  parentFolderOf,
  parseMediaFileName,
  type DeviceMediaMeta,
} from "./deviceStorage";

function meta(path: string, overrides: Partial<DeviceMediaMeta> = {}): DeviceMediaMeta {
  return {
    path,
    name: path.split("/").pop() ?? path,
    title: path,
    artist: "",
    album: parentFolderOf(path),
    kind: "audio",
    size: 1024,
    lastModified: 0,
    ...overrides,
  };
}

// @kliv-spec-derived — from user intent: "play the files in the device's
// storage" — a track number must never show up as the song's artist.
describe("parseMediaFileName", () => {
  it("splits 'Artist - Title' into artist and title", () => {
    expect(parseMediaFileName("Adele - Hello.mp3")).toEqual({
      artist: "Adele",
      title: "Hello",
    });
  });

  it("strips a leading track number before an artist", () => {
    expect(parseMediaFileName("02 - Marvin Gaye - Got To Give It Up.flac")).toEqual({
      artist: "Marvin Gaye",
      title: "Got To Give It Up",
    });
  });

  it("treats '01 - Song' as a title with no artist", () => {
    expect(parseMediaFileName("01 - Lovin You.mp3")).toEqual({
      artist: "",
      title: "Lovin You",
    });
  });

  it("cleans underscores and a bare track number", () => {
    expect(parseMediaFileName("07 Smooth Operator.mp3")).toEqual({
      artist: "",
      title: "Smooth Operator",
    });
    expect(parseMediaFileName("my_song.wav").title).toBe("my song");
  });
});

describe("deviceKindFor", () => {
  it("recognises audio and video by extension when the type is empty", () => {
    expect(deviceKindFor({ name: "song.flac", type: "" })).toBe("audio");
    expect(deviceKindFor({ name: "clip.webm", type: "" })).toBe("video");
  });

  it("trusts the MIME type when present", () => {
    expect(deviceKindFor({ name: "weird.bin", type: "audio/mpeg" })).toBe("audio");
  });

  it("rejects files it cannot play", () => {
    expect(deviceKindFor({ name: "cover.wmf", type: "" })).toBeNull();
    expect(deviceKindFor({ name: "notes.txt", type: "text/plain" })).toBeNull();
  });
});

describe("parentFolderOf", () => {
  it("returns the containing folder", () => {
    expect(parentFolderOf("Soul/Aretha/01.mp3")).toBe("Aretha");
  });

  it("returns '' for a file at the root", () => {
    expect(parentFolderOf("01.mp3")).toBe("");
  });
});

describe("comparePaths", () => {
  it("orders numerically so 2 comes before 10", () => {
    const sorted = ["a/10.mp3", "a/2.mp3", "a/1.mp3"].sort(comparePaths);
    expect(sorted).toEqual(["a/1.mp3", "a/2.mp3", "a/10.mp3"]);
  });
});

describe("formatBytes", () => {
  it("formats bytes up to gigabytes", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(formatBytes(3.5 * 1024 * 1024 * 1024)).toBe("3.5 GB");
  });
});

describe("mergeDeviceFiles", () => {
  it("lists picked files and folder files without duplicates", () => {
    const merged = mergeDeviceFiles(
      [meta("Music/both.mp3", { size: 2048 }), meta("Picked/only-picked.mp3")],
      [meta("Music/only-folder.mp3"), meta("Music/both.mp3", { size: 4096 })],
    );
    expect(merged.map((m) => m.path)).toEqual([
      "Music/both.mp3",
      "Music/only-folder.mp3",
      "Picked/only-picked.mp3",
    ]);
    // the picked copy wins when the same path exists in both sources
    expect(merged.find((m) => m.path === "Music/both.mp3")?.size).toBe(2048);
  });
});

describe("deviceRowIdFor", () => {
  it("gives every device path a stable id far below database ids", () => {
    const a = deviceRowIdFor("Music/a.mp3");
    expect(deviceRowIdFor("Music/a.mp3")).toBe(a);
    expect(isDeviceRowId(a)).toBe(true);
    expect(isDeviceRowId(1)).toBe(false);
  });
});
