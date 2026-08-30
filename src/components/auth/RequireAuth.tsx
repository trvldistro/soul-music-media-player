import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  children: ReactNode;
  /** Where to send unauthenticated users. Defaults to /login. */
  redirectTo?: string;
}

/**
 * Wrap a route element to require an authenticated user. Unauthenticated users
 * are redirected to `redirectTo` carrying the whole attempted target — pathname
 * AND query string — as a URL-encoded `redirect` parameter, so the sign-in page
 * returns them exactly where they were going even after a reload or in a fresh
 * tab. The same target is repeated in `state.from`, which a sign-in page from an
 * older bundle still reads.
 *
 * This is the single source of truth for auth redirects: a guarded page must not
 * route to the sign-in page itself.
 *
 *   <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
 */
export default function RequireAuth({ children, redirectTo = "/login" }: Props) {
  const { signedIn, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!signedIn) {
    const target = `${location.pathname}${location.search}`;
    const separator = redirectTo.includes("?") ? "&" : "?";
    const signIn = `${redirectTo}${separator}redirect=${encodeURIComponent(target)}`;
    return <Navigate to={signIn} replace state={{ from: target }} />;
  }

  return <>{children}</>;
}
