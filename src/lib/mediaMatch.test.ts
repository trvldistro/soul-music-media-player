import { describe, expect, it } from "vitest";
import { findSongForVideo, hasSongAndVideo, pickSource, sameTitle } from "./mediaMatch";
import type { Track } from "./types";

function song(partial: Partial<Track> & { rowId: number }): Track {
  return {
    title: "Song",
    artist: "Artist",
    album: "",
    genre: "Soul",
    duration: 100,
    audioUrl: "/music/song.wav",
    coverUrl: "",
    isDemo: false,
    mediaKind: "audio",
    youtubeId: "",
    videoUrl: "",
    uploaderName: "",
    createdBy: null,
    editState: "editable",
    editedAt: null,
    moderationStatus: "verified",
    moderationNote: null,
    removedAt: null,
    createdAt: 0,
    ...partial,
  };
}

// @kliv-spec-derived — from intent: "sync a music video to a song with the same name, matched like artist names"
describe("sameTitle", () => {
  it("matches titles that read the same", () => {
    expect(sameTitle("We Do Our Best In This Game", "we do our best in this game!")).toBe(true);
    expect(sameTitle("Testify", "TESTIFY")).toBe(true);
  });

  it("keeps genuinely different titles apart", () => {
    expect(sameTitle("Testify", "Testify (Live)")).toBe(false);
    expect(sameTitle("Testify", "")).toBe(false);
  });
});

describe("findSongForVideo", () => {
  it("finds the song with the same artist and title", () => {
    const library = [song({ rowId: 1, title: "Testify", artist: "The Mighty Clouds" })];
    expect(findSongForVideo(library, "the mighty clouds", "TESTIFY!")?.rowId).toBe(1);
  });

  it("prefers a matching song that has no video yet", () => {
    const library = [
      song({ rowId: 1, title: "Testify", artist: "The Mighty Clouds", videoUrl: "/videos/old.mp4" }),
      song({ rowId: 2, title: "Testify", artist: "The Mighty Clouds" }),
    ];
    expect(findSongForVideo(library, "The Mighty Clouds", "Testify")?.rowId).toBe(2);
  });

  it("falls back to a match that already has a video", () => {
    const library = [
      song({ rowId: 1, title: "Testify", artist: "The Mighty Clouds", videoUrl: "/videos/old.mp4" }),
    ];
    expect(findSongForVideo(library, "The Mighty Clouds", "Testify")?.rowId).toBe(1);
  });

  it("ignores standalone videos and device songs", () => {
    const library = [
      song({
        rowId: 1,
        title: "Testify",
        artist: "The Mighty Clouds",
        mediaKind: "video",
        videoUrl: "/videos/v.mp4",
      }),
      song({ rowId: -5, title: "Testify", artist: "The Mighty Clouds", devicePath: "/device/x.wav" }),
    ];
    expect(findSongForVideo(library, "The Mighty Clouds", "Testify")).toBeNull();
  });

  it("returns nothing when no song matches", () => {
    expect(findSongForVideo([song({ rowId: 1 })], "Someone Else", "Different Song")).toBeNull();
    expect(findSongForVideo([song({ rowId: 1 })], "", "")).toBeNull();
  });
});

// @kliv-spec-derived — from intent: "the user can switch between the music and the video"
describe("pickSource", () => {
  it("plays audio-only songs as audio whatever the switch says", () => {
    expect(pickSource(song({ rowId: 1, mediaKind: "audio" }), true)).toBe("audio");
    expect(pickSource(song({ rowId: 1, mediaKind: "audio" }), false)).toBe("audio");
  });

  it("plays a song with an attached video through the video only when switched on", () => {
    const dual = song({ rowId: 1, mediaKind: "audio", videoUrl: "/videos/v.mp4" });
    expect(pickSource(dual, false)).toBe("audio");
    expect(pickSource(dual, true)).toBe("video");
  });

  it("always plays standalone music videos as video", () => {
    expect(pickSource(song({ rowId: 1, mediaKind: "video", videoUrl: "/videos/v.mp4" }), false)).toBe("video");
  });

  // @kliv-spec-derived — from user intent: "songs added from YouTube play through YouTube"
  it("plays YouTube songs through YouTube's player whatever the switch says", () => {
    expect(pickSource(song({ rowId: 1, mediaKind: "youtube", youtubeId: "abc123DEF45" }), false)).toBe("youtube");
    expect(pickSource(song({ rowId: 1, mediaKind: "youtube", youtubeId: "abc123DEF45" }), true)).toBe("youtube");
  });
});

describe("hasSongAndVideo", () => {
  it("is true only for songs that have both", () => {
    expect(hasSongAndVideo(song({ rowId: 1, mediaKind: "audio", videoUrl: "/videos/v.mp4" }))).toBe(true);
    expect(hasSongAndVideo(song({ rowId: 1, mediaKind: "audio" }))).toBe(false);
    expect(hasSongAndVideo(song({ rowId: 1, mediaKind: "video", videoUrl: "/videos/v.mp4" }))).toBe(false);
    expect(hasSongAndVideo(song({ rowId: 1, mediaKind: "youtube", youtubeId: "abc123DEF45" }))).toBe(false);
    expect(hasSongAndVideo(null)).toBe(false);
  });
});
