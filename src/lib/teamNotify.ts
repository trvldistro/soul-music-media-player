import functions from "@/lib/shared/kliv-functions.js";

/** Team notification emails the app can send. */
export type TeamEmailTemplate = "song_review" | "artist_claim";

/**
 * Prepares template variables: trims, drops empty values, and clamps each to
 * 500 characters so a fan's input can never blow up an email.
 */
export function clampEmailVariables(
  fields: Record<string, string | number | undefined | null>,
): Record<string, string> {
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    const text = value === undefined || value === null ? "" : String(value).trim();
    if (text) clean[key] = text.slice(0, 500);
  }
  return clean;
}

/**
 * Tells the team about an event, fire-and-forget. Notifications are a bonus on
 * top of the app working — any failure is swallowed quietly so a fan's flow
 * (adding a song, filing a claim) is never disturbed.
 */
export async function notifyTeamEmail(
  template: TeamEmailTemplate,
  fields: Record<string, string | number | undefined | null>,
): Promise<void> {
  try {
    await functions.post("team_notify", {
      template,
      variables: clampEmailVariables(fields),
    });
  } catch {
    /* mail is a bonus layer — the app carries on */
  }
}
