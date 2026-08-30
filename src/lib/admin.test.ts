import { describe, expect, it } from "vitest";
import {
  ADMIN_EMAIL,
  isAdminEmail,
  mapModerationStatus,
  moderationLabel,
  trackIsVisible,
} from "./admin";

describe("isAdminEmail", () => {
  // @kliv-spec-derived — from user intent: "restrict access strictly to lill33.scarlett@gmail.com"
  it("accepts only the authorized admin email", () => {
    expect(isAdminEmail(ADMIN_EMAIL)).toBe(true);
    expect(isAdminEmail("lill33.scarlett@gmail.com")).toBe(true);
    expect(isAdminEmail("someone.else@gmail.com")).toBe(false);
    expect(isAdminEmail("lill33.scarlett@gmail.com.evil.com")).toBe(false);
  });

  it("tolerates case and stray whitespace but not other mailboxes", () => {
    expect(isAdminEmail("  LILL33.Scarlett@Gmail.com ")).toBe(true);
    expect(isAdminEmail("trvldistro@gmail.com")).toBe(false);
  });

  it("denies missing identities", () => {
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
    expect(isAdminEmail("")).toBe(false);
  });
});

describe("mapModerationStatus", () => {
  // @kliv-spec-derived — from user intent: new uploads are flagged Unverified
  it("maps known statuses and defaults unknown values to unverified", () => {
    expect(mapModerationStatus("verified")).toBe("verified");
    expect(mapModerationStatus("removed")).toBe("removed");
    expect(mapModerationStatus("unverified")).toBe("unverified");
    expect(mapModerationStatus(null)).toBe("unverified");
    expect(mapModerationStatus("whatever")).toBe("unverified");
  });
});

describe("trackIsVisible", () => {
  // @kliv-spec-derived — from user intent: taken-down songs leave the site
  it("hides only taken-down tracks", () => {
    expect(trackIsVisible("unverified")).toBe(true);
    expect(trackIsVisible("verified")).toBe(true);
    expect(trackIsVisible("removed")).toBe(false);
  });
});

describe("moderationLabel", () => {
  it("labels each status for chips", () => {
    expect(moderationLabel("unverified")).toBe("Unverified");
    expect(moderationLabel("verified")).toBe("Verified");
    expect(moderationLabel("removed")).toBe("Taken down");
  });
});
