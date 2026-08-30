import { describe, expect, it } from "vitest";
import { canEditTrack, editRejectionMessage } from "./trackEdit";

// @kliv-spec-derived — from user intent: "edit the song… only once per person"
describe("canEditTrack", () => {
  const owner = "user-1";
  const song = { createdBy: owner, editState: "editable" as const };

  it("lets the uploader edit while the edit is unused", () => {
    expect(canEditTrack(song, owner)).toBe(true);
  });

  it("blocks editing after the one edit was used", () => {
    expect(canEditTrack({ ...song, editState: "locked" }, owner)).toBe(false);
  });

  it("blocks anyone who is not the uploader", () => {
    expect(canEditTrack(song, "user-2")).toBe(false);
  });

  it("blocks signed-out visitors", () => {
    expect(canEditTrack(song, null)).toBe(false);
  });

  it("blocks songs with no known uploader", () => {
    expect(canEditTrack({ createdBy: null, editState: "editable" }, owner)).toBe(false);
  });
});

// code-consistent — verifies the rejection copy the dialog shows
describe("editRejectionMessage", () => {
  it("explains the edit is spent when the lock rejects the call", () => {
    expect(editRejectionMessage("PreconditionFailed")).toContain("one edit");
  });

  it("says who may edit on an ownership rejection", () => {
    expect(editRejectionMessage("UnauthorizedPrincipal")).toContain("uploaded");
  });
});
