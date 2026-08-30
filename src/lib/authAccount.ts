export interface ProfileDraft {
  firstName: string;
  lastName: string;
  email: string;
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as UnknownRecord;
}

function stringField(record: UnknownRecord | null, key: string): string {
  const value = record?.[key];
  return typeof value === "string" ? value : "";
}

export function draftFromUser(user: unknown): ProfileDraft {
  const record = asRecord(user);
  return {
    firstName: stringField(record, "firstName"),
    lastName: stringField(record, "lastName"),
    email: stringField(record, "email"),
  };
}

export function readUserMetadata(user: unknown): Record<string, string> {
  const record = asRecord(user);
  if (!record) {
    return {};
  }

  const source = asRecord(record.userMetadata) ?? asRecord(record.metadata);
  if (!source) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(source).filter((entry: [string, unknown]) => typeof entry[1] === "string"),
  ) as Record<string, string>;
}

export function mergeUserMetadata(
  existing: Record<string, string>,
  changes: Record<string, string | null | undefined>,
): Record<string, string> {
  const merged = { ...existing };

  Object.entries(changes).forEach(([key, value]: [string, string | null | undefined]) => {
    if (value === null || value === undefined) {
      delete merged[key];
    } else {
      merged[key] = value;
    }
  });

  return merged;
}

export function validateProfileDraft(draft: ProfileDraft): string | null {
  if (!draft.firstName.trim()) {
    return "Enter your first name";
  }

  const email = draft.email.trim();
  if (!email) {
    return "Enter your email address";
  }

  if (!/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(email)) {
    return "Enter a valid email address";
  }

  return null;
}

export function profileChanges(
  user: unknown,
  draft: ProfileDraft,
): { firstName?: string; lastName?: string; email?: string } | null {
  const current = draftFromUser(user);
  const next = {
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    email: draft.email.trim(),
  };
  const changes: { firstName?: string; lastName?: string; email?: string } = {};

  if (next.firstName !== current.firstName.trim()) {
    changes.firstName = next.firstName;
  }
  if (next.lastName !== current.lastName.trim()) {
    changes.lastName = next.lastName;
  }
  if (next.email !== current.email.trim()) {
    changes.email = next.email;
  }

  return Object.keys(changes).length > 0 ? changes : null;
}

export function accountDisplayName(user: unknown): string {
  const draft = draftFromUser(user);
  const firstName = draft.firstName.trim();
  const lastName = draft.lastName.trim();
  const email = draft.email.trim();

  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  if (firstName) {
    return firstName;
  }
  if (email) {
    return email;
  }
  return "Your account";
}
