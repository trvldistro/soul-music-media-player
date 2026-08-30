import { describe, expect, it } from "vitest";
import {
  daysUntilPurge,
  isPastPurgeDeadline,
  purgeDeadline,
  takedownCountdownLabel,
  TAKEDOWN_GRACE_DAYS,
} from "./admin";

// @kliv-spec-derived — from intent: "when the admin takes music down, it permanently disappears after 7 days"
describe("takedown purge clock", () => {
  const DAY = 86_400_000;
  const now = 1_800_000_000_000;

  it("keeps a take-down for exactly seven days", () => {
    expect(TAKEDOWN_GRACE_DAYS).toBe(7);
    expect(purgeDeadline(now)).toBe(now + 7 * DAY);
  });

  it("counts the days left for the dashboard countdown", () => {
    expect(daysUntilPurge(now, now)).toBe(7);
    expect(daysUntilPurge(now, now + 6.5 * DAY)).toBe(1);
    expect(daysUntilPurge(now, now + 8 * DAY)).toBe(0);
  });

  it("labels the countdown for the admin", () => {
    expect(takedownCountdownLabel(now, now)).toBe("in 7 days");
    expect(takedownCountdownLabel(now, now + 6.5 * DAY)).toBe("in 1 day");
    expect(takedownCountdownLabel(now, now + 7 * DAY)).toBe("today");
  });

  it("is past the deadline only after seven full days", () => {
    expect(isPastPurgeDeadline(now, now + 7 * DAY - 1)).toBe(false);
    expect(isPastPurgeDeadline(now, now + 7 * DAY)).toBe(true);
    expect(isPastPurgeDeadline(null, now + 30 * DAY)).toBe(false);
  });
});
