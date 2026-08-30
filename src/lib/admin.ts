/** The single account authorized to open /admin. */
export const ADMIN_EMAIL = "lill33.scarlett@gmail.com";

/** Moderation state of a song. New fan uploads always start "unverified". */
export type ModerationStatus = "unverified" | "verified" | "removed";

/** True only for the authorized admin email (case-insensitive, whitespace-tolerant). */
export function isAdminEmail(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === ADMIN_EMAIL;
}

/** Normalizes a raw DB value into a known moderation status. */
export function mapModerationStatus(raw: string | null | undefined): ModerationStatus {
  return raw === "verified" ? "verified" : raw === "removed" ? "removed" : "unverified";
}

/** A track is playable and listed everywhere unless it was taken down. */
export function trackIsVisible(status: ModerationStatus): boolean {
  return status !== "removed";
}

/** Short label for status chips. */
export function moderationLabel(status: ModerationStatus): string {
  return status === "verified" ? "Verified" : status === "removed" ? "Taken down" : "Unverified";
}

/** A take-down is kept for this many days, then deleted permanently, files and all. */
export const TAKEDOWN_GRACE_DAYS = 7;
const DAY_MS = 86_400_000;

/** The moment a taken-down song is due for permanent deletion (Unix ms). */
export function purgeDeadline(removedAt: number): number {
  return removedAt + TAKEDOWN_GRACE_DAYS * DAY_MS;
}

/** Whole days left before a taken-down song is deleted for good (0 = today). */
export function daysUntilPurge(removedAt: number, now = Date.now()): number {
  return Math.max(0, Math.ceil((purgeDeadline(removedAt) - now) / DAY_MS));
}

/** Countdown text for the admin dashboard, e.g. "in 3 days" or "today". */
export function takedownCountdownLabel(removedAt: number, now = Date.now()): string {
  const days = daysUntilPurge(removedAt, now);
  if (days <= 0) return "today";
  return days === 1 ? "in 1 day" : `in ${days} days`;
}

/** True once a take-down passed its grace — the row is due for deletion. */
export function isPastPurgeDeadline(removedAt: number | null, now = Date.now()): boolean {
  return removedAt != null && now >= purgeDeadline(removedAt);
}
