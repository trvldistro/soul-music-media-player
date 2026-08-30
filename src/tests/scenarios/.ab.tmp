// End-to-end auth and account coverage: a signed-out visitor is gated, the real signup form
// creates a live session that reaches the account UI, and an isolated actor's identity reaches
// the profile form across a remount. There is no row write to assert: this spine ships no table
// because auth identity is platform-owned: a scenario actor's profile lives in its run-scoped
// adm_scenario_principals row, which is what the save step below persists to (BI-2718).
//
// The last two scenarios cover the redirect contract itself: RequireAuth is the only place that
// decides where an unauthenticated visitor goes and where they come back to, so the target it
// records must be the whole URL and must survive an entry with no router state.

import { expect, scenario, step } from "kliv-scenario";

scenario("account access follows the live authentication session", { setup: {} }, async ({ page, kliv }) => {
  const owner = await kliv.actor({ groups: [], name: "Account owner" });
  const ownerEmail = owner.email;

  await step("a signed-out visitor cannot reach the account hub", async () => {
    await page.goto("/account");

    // Both halves matter: Sign in proves the redirect reached the real sign-in page, while the
    // missing account heading proves protected content did not flash or remain mounted.
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your account" })).not.toBeVisible();
  });

  // The auth pages' inputs carry placeholders rather than labels, so they are addressed by placeholder.
  const signupEmail = `${kliv.unique("account-owner")}@example.com`;

  await step("a visitor completes the real signup form", async () => {
    const password = `Kliv-${kliv.unique("account-password")}-9!`;

    await page.getByRole("link", { name: "Sign up" }).click();
    await page.getByPlaceholder("Your name").fill("Account Owner");
    await page.getByPlaceholder("Email").fill(signupEmail);
    await page.getByPlaceholder("Password").fill(password);
    await page.getByRole("button", { name: "Create Account" }).click();
  });

  await step("the new session lands on the account hub it was gated from", async () => {
    // The submit above is this run's first identity write and pays for scenario-fork
    // materialization, so the outcome is asserted in its own step with a fresh budget.
    // The sign-up page reads the redirect parameter RequireAuth set to /account in step one — the
    // signup minted a real session and the hub read that session's own address back.
    await expect(page.getByRole("heading", { name: "Your account" })).toBeVisible();
    await expect(page.getByText(signupEmail, { exact: true })).toBeVisible();
  });

  await step("an isolated actor's own identity reaches the profile form", async () => {
    await owner.page.goto("/account/profile");
    await expect(owner.page.getByRole("heading", { name: "Profile", exact: true })).toBeVisible();
    await expect(owner.page.getByLabel("Email")).toHaveValue(ownerEmail);

    // Leaving for another declared route forces a remount; returning proves the value was read
    // again from the live session instead of surviving only in component state.
    await owner.page.goto("/account");
    await expect(owner.page.getByText(ownerEmail, { exact: true })).toBeVisible();
    await owner.page.goto("/account/profile");
    await expect(owner.page.getByLabel("Email")).toHaveValue(ownerEmail);
  });

  await step("a profile save persists to the actor's own identity", async () => {
    await owner.page.getByLabel("First name").fill("Changed");
    await owner.page.getByRole("button", { name: "Save changes" }).click();

    // Name and locale are columns adm_scenario_principals carries, so handleUserPut routes the
    // write through IdentityStore.updateUserProfile to the actor's OWN run-scoped row (BI-2718) —
    // self-service works without touching the real registry. Email and password stay refused under
    // a run: email would reserve a real address in the live signup pool, and a password change
    // would diverge from the credential the actor mint issued.
    await expect(owner.page.getByText("Profile saved.", { exact: true })).toBeVisible();
  });

  await step("the saved name survives a reload, so it was persisted not just echoed", async () => {
    await owner.page.goto("/account/profile");
    await expect(owner.page.getByLabel("First name")).toHaveValue("Changed");
  });
});

// All three /account/* routes are wrapped in RequireAuth, so the gate is one mechanism rather
// than three page-local effects. This proves the second leaf really carries it.
scenario("the security page is gated too", { setup: {} }, async ({ page }) => {
  await step("a signed-out visitor is redirected away from account security", async () => {
    await page.goto("/account/security");

    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByText("Login Methods", { exact: true })).not.toBeVisible();
  });
});

// The gated target is a whole URL, not a pathname. A visitor who followed a link carrying
// parameters must get those parameters back, or the page they return to is not the page they
// asked for. Asserted on the real browser URL, so no page needs to render the parameter.
scenario("a gated deep link returns intact, query string and all", { setup: {} }, async ({ page, kliv }) => {
  const signupEmail = `${kliv.unique("deep-link")}@example.com`;
  const password = `Kliv-${kliv.unique("deep-link-password")}-9!`;

  await step("the guard records the whole target, not just its path", async () => {
    await page.goto("/account/profile?highlight=email");

    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    // Reload-safe: the target is in the URL, not only in router state.
    await expect(page).toHaveURL(/redirect=/);
  });

  await step("the visitor signs up", async () => {
    await page.getByRole("link", { name: "Sign up" }).click();
    await page.getByPlaceholder("Your name").fill("Deep Linker");
    await page.getByPlaceholder("Email").fill(signupEmail);
    await page.getByPlaceholder("Password").fill(password);
    await page.getByRole("button", { name: "Create Account" }).click();
  });

  await step("the query string survived the whole round trip", async () => {
    // The identity write above pays for fork materialization, so the outcome gets its own
    // budget. Before the fix this landed on a bare /account/profile.
    await expect(page).toHaveURL(/\/account\/profile\?highlight=email/);
    await expect(page.getByRole("heading", { name: "Profile", exact: true })).toBeVisible();
  });
});

// Entering the sign-in page cold — a reload, a bookmark, a fresh tab — leaves no router state
// behind. Only the URL parameter can carry the target across that, which is why the guard writes
// one.
scenario("the sign-in page honours a target carried only in the URL", { setup: {} }, async ({ page, kliv }) => {
  const signupEmail = `${kliv.unique("cold-login")}@example.com`;
  const password = `Kliv-${kliv.unique("cold-login-password")}-9!`;

  await step("the sign-in page is opened directly, with no router state", async () => {
    await page.goto("/login?redirect=%2Faccount%2Fsecurity%3Ffrom%3Dreload");

    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  await step("the visitor signs up", async () => {
    await page.getByRole("link", { name: "Sign up" }).click();
    await page.getByPlaceholder("Your name").fill("Cold Start");
    await page.getByPlaceholder("Email").fill(signupEmail);
    await page.getByPlaceholder("Password").fill(password);
    await page.getByRole("button", { name: "Create Account" }).click();
  });

  await step("the parameter alone routed the new session to the security leaf", async () => {
    await expect(page).toHaveURL(/\/account\/security\?from=reload/);
    await expect(page.getByText("Login Methods", { exact: true })).toBeVisible();
  });
});
