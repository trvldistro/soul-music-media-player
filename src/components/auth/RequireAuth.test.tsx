import { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RequireAuth from "./RequireAuth";

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

/**
 * Stands in for the sign-in page so the guard's whole handoff is observable: the
 * `redirect` query parameter it wrote, and the `state.from` it repeated.
 */
function SignInProbe() {
  const location = useLocation();
  const redirect = new URLSearchParams(location.search).get("redirect");
  const from = (location.state as { from?: string } | null)?.from;

  return (
    <>
      <p>Sign in</p>
      <p>redirect param: {redirect ?? "(none)"}</p>
      <p>state.from: {from ?? "(none)"}</p>
    </>
  );
}

/**
 * The shape a composing guard uses — roles_access's RequireRole wraps this guard exactly this
 * way, forwarding `redirectTo` and nesting its own check inside the children. The guard reads
 * the router's current location, so nesting must not change what it records.
 */
function ComposedGuard({
  children,
  redirectTo,
}: {
  children: ReactNode;
  redirectTo?: string;
}) {
  return (
    <RequireAuth {...(redirectTo ? { redirectTo } : {})}>
      <p>Inner check ran</p>
      {children}
    </RequireAuth>
  );
}

function renderGuard(entry: string, redirectTo?: string, composed = false) {
  const guarded = composed ? (
    <ComposedGuard {...(redirectTo ? { redirectTo } : {})}>
      <p>Protected content</p>
    </ComposedGuard>
  ) : (
    <RequireAuth {...(redirectTo ? { redirectTo } : {})}>
      <p>Protected content</p>
    </RequireAuth>
  );

  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/login" element={<SignInProbe />} />
        <Route path="/signin" element={<SignInProbe />} />
        <Route path="/protected" element={guarded} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("holds the route while the session is still loading", () => {
    mockUseAuth.mockReturnValue({ signedIn: false, loading: true });

    renderGuard("/protected?foo=bar");

    expect(screen.getByText("Loading…")).toBeVisible();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
    expect(screen.queryByText("Sign in")).not.toBeInTheDocument();
  });

  it("renders the guarded page for a signed-in user", () => {
    mockUseAuth.mockReturnValue({ signedIn: true, loading: false });

    renderGuard("/protected?foo=bar");

    expect(screen.getByText("Protected content")).toBeVisible();
  });

  it("carries the query string into the redirect target", () => {
    mockUseAuth.mockReturnValue({ signedIn: false, loading: false });

    renderGuard("/protected?foo=bar");

    // The exact defect: dropping the search here left the returning user on a
    // page whose required parameter was gone.
    expect(screen.getByText("redirect param: /protected?foo=bar")).toBeVisible();
    expect(screen.getByText("state.from: /protected?foo=bar")).toBeVisible();
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument();
  });

  it("URL-encodes the target so nested parameters survive the round trip", () => {
    mockUseAuth.mockReturnValue({ signedIn: false, loading: false });

    renderGuard("/protected?price=price_1&qty=2");

    expect(
      screen.getByText("redirect param: /protected?price=price_1&qty=2"),
    ).toBeVisible();
  });

  it("records a bare pathname when there is no query string", () => {
    mockUseAuth.mockReturnValue({ signedIn: false, loading: false });

    renderGuard("/protected");

    expect(screen.getByText("redirect param: /protected")).toBeVisible();
    expect(screen.getByText("state.from: /protected")).toBeVisible();
  });

  it("honours a custom sign-in route", () => {
    mockUseAuth.mockReturnValue({ signedIn: false, loading: false });

    renderGuard("/protected?foo=bar", "/signin");

    expect(screen.getByText("Sign in")).toBeVisible();
    expect(screen.getByText("redirect param: /protected?foo=bar")).toBeVisible();
  });

  it("appends to a sign-in route that already carries a query string", () => {
    mockUseAuth.mockReturnValue({ signedIn: false, loading: false });

    renderGuard("/protected?foo=bar", "/signin?mode=compact");

    expect(screen.getByText("redirect param: /protected?foo=bar")).toBeVisible();
  });

  it("records the same target when a composing guard wraps it", () => {
    // A wrapper such as roles_access's RequireRole adds a check inside the children and forwards
    // redirectTo. It must not change where the visitor is sent or what is recorded.
    mockUseAuth.mockReturnValue({ signedIn: false, loading: false });

    renderGuard("/protected?foo=bar", undefined, true);

    expect(screen.getByText("redirect param: /protected?foo=bar")).toBeVisible();
    expect(screen.getByText("state.from: /protected?foo=bar")).toBeVisible();
    expect(screen.queryByText("Inner check ran")).not.toBeInTheDocument();
  });

  it("runs a composing guard's own check only once authentication passed", () => {
    mockUseAuth.mockReturnValue({ signedIn: true, loading: false });

    renderGuard("/protected?foo=bar", undefined, true);

    expect(screen.getByText("Inner check ran")).toBeVisible();
    expect(screen.getByText("Protected content")).toBeVisible();
  });

  it("honours a composing guard's custom sign-in route", () => {
    mockUseAuth.mockReturnValue({ signedIn: false, loading: false });

    renderGuard("/protected?foo=bar", "/signin", true);

    expect(screen.getByText("Sign in")).toBeVisible();
    expect(screen.getByText("redirect param: /protected?foo=bar")).toBeVisible();
  });
});
