import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import {
  accountDisplayName,
  draftFromUser,
  profileChanges,
  readUserMetadata,
  validateProfileDraft,
  type ProfileDraft,
} from "@/lib/authAccount";

const EMPTY_DRAFT: ProfileDraft = { firstName: "", lastName: "", email: "" };

export default function ProfilePage() {
  const { user, loading, updateUser, refresh } = useAuth();
  const initialized = useRef(false);
  const [draft, setDraft] = useState<ProfileDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user && !initialized.current) {
      setDraft(draftFromUser(user));
      initialized.current = true;
    }
  }, [loading, user]);

  function updateDraft(field: keyof ProfileDraft, value: string): void {
    setDraft((current: ProfileDraft) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setStatus(null);

    const validationError = validateProfileDraft(draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    const changes = profileChanges(user, draft);
    if (!changes) {
      setStatus("No changes to save.");
      return;
    }

    setSaving(true);
    try {
      await updateUser(changes);
      await refresh();
      setStatus("Profile saved.");
    } catch (caught: unknown) {
      const message = caught instanceof Error ? caught.message : "Update failed";
      setError(`Could not save your profile: ${message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <Loader2 aria-label="Loading profile" className="animate-spin w-8 h-8 text-blue-600" />
      </div>
    );
  }

  const metadata = readUserMetadata(user);
  const metadataEntries = Object.entries(metadata);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/account" className="flex items-center gap-2 text-sm font-medium">
            <ArrowLeft size={18} /> Back to account
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserRound size={18} /> {accountDisplayName(user)}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>

        <Card>
          <CardHeader>
            <CardTitle>Account details</CardTitle>
            <CardDescription>Update the name and email attached to your account.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="profile-first-name">First name</Label>
                <Input
                  id="profile-first-name"
                  autoComplete="given-name"
                  value={draft.firstName}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateDraft("firstName", event.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-last-name">Last name</Label>
                <Input
                  id="profile-last-name"
                  autoComplete="family-name"
                  value={draft.lastName}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateDraft("lastName", event.target.value)
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  type="email"
                  autoComplete="email"
                  value={draft.email}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    updateDraft("email", event.target.value)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Changing your email changes the address you sign in with. It takes effect
                  immediately, and the platform does not send a confirmation message.
                </p>
              </div>

              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
              {status && <p className="text-sm text-green-700">{status}</p>}

              <Button type="submit" disabled={saving}>
                {saving && <Loader2 size={16} className="animate-spin mr-2" />}
                Save changes
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profile details</CardTitle>
            <CardDescription>Additional details supplied by this application.</CardDescription>
          </CardHeader>
          <CardContent>
            {metadataEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No profile details stored yet.</p>
            ) : (
              <dl className="divide-y rounded-lg border bg-white">
                {metadataEntries.map(([key, value]: [string, string]) => (
                  <div key={key} className="grid gap-1 px-4 py-3 sm:grid-cols-3 sm:gap-4">
                    <dt className="text-sm font-medium">{key}</dt>
                    <dd className="text-sm text-muted-foreground sm:col-span-2">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
