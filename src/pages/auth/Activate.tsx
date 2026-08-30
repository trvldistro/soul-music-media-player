import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import auth from "@/lib/shared/kliv-auth.js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ActivationInfo {
  email: string;
  firstName: string | null;
  lastName: string | null;
  requiresPassword: boolean;
  isEmailChange: boolean;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "ready"; info: ActivationInfo }
  | { kind: "invalid"; reason: string };

export default function Activate() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";

  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setState({ kind: "invalid", reason: "This activation link is missing its token." });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const info = (await auth.getActivationInfo(token)) as ActivationInfo;
        if (!cancelled) setState({ kind: "ready", info });
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setState({
          kind: "invalid",
          reason: msg.includes("invalid_token")
            ? "This activation link has expired or already been used."
            : "Couldn't load activation details. Please try again.",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await auth.activate(
        token,
        state.kind === "ready" && state.info.requiresPassword ? password : null,
      );
      // result is a user (new account → auto-signed-in) or
      // { message, status } (email change confirmation).
      if (result && typeof result === "object" && "userUuid" in result) {
        navigate("/", { replace: true });
      } else {
        navigate("/signin", {
          replace: true,
          state: { message: "Email confirmed. You can sign in now." },
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("invalid_token")) {
        setError("This activation link has expired or already been used.");
      } else if (msg.includes("password_required")) {
        setError("A password is required to activate this account.");
      } else if (msg.includes("insufficient_password_complexity")) {
        setError("Password is too weak. Use at least 8 characters and avoid common passwords.");
      } else if (msg.includes("email_exists")) {
        setError("That email is already in use. Try signing in instead.");
      } else {
        setError("Activation failed. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (state.kind === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 text-sm text-muted-foreground">
        Verifying your activation link…
      </div>
    );
  }

  if (state.kind === "invalid") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle>Activation link not valid</CardTitle>
            <CardDescription>{state.reason}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/signin">Back to sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { info } = state;
  const heading = info.isEmailChange ? "Confirm your new email" : "Activate your account";
  const description = info.isEmailChange
    ? `Confirm the change to ${info.email}.`
    : `Welcome${info.firstName ? `, ${info.firstName}` : ""}! Activate your account for ${info.email}.`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{heading}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {info.requiresPassword && (
              <div className="space-y-2">
                <Label htmlFor="password">Choose a password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">At least 8 characters.</p>
              </div>
            )}
            {error && (
              <p className="text-sm text-destructive" role="alert">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Activating…" : info.isEmailChange ? "Confirm email" : "Activate account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
