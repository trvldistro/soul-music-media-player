import type { ArtistProfile } from "./types";

/**
 * One artist, one page: names are compared after normalization, so spelling
 * variants that read the same — case, accents, punctuation, stray spaces, the
 * odd "&" versus "and" — all resolve to a single existing profile instead of
 * spawning a near-duplicate. A name that differs by even one real letter stays
 * its own artist.
 */
export function normalizeArtistName(raw: string): string {
  return (raw || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

type Named = Pick<ArtistProfile, "name">;

/** The existing profile a typed name belongs to, or undefined for a new artist. */
export function findArtistMatch(name: string, artists: Named[]): Named | undefined {
  const key = normalizeArtistName(name);
  if (!key) return undefined;
  return artists.find((a) => normalizeArtistName(a.name) === key);
}

/**
 * Suggestions while a fan types an artist name: profiles that start with what
 * they typed come first, then ones that contain it. An exact normalized match
 * is excluded — the fan has already typed it.
 */
export function autocompleteArtists<T extends Named>(query: string, artists: T[], limit = 6): T[] {
  const q = normalizeArtistName(query);
  if (!q) return [];
  const starts: T[] = [];
  const contains: T[] = [];
  for (const a of artists) {
    const key = normalizeArtistName(a.name);
    if (key === q) continue;
    if (key.startsWith(q)) starts.push(a);
    else if (key.includes(q)) contains.push(a);
  }
  return [...starts, ...contains].slice(0, limit);
}

/** True when the two spellings denote the same artist page. */
export function sameArtist(a: string, b: string): boolean {
  const keyA = normalizeArtistName(a);
  return keyA.length > 0 && keyA === normalizeArtistName(b);
}
