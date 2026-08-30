import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import auth from "@/lib/shared/kliv-auth.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PasswordResetRequest() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await auth.requestPasswordReset(email);
      // Backend returns 200 for any email (enumeration protection). Always
      // show the same generic confirmation so the UI doesn't leak whether
      // the address is registered.
      setSent(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("email_rate_limit_exceeded")) {
        setError("Too many reset requests. Please wait a few minutes before trying again.");
      } else if (msg.includes("email_template_not_configured")) {
        setError("Password reset email isn't configured yet. Contact support.");
      } else {
        setError("Couldn't send the reset email. Please try again shortly.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>
            Enter your email and we'll send you a link to set a new password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <div className="space-y-4">
              <p className="text-sm">
                If an account exists for <span className="font-medium">{email}</span>, a
                password reset link has been sent. Check your inbox (and spam folder).
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/signin">Back to sign in</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {error && (
                <p className="text-sm text-destructive" role="alert">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Sending…" : "Send reset email"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Remembered it?{" "}
                <Link to="/signin" className="text-foreground underline-offset-4 hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
