import { describe, expect, it } from "vitest";
import { autocompleteArtists, findArtistMatch, normalizeArtistName, sameArtist } from "./artistMatch";

const profiles = [{ name: "Lil L33" }, { name: "The Mighty Clouds" }, { name: "Marvin & The Soulmen" }];

// @kliv-spec-derived — from user intent: "if the artist name has the same spelling typos and
// name it's the same page; if they miss one typo even a bit it's a new profile" — spelling
// variants that read the same resolve to one page; a genuinely different name stays separate.
describe("normalizeArtistName", () => {
  it("treats case, accents, punctuation and spacing differences as the same name", () => {
    expect(normalizeArtistName("Lil L33")).toBe("lil l33");
    expect(normalizeArtistName("  lil   l33 ")).toBe("lil l33");
    expect(normalizeArtistName("Lil-L33")).toBe("lil l33");
    expect(normalizeArtistName("LIL_L33!")).toBe("lil l33");
    expect(normalizeArtistName("Marvin & The Soulmen")).toBe("marvin and the soulmen");
    expect(normalizeArtistName("Marvin and the Soulmen")).toBe("marvin and the soulmen");
  });

  it("keeps genuinely different names different", () => {
    expect(normalizeArtistName("Lil L33")).not.toBe(normalizeArtistName("Lil L34"));
    expect(normalizeArtistName("The Mighty Clouds")).not.toBe(normalizeArtistName("Mighty Clouds Jr"));
  });
});

describe("findArtistMatch", () => {
  it("maps a differently-typed spelling onto the existing profile", () => {
    expect(findArtistMatch("lil l33", profiles)?.name).toBe("Lil L33");
    expect(findArtistMatch("LIL_L33", profiles)?.name).toBe("Lil L33");
  });

  it("returns nothing for a new artist or blank input", () => {
    expect(findArtistMatch("Brand New Act", profiles)).toBeUndefined();
    expect(findArtistMatch("   ", profiles)).toBeUndefined();
  });
});

describe("sameArtist", () => {
  it("is true for spelling variants and false otherwise", () => {
    expect(sameArtist("lil l33", "Lil L33")).toBe(true);
    expect(sameArtist("lil l34", "Lil L33")).toBe(false);
    expect(sameArtist("", "Lil L33")).toBe(false);
  });
});

// @kliv-spec-derived — from user intent: "when they type their artist name it shows all the
// artists in our database that have the same first spelling" — prefix matches come first.
describe("autocompleteArtists", () => {
  const many = [
    { name: "Marvin Gaye" },
    { name: "Martha & The Vandellas" },
    { name: "Aretha Franklin" },
    { name: "The Marvelettes" },
  ];

  it("suggests artists that start with the typed text, then ones containing it", () => {
    const results = autocompleteArtists("mar", many, 3);
    expect(results.map((a) => a.name)).toEqual([
      "Marvin Gaye",
      "Martha & The Vandellas",
      "The Marvelettes",
    ]);
  });

  it("suggests nothing for blank input or an exact normalized match", () => {
    expect(autocompleteArtists("", many)).toEqual([]);
    expect(autocompleteArtists("Marvin Gaye", many)).toEqual([]);
    expect(autocompleteArtists("marvin gaye ", many)).toEqual([]);
  });

  it("limits the suggestion count", () => {
    expect(autocompleteArtists("a", many, 2)).toHaveLength(2);
  });
});
