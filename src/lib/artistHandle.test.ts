import { describe, expect, it } from "vitest";
import {
  artistHandle,
  artistMatchesText,
  artistPath,
  artistShareLink,
  buildArtistListing,
  searchArtistListing,
} from "./artistHandle";
import type { ArtistProfile } from "./types";

function profile(name: string, status: ArtistProfile["status"] = "unclaimed", handle = ""): ArtistProfile {
  return {
    rowId: 1,
    name,
    status,
    claimantUuid: null,
    claimEvidence: "",
    claimLink: "",
    claimedAt: null,
    handle,
    aliases: [],
  };
}

// @kliv-spec-derived — from intent: "make a dedicated link for every artist you can share"
describe("artist handles", () => {
  it("builds a stable, link-safe handle from a stage name", () => {
    expect(artistHandle("Lil L33")).toBe("lil-l33");
    expect(artistHandle("  Offset  ")).toBe("offset");
    expect(artistHandle("6ix9ine")).toBe("6ix9ine");
    expect(artistHandle("T.R.E.S.O.R")).toBe("t-r-e-s-o-r");
    expect(artistHandle("Trésor")).toBe("tresor");
    expect(artistHandle("!!!")).toBe("artist");
  });

  it("gives the same link for spellings that read the same", () => {
    expect(artistPath("Lil L33")).toBe(artistPath("lil l33"));
    expect(artistShareLink("https://soul.example/", "Lil L33")).toBe("https://soul.example/artist/lil-l33");
  });
});

// @kliv-spec-derived — from intent: "when they search an artist it shows a list of all the artists we have"
describe("artist directory", () => {
  const artists = [profile("Lil L33", "claimed", "lil-l33"), profile("Drake"), profile("Drakeo"), profile("Rihanna")];
  const tracks = [
    { artist: "Lil L33" },
    { artist: "lil l33" },
    { artist: "Drake" },
    { artist: "Rihanna" },
    { artist: "Rihanna" },
    { artist: "Rihanna" },
  ];

  it("counts songs per artist ignoring spelling variants", () => {
    const listing = buildArtistListing(artists, tracks);
    const byName = Object.fromEntries(listing.map((l) => [l.profile.name, l.songCount]));
    expect(byName["Lil L33"]).toBe(2);
    expect(byName["Drake"]).toBe(1);
    expect(byName["Rihanna"]).toBe(3);
    expect(byName["Drakeo"]).toBe(0);
  });

  it("lists every profile, even one with no songs", () => {
    expect(buildArtistListing(artists, tracks)).toHaveLength(4);
  });

  it("searches by name, handle or spelling variant and puts verified first", () => {
    const listing = buildArtistListing(artists, tracks);
    const results = searchArtistListing(listing, "lil");
    expect(results.map((r) => r.profile.name)).toEqual(["Lil L33"]);
    expect(searchArtistListing(listing, "@drake").map((r) => r.profile.name)).toEqual(["Drake", "Drakeo"]);
    expect(searchArtistListing(listing, "")[0].profile.status).toBe("claimed");
    expect(searchArtistListing(listing, "nobody")).toEqual([]);
  });

  it("matches an alias once one is set", () => {
    const withAlias = { ...profile("Lil L33", "claimed", "lil-l33"), aliases: ["Lil Lee"] };
    expect(artistMatchesText(withAlias, "lil lee")).toBe(true);
    expect(artistMatchesText(withAlias, "lil-l33")).toBe(true);
    expect(artistMatchesText(withAlias, "unrelated")).toBe(false);
  });
});
