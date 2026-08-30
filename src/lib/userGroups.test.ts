import { describe, expect, it } from "vitest";
import { isArtistReviewer, userGroupKeys } from "./userGroups";

describe("userGroupKeys", () => {
  it("reads an array of key strings", () => {
    expect(userGroupKeys({ groups: ["artist_reviewers", "fans"] })).toEqual([
      "artist_reviewers",
      "fans",
    ]);
  });

  it("reads an array of group objects with a key", () => {
    expect(userGroupKeys({ groups: [{ key: "artist_reviewers" }, { key: "team" }] })).toEqual([
      "artist_reviewers",
      "team",
    ]);
  });

  it("normalizes hyphenated keys and display names to the underscore form", () => {
    expect(userGroupKeys({ groups: ["artist-reviewers"] })).toEqual(["artist_reviewers"]);
    expect(userGroupKeys({ groups: [{ name: "Artist Reviewers" }] })).toEqual([
      "artist_reviewers",
    ]);
  });

  it("returns an empty list for anonymous or groupless users", () => {
    expect(userGroupKeys(null)).toEqual([]);
    expect(userGroupKeys({})).toEqual([]);
    expect(userGroupKeys({ groups: undefined })).toEqual([]);
  });
});

describe("isArtistReviewer", () => {
  it("is true for a member of the reviewer group", () => {
    expect(isArtistReviewer({ groups: ["artist_reviewers"] })).toBe(true);
    expect(isArtistReviewer({ groups: [{ key: "artist_reviewers" }] })).toBe(true);
  });

  it("is false for everyone else", () => {
    expect(isArtistReviewer({ groups: ["team-administrators"] })).toBe(false);
    expect(isArtistReviewer(null)).toBe(false);
  });
});
