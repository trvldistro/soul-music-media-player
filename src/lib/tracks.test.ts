import { describe, expect, it } from "vitest";
import { featuredAlbum, filterByGenre, groupAlbums, matchesQuery } from "./tracks";
import type { Track } from "./types";

function track(partial: Partial<Track> & { title: string; artist: string }): Track {
  return {
    rowId: Math.floor(Math.random() * 1e6),
    album: "",
    genre: "Soul",
    duration: 100,
    audioUrl: "/music/x.wav",
    coverUrl: "",
    isDemo: true,
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

describe("groupAlbums", () => {
  // @kliv-spec-derived — from intent: "the library groups tracks into albums"
  it("groups tracks that share album and artist", () => {
    const albums = groupAlbums([
      track({ title: "A", artist: "Otis Grey", album: "After Hours" }),
      track({ title: "B", artist: "Marlena Ray", album: "Golden Hour" }),
      track({ title: "C", artist: "Otis Grey", album: "After Hours" }),
    ]);
    expect(albums).toHaveLength(2);
    expect(albums[0]?.tracks).toHaveLength(2);
    expect(albums[1]?.name).toBe("Golden Hour");
  });

  it("does not merge same-named albums by different artists", () => {
    const albums = groupAlbums([
      track({ title: "A", artist: "One", album: "Greatest" }),
      track({ title: "B", artist: "Two", album: "Greatest" }),
    ]);
    expect(albums).toHaveLength(2);
  });
});

describe("matchesQuery", () => {
  // @kliv-spec-derived — from intent: "search finds songs by artist, title or album"
  it("matches case-insensitively across fields", () => {
    const t = track({ title: "Midnight in Memphis", artist: "The Soul Section", album: "Deep South Soul" });
    expect(matchesQuery(t, "memphis")).toBe(true);
    expect(matchesQuery(t, "SOUL SECTION")).toBe(true);
    expect(matchesQuery(t, "deep south")).toBe(true);
    expect(matchesQuery(t, "zzz")).toBe(false);
  });

  it("matches everything for a blank query", () => {
    expect(matchesQuery(track({ title: "X", artist: "Y" }), "   ")).toBe(true);
  });
});

describe("filterByGenre", () => {
  it("filters by exact genre and passes all when null", () => {
    const list = [
      track({ title: "A", artist: "X", genre: "Funk" }),
      track({ title: "B", artist: "X", genre: "Soul" }),
    ];
    expect(filterByGenre(list, "Funk")).toHaveLength(1);
    expect(filterByGenre(list, null)).toHaveLength(2);
  });
});

describe("featuredAlbum", () => {
  it("picks the album with the most tracks", () => {
    const big = { key: "a", name: "A", artist: "X", coverUrl: "", tracks: [1, 2, 3] } as never;
    const small = { key: "b", name: "B", artist: "Y", coverUrl: "", tracks: [1] } as never;
    expect(featuredAlbum([small, big])?.name).toBe("A");
    expect(featuredAlbum([])).toBeNull();
  });
});
