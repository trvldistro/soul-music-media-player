import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, LogOut, Loader2, Shield, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useSoulPoints } from "@/lib/queries";
import { SoulPointsBadge } from "@/components/SoulPointsBadge";
import { accountDisplayName, draftFromUser } from "@/lib/authAccount";

export default function AccountHome() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const soulPoints = useSoulPoints(Boolean(user));
  const displayName = accountDisplayName(user);
  const email = draftFromUser(user).email;

  async function handleSignOut(): Promise<void> {
    await signOut();
    navigate("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <Loader2 aria-label="Loading account" className="animate-spin w-8 h-8 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="border-b bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserRound className="text-blue-600" size={20} />
            <span className="font-semibold">{displayName}</span>
            <SoulPointsBadge points={soulPoints.total} />
          </div>
          <Button variant="ghost" className="gap-2" onClick={handleSignOut}>
            <LogOut size={16} /> Sign out
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your account</h1>
          <p className="mt-2 text-muted-foreground">{email}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            You hold <span className="font-semibold text-foreground">{soulPoints.total} Soul Points</span> — earn
            more by uploading tracks, adding lyrics, and syncing them.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Link to="/account/profile" className="block group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <UserRound className="text-blue-600" size={22} />
                  <ArrowRight className="text-muted-foreground" size={18} />
                </div>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Your name and the email you sign in with.</CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link to="/account/security" className="block group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <Shield className="text-blue-600" size={22} />
                  <ArrowRight className="text-muted-foreground" size={18} />
                </div>
                <CardTitle>Security</CardTitle>
                <CardDescription>
                  Passwords, passkeys, two-factor authentication, and signed-in devices.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </main>
    </div>
  );
}
