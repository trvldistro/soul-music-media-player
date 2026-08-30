import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AccountHome from "./AccountHome";

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

function renderAccountHome() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/account"]}>
        <Routes>
          <Route path="/account" element={<AccountHome />} />
          <Route path="/" element={<p>Signed out</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("AccountHome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading spinner while the session loads", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true, signOut: vi.fn() });

    renderAccountHome();

    expect(screen.getByLabelText("Loading account")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Your account" })).not.toBeInTheDocument();
  });

  it("renders the signed-in user's display name and email", () => {
    mockUseAuth.mockReturnValue({
      user: { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com" },
      loading: false,
      signOut: vi.fn(),
    });

    renderAccountHome();

    expect(screen.getByText("Ada Lovelace")).toBeVisible();
    expect(screen.getByText("ada@example.com")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Your account" })).toBeVisible();
  });

  it("links to the profile and security pages", () => {
    mockUseAuth.mockReturnValue({
      user: { firstName: "Ada", email: "ada@example.com" },
      loading: false,
      signOut: vi.fn(),
    });

    renderAccountHome();

    expect(screen.getByRole("link", { name: /Profile/ })).toHaveAttribute(
      "href",
      "/account/profile",
    );
    expect(screen.getByRole("link", { name: /Security/ })).toHaveAttribute(
      "href",
      "/account/security",
    );
  });

  it("signs out before navigating home", async () => {
    const signOut = vi.fn().mockResolvedValue(undefined);
    mockUseAuth.mockReturnValue({
      user: { firstName: "Ada", email: "ada@example.com" },
      loading: false,
      signOut,
    });

    renderAccountHome();
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Signed out")).toBeVisible();
    });
  });
});
