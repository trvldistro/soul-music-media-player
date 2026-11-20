import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/shared/kliv-functions.js", () => ({
  default: { post: vi.fn(async () => ({})) },
}));

import functions from "@/lib/shared/kliv-functions.js";
import { clampEmailVariables, notifyTeamEmail } from "./teamNotify";

// @kliv-spec-derived — from user intent: "automated, fully customizable
// emails" — a fan's event must reach the sender with its facts intact.
describe("clampEmailVariables", () => {
  it("keeps the facts of an event as clean template variables", () => {
    expect(
      clampEmailVariables({ title: " Respect ", artist: "Aretha Franklin", code: 7 }),
    ).toEqual({ title: "Respect", artist: "Aretha Franklin", code: "7" });
  });

  it("drops empty values so emails never show blank lines", () => {
    expect(clampEmailVariables({ album: "", source: undefined, proofLink: null })).toEqual({});
  });

  it("clamps each value so long input cannot blow up an email", () => {
    const clamped = clampEmailVariables({ evidence: "E".repeat(2000) });
    expect(clamped.evidence?.length).toBe(500);
  });
});

// @kliv-spec-derived — from user intent: notifications are a bonus layer, so
// a fan's flow must never fail because of them.
describe("notifyTeamEmail", () => {
  beforeEach(() => {
    vi.mocked(functions.post).mockClear();
  });

  it("sends the event to the team sender with cleaned variables", async () => {
    await notifyTeamEmail("song_review", { title: "Respect", artist: "Aretha Franklin", album: "" });
    expect(functions.post).toHaveBeenCalledWith("team_notify", {
      template: "song_review",
      variables: { title: "Respect", artist: "Aretha Franklin" },
    });
  });

  it("stays silent when the sender is unreachable", async () => {
    vi.mocked(functions.post).mockRejectedValueOnce(new Error("down"));
    await expect(
      notifyTeamEmail("artist_claim", { artist: "Lil L33", evidence: "It's me" }),
    ).resolves.toBeUndefined();
  });
});
