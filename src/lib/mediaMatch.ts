import { normalizeArtistName, sameArtist } from "./artistMatch";
import type { Track } from "./types";

/**
 * Titles are compared the same way artist names are — case, accents,
 * punctuation and stray spacing ignored — so a video named exactly like the
 * song (in any readable spelling) links to it, while a genuinely different
 * title stays its own thing.
 */
export function sameTitle(a: string, b: string): boolean {
  const keyA = normalizeArtistName(a);
  return keyA.length > 0 && keyA === normalizeArtistName(b);
}

/**
 * The song a music video belongs to: same artist page and same title,
 * library songs only (never standalone videos or device files). A song that
 * already has a video is only returned when every match has one, because the
 * first video attached to a song is the one that stays.
 */
export function findSongForVideo(
  tracks: Track[],
  artist: string,
  title: string,
): Track | null {
  const artistName = artist.trim();
  const songTitle = title.trim();
  if (!artistName || !songTitle) return null;
  const candidates = tracks.filter(
    (track) =>
      track.rowId > 0 &&
      !track.devicePath &&
      track.mediaKind === "audio" &&
      sameArtist(track.artist, artistName) &&
      sameTitle(track.title, songTitle),
  );
  return candidates.find((track) => !track.videoUrl) ?? candidates[0] ?? null;
}

/** Which source plays: YouTube's player, the video element, or the audio element. */
export type PlaySource = "audio" | "video" | "youtube";

/**
 * Which element plays: YouTube's embedded player for songs streamed from
 * YouTube, the video element for real music videos and songs flipped into
 * video mode, the audio element for everything else.
 */
export function pickSource(
  track: Pick<Track, "mediaKind" | "videoUrl" | "youtubeId">,
  videoMode: boolean,
): PlaySource {
  if (track.mediaKind === "youtube" && track.youtubeId) return "youtube";
  if (track.mediaKind === "video") return "video";
  return videoMode && track.videoUrl ? "video" : "audio";
}

/** True when a song has both its audio and an attached video to flip between. */
export function hasSongAndVideo(
  track: Pick<Track, "mediaKind" | "videoUrl"> | null,
): boolean {
  return !!track && track.mediaKind === "audio" && !!track.videoUrl;
}

/** Friendly reasons for a refused video attach, safe to show a fan. */
export function attachRejectionMessage(code: string): string {
  if (code === "PreconditionFailed" || code === "Conflict") {
    return "That song already has a video — the first one stays.";
  }
  if (code === "UnauthorizedPrincipal") {
    return "You need to be signed in to attach a video.";
  }
  if (code === "Overloaded") {
    return "The player is busy — try again in a moment.";
  }
  return "The video couldn't be added to that song.";
}
