import functions from "@/lib/shared/kliv-functions.js";

export interface AdminUserRecord {
  uuid: string;
  email: string;
  name: string;
  enabled: boolean;
}

export interface AdminBanRecord {
  user_uuid: string;
  user_email: string;
  reason: string;
  banned_by: string | null;
  active: number;
  created_at: number;
}

export interface AdminArtistRecord {
  id: number;
  name: string;
  status: string;
  claimed_at: number | null;
  created_at: number;
  songs: number;
  plays: number;
}

export interface AdminSnapshot {
  users: AdminUserRecord[];
  bans: AdminBanRecord[];
  usersError: string;
  artists: AdminArtistRecord[];
}

export type AdminActionName =
  | "verify_track"
  | "takedown_track"
  | "restore_track"
  | "detach_video"
  | "set_user_password"
  | "ban_user"
  | "unban_user"
  | "approve_claim"
  | "reject_claim";

interface PortalResponse {
  ok?: boolean;
  message?: string;
  error?: string;
}

/** Registered users + ban records. The server refuses anyone but the admin. */
export async function fetchAdminSnapshot(): Promise<AdminSnapshot> {
  const data = await functions.get<Partial<AdminSnapshot>>("moderation_portal");
  return {
    users: Array.isArray(data.users) ? (data.users as AdminUserRecord[]) : [],
    bans: Array.isArray(data.bans) ? (data.bans as AdminBanRecord[]) : [],
    usersError: typeof data.usersError === "string" ? data.usersError : "",
    artists: Array.isArray(data.artists) ? (data.artists as AdminArtistRecord[]) : [],
  };
}

/** Runs one moderation action; throws with the server's reason on refusal. */
export async function runAdminAction(
  action: AdminActionName,
  payload: Record<string, string | number | null> = {},
): Promise<void> {
  let res: PortalResponse | undefined;
  try {
    res = await functions.post<PortalResponse>("moderation_portal", { action, ...payload });
  } catch (e) {
    const fnErr = e as { details?: { message?: string; error?: string }; message?: string };
    throw new Error(
      fnErr?.details?.message || fnErr?.details?.error || fnErr?.message || "The action was refused.",
    );
  }
  if (!res || res.ok !== true) {
    throw new Error(res?.message || res?.error || "The action was refused.");
  }
}
