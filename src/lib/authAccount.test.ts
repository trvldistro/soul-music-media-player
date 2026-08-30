import { describe, expect, it } from "vitest";

import {
  accountDisplayName,
  draftFromUser,
  mergeUserMetadata,
  profileChanges,
  readUserMetadata,
  validateProfileDraft,
  type ProfileDraft,
} from "./authAccount";

const draft: ProfileDraft = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
};

describe("authAccount", () => {
  it("builds a profile draft from string user fields", () => {
    expect(draftFromUser(draft)).toEqual(draft);
  });

  it("uses empty strings for null, undefined, and missing user fields", () => {
    expect(draftFromUser({ firstName: null, lastName: undefined })).toEqual({
      firstName: "",
      lastName: "",
      email: "",
    });
  });

  it("tolerates non-object users and ignores non-string fields", () => {
    expect(draftFromUser(null)).toEqual({ firstName: "", lastName: "", email: "" });
    expect(draftFromUser(undefined)).toEqual({ firstName: "", lastName: "", email: "" });
    expect(draftFromUser("user")).toEqual({ firstName: "", lastName: "", email: "" });
    expect(draftFromUser({ firstName: 42, lastName: false, email: [] })).toEqual({
      firstName: "",
      lastName: "",
      email: "",
    });
  });

  it("reads metadata from the response's userMetadata field", () => {
    expect(readUserMetadata({ userMetadata: { department: "Research" } })).toEqual({
      department: "Research",
    });
  });

  it("falls back to the SDK-declared metadata field", () => {
    expect(readUserMetadata({ metadata: { department: "Research" } })).toEqual({
      department: "Research",
    });
  });

  it("prefers userMetadata over metadata", () => {
    expect(
      readUserMetadata({
        userMetadata: { source: "response" },
        metadata: { source: "sdk" },
      }),
    ).toEqual({ source: "response" });
  });

  it("drops metadata values that are not strings", () => {
    expect(
      readUserMetadata({
        userMetadata: { text: "kept", count: 2, flag: true, empty: null },
      }),
    ).toEqual({ text: "kept" });
  });

  it("returns empty metadata for null, undefined, scalar, and array inputs", () => {
    expect(readUserMetadata(null)).toEqual({});
    expect(readUserMetadata(undefined)).toEqual({});
    expect(readUserMetadata(7)).toEqual({});
    expect(readUserMetadata([])).toEqual({});
    expect(readUserMetadata({ userMetadata: [] })).toEqual({});
  });

  it("preserves untouched metadata keys", () => {
    expect(mergeUserMetadata({ plan: "pro", color: "blue" }, { color: "green" })).toEqual({
      plan: "pro",
      color: "green",
    });
  });

  it("deletes a metadata key changed to null", () => {
    expect(mergeUserMetadata({ plan: "pro", color: "blue" }, { color: null })).toEqual({
      plan: "pro",
    });
  });

  it("deletes a metadata key changed to undefined", () => {
    expect(mergeUserMetadata({ plan: "pro", color: "blue" }, { color: undefined })).toEqual({
      plan: "pro",
    });
  });

  it("overwrites an existing metadata value", () => {
    expect(mergeUserMetadata({ color: "blue" }, { color: "green" })).toEqual({ color: "green" });
  });

  it("does not mutate either metadata input", () => {
    const existing = { plan: "pro", color: "blue" };
    const changes = { color: "green", plan: null };

    const result = mergeUserMetadata(existing, changes);

    expect(result).not.toBe(existing);
    expect(existing).toEqual({ plan: "pro", color: "blue" });
    expect(changes).toEqual({ color: "green", plan: null });
  });

  it("adds a key to an empty existing metadata map", () => {
    expect(mergeUserMetadata({}, { department: "Research" })).toEqual({
      department: "Research",
    });
  });

  it("accepts a valid profile with a last name", () => {
    expect(validateProfileDraft(draft)).toBeNull();
  });

  it("accepts an omitted last name and trims validation inputs", () => {
    expect(
      validateProfileDraft({ firstName: " Ada ", lastName: "", email: " ada@example.com " }),
    ).toBeNull();
  });

  it("requires a first name", () => {
    expect(validateProfileDraft({ ...draft, firstName: "" })).toBe("Enter your first name");
  });

  it("rejects a whitespace-only first name before checking email", () => {
    expect(validateProfileDraft({ ...draft, firstName: "  ", email: "" })).toBe(
      "Enter your first name",
    );
  });

  it("requires an email address", () => {
    expect(validateProfileDraft({ ...draft, email: "  " })).toBe("Enter your email address");
  });

  it("rejects simply malformed email shapes", () => {
    expect(validateProfileDraft({ ...draft, email: "ada" })).toBe("Enter a valid email address");
    expect(validateProfileDraft({ ...draft, email: "ada@example" })).toBe(
      "Enter a valid email address",
    );
    expect(validateProfileDraft({ ...draft, email: "@example.com" })).toBe(
      "Enter a valid email address",
    );
    expect(validateProfileDraft({ ...draft, email: "ada@.com" })).toBe(
      "Enter a valid email address",
    );
    expect(validateProfileDraft({ ...draft, email: "ada@example." })).toBe(
      "Enter a valid email address",
    );
    expect(validateProfileDraft({ ...draft, email: "ada @example.com" })).toBe(
      "Enter a valid email address",
    );
  });

  it("returns null when profile fields are unchanged", () => {
    expect(profileChanges(draft, draft)).toBeNull();
  });

  it("detects a single changed field", () => {
    expect(profileChanges(draft, { ...draft, firstName: "Grace" })).toEqual({
      firstName: "Grace",
    });
  });

  it("trims whitespace-only changes to a no-op", () => {
    expect(
      profileChanges(draft, {
        firstName: " Ada ",
        lastName: " Lovelace ",
        email: " ada@example.com ",
      }),
    ).toBeNull();
  });

  it("returns only changed fields with trimmed values and no extra keys", () => {
    const changes = profileChanges(draft, {
      firstName: " Grace ",
      lastName: " Hopper ",
      email: draft.email,
    });

    expect(changes).toEqual({ firstName: "Grace", lastName: "Hopper" });
    expect(Object.keys(changes ?? {})).toEqual(["firstName", "lastName"]);
  });

  it("treats a missing current last name and an empty draft last name as unchanged", () => {
    expect(
      profileChanges(
        { firstName: "Ada", lastName: null, email: "ada@example.com" },
        { firstName: "Ada", lastName: "", email: "ada@example.com" },
      ),
    ).toBeNull();
  });

  it("compares safely against a missing user", () => {
    expect(profileChanges(null, draft)).toEqual(draft);
  });

  it("uses first and last name as the account display name", () => {
    expect(accountDisplayName(draft)).toBe("Ada Lovelace");
  });

  it("uses the first name when the last name is absent", () => {
    expect(accountDisplayName({ ...draft, lastName: "" })).toBe("Ada");
  });

  it("uses the email when the first name is absent", () => {
    expect(accountDisplayName({ firstName: "", lastName: "", email: draft.email })).toBe(
      "ada@example.com",
    );
  });

  it("falls back to Your account for absent data or a last name alone", () => {
    expect(accountDisplayName(null)).toBe("Your account");
    expect(accountDisplayName({ lastName: "Lovelace" })).toBe("Your account");
  });
});
