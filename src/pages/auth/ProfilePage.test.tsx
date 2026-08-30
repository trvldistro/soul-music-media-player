import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProfilePage from "./ProfilePage";

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

const user = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  userMetadata: { department: "Research", level: "Senior" },
};

function renderProfilePage() {
  return render(
    <MemoryRouter initialEntries={["/account/profile"]}>
      <ProfilePage />
    </MemoryRouter>,
  );
}

function mockProfileUser(currentUser: unknown = user) {
  const updateUser = vi.fn().mockResolvedValue(currentUser);
  const refresh = vi.fn().mockResolvedValue(undefined);
  mockUseAuth.mockReturnValue({
    user: currentUser,
    loading: false,
    updateUser,
    refresh,
  });
  return { updateUser, refresh };
}

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefills all fields from the signed-in user", async () => {
    mockProfileUser();

    renderProfilePage();

    await waitFor(() => {
      expect(screen.getByLabelText("First name")).toHaveValue("Ada");
      expect(screen.getByLabelText("Last name")).toHaveValue("Lovelace");
      expect(screen.getByLabelText("Email")).toHaveValue("ada@example.com");
    });
  });

  it("blocks an invalid draft without calling updateUser", async () => {
    const { updateUser } = mockProfileUser();
    renderProfilePage();
    await waitFor(() => expect(screen.getByLabelText("First name")).toHaveValue("Ada"));

    fireEvent.change(screen.getByLabelText("First name"), { target: { value: " " } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Enter your first name");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("reports an unchanged form without calling updateUser", async () => {
    const { updateUser } = mockProfileUser();
    renderProfilePage();
    await waitFor(() => expect(screen.getByLabelText("First name")).toHaveValue("Ada"));

    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("No changes to save.")).toBeVisible();
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("sends only changed fields, refreshes, and reports success", async () => {
    const { updateUser, refresh } = mockProfileUser();
    renderProfilePage();
    await waitFor(() => expect(screen.getByLabelText("First name")).toHaveValue("Ada"));

    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: " Byron " } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(updateUser).toHaveBeenCalledWith({ lastName: "Byron" });
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Profile saved.")).toBeVisible();
    });
    expect(Object.keys(updateUser.mock.calls[0][0])).toEqual(["lastName"]);
  });

  it("disables saving until the update finishes", async () => {
    const { updateUser } = mockProfileUser();
    let finishUpdate: () => void = () => undefined;
    const pendingUpdate = new Promise<unknown>(
      (resolve: (value: unknown | PromiseLike<unknown>) => void) => {
        finishUpdate = () => resolve(user);
      },
    );
    updateUser.mockReturnValue(pendingUpdate);
    renderProfilePage();
    await waitFor(() => expect(screen.getByLabelText("First name")).toHaveValue("Ada"));

    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Grace" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled(),
    );
    finishUpdate();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled(),
    );
  });

  it("surfaces a rejected update's server message and never reports success", async () => {
    const { updateUser, refresh } = mockProfileUser();
    updateUser.mockRejectedValue(new Error("Identity updates are not allowed during this run"));
    renderProfilePage();
    await waitFor(() => expect(screen.getByLabelText("First name")).toHaveValue("Ada"));

    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Grace" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not save your profile: Identity updates are not allowed during this run",
    );
    expect(screen.queryByText("Profile saved.")).not.toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("renders string profile metadata as read-only details", () => {
    mockProfileUser();

    renderProfilePage();

    expect(screen.getByRole("heading", { name: "Profile details" })).toBeVisible();
    expect(screen.getByText("department")).toBeVisible();
    expect(screen.getByText("Research")).toBeVisible();
    expect(screen.getByText("level")).toBeVisible();
    expect(screen.getByText("Senior")).toBeVisible();
  });

  it("shows the profile metadata empty state", () => {
    mockProfileUser({ firstName: "Ada", lastName: "", email: "ada@example.com" });

    renderProfilePage();

    expect(screen.getByText("No profile details stored yet.")).toBeVisible();
  });
});
