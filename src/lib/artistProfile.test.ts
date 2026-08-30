import { describe, expect, it } from "vitest";
import {
  BIO_MAX_LENGTH,
  isHttpUrl,
  isKnownPlatform,
  linkLabel,
  parseLinks,
  sanitizeBio,
  sanitizeLinks,
  selectArtistExtra,
  serializeLinks,
} from "./artistProfile";

// @kliv-spec-derived — from user intent: "bio, social links, streaming links,
// profile pics — all optional". A profile with nothing filled in is valid, and
// anything stored must come back clean.
describe("artist profile links", () => {
  it("round-trips links through storage", () => {
    const links = [
      { platform: "spotify", url: "https://open.spotify.com/artist/123" },
      { platform: "instagram", url: "https://instagram.com/lill33" },
    ];
    expect(parseLinks(serializeLinks(links))).toEqual(links);
  });

  it("drops malformed stored entries instead of trusting them", () => {
    const stored = JSON.stringify([
      { platform: "spotify", url: "https://open.spotify.com/x" },
      { platform: "javascript:", url: "alert(1)" },
      { platform: "not-a-platform", url: "https://example.com" },
      "nonsense",
    ]);
    expect(parseLinks(stored)).toEqual([{ platform: "spotify", url: "https://open.spotify.com/x" }]);
  });

  it("treats corrupt JSON as no links rather than an error", () => {
    expect(parseLinks("{oops")).toEqual([]);
    expect(parseLinks(null)).toEqual([]);
  });

  it("keeps one link per platform, the newest winning", () => {
    expect(
      sanitizeLinks([
        { platform: "spotify", url: "https://old.example" },
        { platform: "spotify", url: "https://new.example" },
        { platform: "boomplay", url: "https://boomplay.com/x" },
      ]),
    ).toEqual([
      { platform: "spotify", url: "https://new.example" },
      { platform: "boomplay", url: "https://boomplay.com/x" },
    ]);
  });

  it("drops links whose address is not a full web URL", () => {
    expect(
      sanitizeLinks([
        { platform: "spotify", url: "open.spotify.com/artist/1" },
        { platform: "instagram", url: "https://instagram.com/x" },
      ]),
    ).toEqual([{ platform: "instagram", url: "https://instagram.com/x" }]);
  });
});

describe("artist profile helpers", () => {
  it("accepts full http(s) URLs only", () => {
    expect(isHttpUrl("https://example.com")).toBe(true);
    expect(isHttpUrl("http://example.com/a?b=c")).toBe(true);
    expect(isHttpUrl("example.com")).toBe(false);
    expect(isHttpUrl("ftp://example.com")).toBe(false);
    expect(isHttpUrl("")).toBe(false);
  });

  it("knows the supported platforms and their labels", () => {
    expect(isKnownPlatform("boomplay")).toBe(true);
    expect(isKnownPlatform("myspace")).toBe(false);
    expect(linkLabel("apple_music")).toBe("Apple Music");
  });

  it("trims and caps the bio", () => {
    expect(sanitizeBio("  hello  ")).toBe("hello");
    expect(sanitizeBio("x".repeat(BIO_MAX_LENGTH + 50))).toHaveLength(BIO_MAX_LENGTH);
  });
});

// @kliv-spec-derived — from user intent: only the verified artist's own
// profile content may appear on their page.
describe("which profile row displays on an artist page", () => {
  const extras = [
    { name: "Lil L33", createdBy: "uuid-claimant", bio: "the real one" },
    { name: "Lil L33", createdBy: "uuid-fan", bio: "fake bio" },
  ];

  it("shows the verified claimant's row", () => {
    const shown = selectArtistExtra(extras, { name: "Lil L33", status: "claimed", claimantUuid: "uuid-claimant" });
    expect(shown?.bio).toBe("the real one");
  });

  it("never shows anyone else's row for a verified profile", () => {
    const shown = selectArtistExtra(extras, { name: "lil l33", status: "claimed", claimantUuid: "uuid-other" });
    expect(shown).toBeNull();
  });

  it("shows nothing while a profile is unclaimed or under review", () => {
    expect(selectArtistExtra(extras, { name: "Lil L33", status: "unclaimed", claimantUuid: null })).toBeNull();
    expect(
      selectArtistExtra(extras, { name: "Lil L33", status: "pending", claimantUuid: "uuid-claimant" }),
    ).toBeNull();
  });
});
