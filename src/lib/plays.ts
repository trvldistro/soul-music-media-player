import functions from "@/lib/shared/kliv-functions.js";
import type { Track } from "./types";

/**
 * Reports one play of a catalogue song. Device-imported files (negative row
 * ids) are deliberately skipped: they have no database row and must never
 * touch the server. A failed report never interrupts playback.
 */
export async function recordPlay(track: Pick<Track, "rowId"> | null | undefined): Promise<void> {
  if (!track || track.rowId <= 0) return;
  try {
    await functions.post("record_play", { track_id: track.rowId });
  } catch {
    /* counting is best-effort — never block the music */
  }
}

/**
 * Resolves a typed artist name to its canonical profile server-side, creating
 * an unclaimed profile only when the name is genuinely new. Returns the
 * canonical spelling, or null when the call could not be made.
 */
export async function ensureArtistProfile(name: string): Promise<string | null> {
  try {
    const res = await functions.post<{ name?: string }>("ensure_artist", { name });
    return res?.name ?? null;
  } catch {
    return null;
  }
}
