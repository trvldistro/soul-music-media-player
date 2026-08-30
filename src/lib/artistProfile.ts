export interface ArtistLink {
  platform: string;
  url: string;
}

export interface LinkPlatformDef {
  key: string;
  label: string;
  group: "Social" | "Streaming" | "Other";
}

/** Platforms an artist can pin on their profile, with friendly labels. */
export const LINK_PLATFORMS: LinkPlatformDef[] = [
  { key: "instagram", label: "Instagram", group: "Social" },
  { key: "facebook", label: "Facebook", group: "Social" },
  { key: "x", label: "X (Twitter)", group: "Social" },
  { key: "tiktok", label: "TikTok", group: "Social" },
  { key: "youtube", label: "YouTube", group: "Social" },
  { key: "spotify", label: "Spotify", group: "Streaming" },
  { key: "apple_music", label: "Apple Music", group: "Streaming" },
  { key: "youtube_music", label: "YouTube Music", group: "Streaming" },
  { key: "boomplay", label: "Boomplay", group: "Streaming" },
  { key: "audiomack", label: "Audiomack", group: "Streaming" },
  { key: "deezer", label: "Deezer", group: "Streaming" },
  { key: "tidal", label: "TIDAL", group: "Streaming" },
  { key: "soundcloud", label: "SoundCloud", group: "Streaming" },
  { key: "website", label: "Website", group: "Other" },
];

export const MAX_LINKS = 12;
export const BIO_MAX_LENGTH = 2000;
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;

const PLATFORM_KEYS = new Set(LINK_PLATFORMS.map((p) => p.key));

export function linkLabel(platform: string): string {
  return LINK_PLATFORMS.find((p) => p.key === platform)?.label ?? "Link";
}

export function isKnownPlatform(platform: string): boolean {
  return PLATFORM_KEYS.has(platform);
}

export function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** Parses stored links; anything malformed is dropped rather than trusted. */
export function parseLinks(json: string | null | undefined): ArtistLink[] {
  if (!json) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];
  const out: ArtistLink[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const platform = String((item as Record<string, unknown>).platform ?? "");
    const url = String((item as Record<string, unknown>).url ?? "").trim();
    if (isKnownPlatform(platform) && isHttpUrl(url)) out.push({ platform, url });
  }
  return out.slice(0, MAX_LINKS);
}

export function serializeLinks(links: ArtistLink[]): string {
  return JSON.stringify(links.map((l) => ({ platform: l.platform, url: l.url })));
}

/** One link per platform (the newest wins); unknown platforms and bad URLs drop. */
export function sanitizeLinks(links: ArtistLink[]): ArtistLink[] {
  const byPlatform = new Map<string, ArtistLink>();
  for (const link of links) {
    const platform = String(link?.platform ?? "").trim();
    const url = String(link?.url ?? "").trim();
    if (!isKnownPlatform(platform) || !isHttpUrl(url)) continue;
    byPlatform.set(platform, { platform, url });
  }
  return [...byPlatform.values()].slice(0, MAX_LINKS);
}

export function sanitizeBio(bio: string): string {
  return bio.trim().slice(0, BIO_MAX_LENGTH);
}

/**
 * The profile row allowed to display on an artist page: only the one created
 * by that profile's verified claimant. Rows from anyone else exist but never
 * surface anywhere.
 */
export function selectArtistExtra<T extends { name: string; createdBy: string | null }>(
  extras: T[],
  artist: { name: string; status: string; claimantUuid: string | null },
): T | null {
  if (artist.status !== "claimed" || !artist.claimantUuid) return null;
  const key = artist.name.toLowerCase();
  return extras.find((e) => e.name.toLowerCase() === key && e.createdBy === artist.claimantUuid) ?? null;
}
