import type { Track } from "./types";

/**
 * A song's details can be corrected only by the signed-in uploader, and only while the song's
 * single allowed edit is still unused. The server enforces the same rule through the
 * edit_track_once command; this mirror only decides what the UI offers.
 */
export function canEditTrack(
  track: Pick<Track, "createdBy" | "editState">,
  userId: string | null | undefined,
): boolean {
  return Boolean(userId) && track.createdBy === userId && track.editState === "editable";
}

/** Friendly copy for the rejections edit_track_once can return. */
export function editRejectionMessage(code: string): string {
  switch (code) {
    case "PreconditionFailed":
      return "You've already used your one edit for this song — the details are locked now.";
    case "UnauthorizedPrincipal":
      return "Only the person who uploaded this song can edit it.";
    case "Conflict":
      return "This song was just edited somewhere else. Refresh and check the details.";
    case "Overloaded":
      return "The player is busy for a second — tap save again.";
    default:
      return "Couldn't save the edit — try again.";
  }
}
