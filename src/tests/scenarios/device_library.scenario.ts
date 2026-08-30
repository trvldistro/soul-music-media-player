import { expect, scenario, step } from "kliv-scenario";

// The owner asked for playback straight from the device's own storage: the
// visitor grants access (a browser permission) instead of importing copies
// into the app. The scenario harness cannot drive a native permission prompt,
// so this proves the view asks for storage access and promises the files stay
// on the device; parsing, merging and ordering are covered by the
// deviceStorage unit tests.
scenario("device storage playback is available inside the player", { setup: {} }, async ({ kliv }) => {
  const listener = await kliv.actor({ name: "Local listener" });
  const page = listener.page;

  await step("the listener opens the device storage view from the sidebar", async () => {
    await page.goto("/");
    await page.getByRole("button", { name: "Device storage", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Device storage" })).toBeVisible();
  });

  await step("the view asks for storage access instead of importing copies", async () => {
    await expect(page.getByRole("button", { name: /Open music folder/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Pick audio or video files/i })).toBeVisible();
    await expect(page.getByText(/straight from your device/i)).toBeVisible();
    await expect(page.getByText(/nothing is uploaded/i)).toBeVisible();
  });

  await step("an empty view explains the permission flow", async () => {
    await expect(page.getByText(/No storage access yet/i)).toBeVisible();
  });
});
