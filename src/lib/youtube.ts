/**
 * YouTube link and metadata helpers for the add-from-YouTube flow.
 * Everything here runs on the paste the fan typed — no network needed.
 */

const BARE_ID = /^[A-Za-z0-9_-]{11}$/;

/** Pulls the 11-character video id out of any normal YouTube link (or a bare id). */
export function parseYouTubeId(input: string): string | null {
  const text = input.trim();
  if (!text) return null;
  if (BARE_ID.test(text)) return text;
  if (!/youtu\.?be/i.test(text)) return null;
  const watch = text.match(/[?&]v=([A-Za-z0-9_-]{11})/);
  if (watch) return watch[1];
  const short = text.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
  if (short) return short[1];
  const path = text.match(/\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/);
  if (path) return path[1];
  return null;
}

/** The link stored on a track row — where the song officially lives. */
export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/** YouTube's own thumbnail for a video. */
export function youtubeThumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

/** "PT1H2M3S" → 3723 seconds (0 for anything unreadable, e.g. live streams). */
export function parseISODuration(iso: string | null | undefined): number {
  if (!iso) return 0;
  const m = iso.match(/^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!m) return 0;
  const [, d, h, min, s] = m;
  return (Number(d) || 0) * 86400 + (Number(h) || 0) * 3600 + (Number(min) || 0) * 60 + (Number(s) || 0);
}

/** "(Official Video)" and friends — noise nobody wants in a song title. */
const TITLE_NOISE = /\s*[([](?:official\s+)?(?:music\s+)?(?:video|audio|lyrics?|visualizer|hd|4k|mv|hq)[^)\]]*[)\]]/gi;

/** "Aretha Franklin - Topic" → "Aretha Franklin" (YouTube Music's auto-channels). */
export function cleanChannelName(channel: string): string {
  return channel.replace(/\s*-\s*Topic$/i, "").trim();
}

/**
 * Prefills the form from a video's own name: "Artist - Title (Official
 * Video)" becomes { artist: "Artist", title: "Title" }. When there's no
 * dash, the channel name stands in for the artist.
 */
export function splitVideoTitle(raw: string, channel: string): { title: string; artist: string } {
  const cleaned = raw.replace(TITLE_NOISE, "").replace(/\s{2,}/g, " ").trim();
  const parts = cleaned.split(/\s+[-–—]\s+/);
  if (parts.length >= 2) {
    const artist = parts[0].trim();
    const title = parts.slice(1).join(" - ").trim();
    if (artist && title) return { artist, title };
  }
  return { artist: cleanChannelName(channel), title: cleaned };
}
