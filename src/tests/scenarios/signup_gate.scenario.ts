import { expect, scenario, step } from "kliv-scenario";

// The owner asked that every visitor ends up with an account: a new arrival at the
// player is sent to the dedicated /signup page before anything loads, their email and
// name create a real account, and a returning fan gets back in through /signin.
scenario("a new visitor must create an account before the player loads", { setup: {} }, async ({ page, kliv }) => {
  const email = `${kliv.unique("new-fan")}@example.com`;
  const password = `Kliv-${kliv.unique("fan-password")}-7!`;

  await step("arriving signed-out lands on the sign-up page, not the player", async () => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
    await expect(page).toHaveURL(/\/signup/);
  });

  await step("the visitor creates an account with name, email and password", async () => {
    await page.getByPlaceholder("Your name").fill("New Fan");
    await page.getByPlaceholder("Email").fill(email);
    await page.getByPlaceholder("Password").fill(password);
    await page.getByRole("button", { name: "Create Account" }).click();
  });

  await step("they land inside the player signed in", async () => {
    // The sidebar reads the live session, so the address proving the account is real.
    await expect(page.getByText(email, { exact: true })).toBeVisible();
  });

  await step("a returning fan signs back in on the sign-in page", async () => {
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.goto("/signin");

    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await page.getByPlaceholder("Email").fill(email);
    await page.getByPlaceholder("Password").fill(password);
    await page.getByRole("button", { name: "Sign In" }).click();

    await expect(page.getByText(email, { exact: true })).toBeVisible();
  });
});
