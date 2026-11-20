import functions from "@/lib/shared/kliv-functions.js";
import type { Track } from "./types";
import { artistHandle } from "./artistHandle";

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
 * canonical spelling and its permanent shareable handle, or null when the call
 * could not be made.
 */
export async function ensureArtistProfile(
  name: string,
): Promise<{ name: string; handle: string; created: boolean } | null> {
  try {
    const res = await functions.post<{ name?: string; handle?: string; created?: boolean }>(
      "ensure_artist",
      { name },
    );
    if (!res?.name) return null;
    return {
      name: res.name,
      handle: res.handle || artistHandle(res.name),
      created: res.created === true,
    };
  } catch {
    return null;
  }
}
