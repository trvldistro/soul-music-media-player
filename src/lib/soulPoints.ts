import functions from "@/lib/shared/kliv-functions.js";

export type SoulAwardKind = "track" | "lyrics" | "lyrics_sync";

/** Soul Points earned per contribution. Mirrors the server-side award rules. */
export const SOUL_POINTS: Record<SoulAwardKind, number> = {
  track: 50,
  lyrics: 10,
  lyrics_sync: 15,
};

export interface AwardResult {
  /** Points credited by this call (0 when the contribution already earned its award). */
  awarded: number;
}

/**
 * Claims the Soul Points for a real contribution. The server verifies the
 * contribution exists and belongs to the caller, and credits each one at most
 * once — so this never throws and never double-awards.
 */
export async function awardSoulPoints(kind: SoulAwardKind, refId: number): Promise<AwardResult> {
  try {
    const res = await functions.post<{ awarded?: boolean }>("award_soul_points", {
      kind,
      ref_id: refId,
    });
    return { awarded: res?.awarded ? SOUL_POINTS[kind] : 0 };
  } catch {
    // Points are a bonus, never a blocker — silently skip on transport failure.
    return { awarded: 0 };
  }
}
