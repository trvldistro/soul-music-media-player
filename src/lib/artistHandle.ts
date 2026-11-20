import type { ArtistProfile, Track } from "./types";
import { normalizeArtistName } from "./artistMatch";

/** A line shown under the new-artist box explaining how duplicates are avoided. */
export function sqlSafeAliasNote(): string {
  return "Spelling variants (case, accents, punctuation, & vs and) are treated as the same artist.";
}

/**
 * Every artist profile carries a shareable handle — the part after /artist/ in
 * the link. It is built from the name the same way the server builds it, so a
 * page always finds its artist by handle or by name.
 */

export const HANDLE_MAX = 60;

export function artistHandle(name: string): string {
  return (
    (name || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, HANDLE_MAX) || "artist"
  );
}

/** The shareable path for an artist profile. */
export function artistPath(name: string): string {
  return `/artist/${encodeURIComponent(artistHandle(name))}`;
}

/** Absolute link, so it can be pasted into a message. */
export function artistShareLink(site: string, name: string): string {
  const base = site.replace(/\/+$/, "");
  return `${base}${artistPath(name)}`;
}

/** True when the typed text is one of this artist's aliases or handle. */
export function artistMatchesText(artist: ArtistProfile, text: string): boolean {
  const q = normalizeArtistName(text);
  if (!q) return false;
  if (normalizeArtistName(artist.name).includes(q)) return true;
  const handle = (artist.handle || artistHandle(artist.name)).toLowerCase();
  if (handle.includes(text.trim().toLowerCase().replace(/^@/, ""))) return true;
  return (artist.aliases ?? []).some((alias) => normalizeArtistName(alias).includes(q));
}

/** A profile with its catalogue size, ready to list. */
export interface ArtistListing {
  profile: ArtistProfile;
  songCount: number;
  handle: string;
}

/**
 * All artist profiles, each with how many songs carry that name. Profile rows
 * are the source of truth: an artist with no live songs still gets a page.
 */
export function buildArtistListing(
  artists: ArtistProfile[],
  tracks: Pick<Track, "artist">[],
): ArtistListing[] {
  const counts = new Map<string, number>();
  for (const t of tracks) {
    const key = normalizeArtistName(t.artist);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return artists
    .map((profile) => ({
      profile,
      songCount: counts.get(normalizeArtistName(profile.name)) ?? 0,
      handle: profile.handle || artistHandle(profile.name),
    }))
    .sort((a, b) => a.profile.name.localeCompare(b.profile.name));
}

const VERIFIED_ORDER: Record<string, number> = { claimed: 0, pending: 1, unclaimed: 2 };

/** Listing search: verified first, then by songs, then alphabetically. */
export function searchArtistListing(listing: ArtistListing[], query: string): ArtistListing[] {
  const q = query.trim();
  const matched = q ? listing.filter((l) => artistMatchesText(l.profile, q)) : listing;
  return [...matched].sort(
    (a, b) =>
      (VERIFIED_ORDER[a.profile.status] ?? 3) - (VERIFIED_ORDER[b.profile.status] ?? 3) ||
      b.songCount - a.songCount ||
      a.profile.name.localeCompare(b.profile.name),
  );
}
