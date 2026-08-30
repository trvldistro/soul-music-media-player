/** Group key that gates artist claim review. */
export const REVIEWER_GROUP = "artist_reviewers";

interface GroupLike {
  key?: unknown;
  name?: unknown;
}

type UserLike = { groups?: unknown } | null | undefined;

/** Normalizes a group key or display name to the underscore form commands use. */
function normalizeGroup(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

/**
 * Extracts group keys from a user object. `groups` may arrive as an array of
 * key strings or as an array of group objects with a `key` or `name`.
 */
export function userGroupKeys(user: UserLike): string[] {
  const groups = user?.groups;
  if (!Array.isArray(groups)) return [];
  const keys: string[] = [];
  for (const g of groups) {
    if (typeof g === "string") {
      const normalized = normalizeGroup(g);
      if (normalized.length > 0) keys.push(normalized);
    } else if (typeof g === "object" && g !== null) {
      const obj = g as GroupLike;
      const raw = typeof obj.key === "string" ? obj.key : typeof obj.name === "string" ? obj.name : "";
      const normalized = normalizeGroup(raw);
      if (normalized.length > 0) keys.push(normalized);
    }
  }
  return keys;
}

/** True when the user may approve or reject artist claims. */
export function isArtistReviewer(user: UserLike): boolean {
  return userGroupKeys(user).includes(REVIEWER_GROUP);
}
