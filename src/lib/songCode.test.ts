import { describe, expect, it } from "vitest";
import { songCode } from "./songCode";
import { matchesQuery } from "./tracks";
import type { Track } from "./types";

function trackWithId(rowId: number): Track {
  return {
    rowId,
    title: "Testify",
    artist: "The Mighty Clouds",
    album: "",
    genre: "Soul",
    duration: 100,
    audioUrl: "/music/x.wav",
    coverUrl: "",
    isDemo: true,
    mediaKind: "audio",
    videoUrl: "",
    uploaderName: "",
    createdBy: null,
    editState: "editable",
    editedAt: null,
    moderationStatus: "verified",
    moderationNote: null,
    removedAt: null,
    createdAt: 0,
  };
}

// @kliv-spec-derived — from intent: "give each song a code that's easy to understand and track down"
describe("song codes", () => {
  it("numbers songs with a short padded code", () => {
    expect(songCode(1)).toBe("SM-0001");
    expect(songCode(7)).toBe("SM-0007");
    expect(songCode(12345)).toBe("SM-12345");
  });

  it("gives no code to songs that live only on a listener's device", () => {
    expect(songCode(-3)).toBe("");
    expect(songCode(0)).toBe("");
  });

  it("searching a code finds that song and not the others", () => {
    const testify = trackWithId(7);
    const groove = trackWithId(8);
    expect(matchesQuery(testify, "sm-0007")).toBe(true);
    expect(matchesQuery(groove, "sm-0007")).toBe(false);
    expect(matchesQuery(testify, "SM-0007")).toBe(true);
  });
});
