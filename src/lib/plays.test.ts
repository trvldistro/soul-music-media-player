import { beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.fn(async () => ({}));

vi.mock("@/lib/shared/kliv-functions.js", () => ({
  default: { post, get: vi.fn(async () => ({})) },
}));

import { ensureArtistProfile, recordPlay } from "./plays";

beforeEach(() => {
  post.mockClear();
});

describe("recordPlay", () => {
  // @kliv-spec-derived — from user intent: "count how many times a song has been played on
  // the platform" — catalogue plays are reported exactly once per start.
  it("reports a catalogue play", async () => {
    await recordPlay({ rowId: 7 });
    expect(post).toHaveBeenCalledWith("record_play", { track_id: 7 });
  });

  it("never reports device-imported files or missing tracks", async () => {
    await recordPlay({ rowId: -1_000_000_005 });
    await recordPlay(null);
    await recordPlay(undefined);
    expect(post).not.toHaveBeenCalled();
  });

  it("swallows transport failures", async () => {
    post.mockRejectedValueOnce(new Error("offline"));
    await expect(recordPlay({ rowId: 3 })).resolves.toBeUndefined();
  });
});

describe("ensureArtistProfile", () => {
  it("returns the server's canonical spelling", async () => {
    post.mockResolvedValueOnce({ name: "Lil L33" });
    await expect(ensureArtistProfile("lil l33")).resolves.toBe("Lil L33");
  });

  it("returns null instead of throwing when the call fails", async () => {
    post.mockRejectedValueOnce(new Error("down"));
    await expect(ensureArtistProfile("New Act")).resolves.toBeNull();
  });
});
