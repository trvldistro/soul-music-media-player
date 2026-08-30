import { scenario, step, expect } from "kliv-scenario";

// @kliv-spec-derived — from user intent: "If any other user tries to access /admin,
// prompt for the authorized admin email or deny access."
scenario("only the authorized admin email can open the admin dashboard", {
  setup: {
    users: { fan: { name: "Fan" }, visitor: "anonymous" },
  },
}, async ({ users }) => {
  await step("a signed-in regular user is denied", async () => {
    await users.fan.page.goto("/admin");
    await expect(users.fan.page.getByText("Access denied")).toBeVisible();
    await expect(users.fan.page.getByText("lill33.scarlett@gmail.com")).toBeVisible();
    // The dashboard itself must not render for them.
    await expect(users.fan.page.getByText("Review queue")).toHaveCount(0);
  });

  await step("a signed-out visitor is prompted to sign in as admin", async () => {
    await users.visitor.page.goto("/admin");
    await expect(users.visitor.page.getByText("Admin sign-in required")).toBeVisible();
    await expect(users.visitor.page.getByRole("link", { name: "Sign in as admin" })).toBeVisible();
  });
});

// @kliv-spec-derived — from user intent: "When a user uploads a new song, make it
// automatically appear on the app immediately, but flag it as Unverified."
scenario("new uploads appear immediately flagged as Unverified", {
  setup: {
    users: { fan: { name: "Fan" } },
    database: [
      {
        table: "tracks",
        rows: [
          {
            title: "Midnight Upload",
            artist: "The Believers",
            album: "Fan Tapes",
            genre: "Soul",
            duration_seconds: 14,
            audio_url: "/music/demo-groove.wav",
            cover_url: "",
            is_demo: 0,
            media_kind: "audio",
            uploader_name: "The Believers",
            moderation_status: "unverified",
          },
        ],
      },
    ],
  },
}, async ({ users }) => {
  const page = users.fan.page;
  await page.goto("/");
  await step("the upload is live on the home page right away", async () => {
    await expect(page.getByText("From the fans")).toBeVisible();
    await expect(page.getByRole("button", { name: "Play Midnight Upload" })).toHaveCount(2);
  });
  await step("it carries the Unverified flag", async () => {
    await expect(page.getByText("Unverified").first()).toBeVisible();
  });
});

// @kliv-spec-derived — from user intent: "Give the admin the power to immediately
// remove/take down any unverified or verified song."
scenario("taken-down songs are hidden from the library", {
  setup: {
    users: { listener: {} },
    database: [
      {
        table: "tracks",
        rows: [
          {
            title: "Kept Song",
            artist: "Otis Grey",
            album: "",
            genre: "Soul",
            duration_seconds: 12,
            audio_url: "/music/demo-groove.wav",
            cover_url: "",
            is_demo: 0,
            media_kind: "audio",
            uploader_name: "Otis Grey",
            moderation_status: "verified",
          },
          {
            title: "Pulled Song",
            artist: "Otis Grey",
            album: "",
            genre: "Soul",
            duration_seconds: 12,
            audio_url: "/music/demo-groove.wav",
            cover_url: "",
            is_demo: 0,
            media_kind: "audio",
            uploader_name: "Otis Grey",
            moderation_status: "removed",
            moderation_note: "Copyrighted content",
          },
        ],
      },
    ],
  },
}, async ({ users }) => {
  const page = users.listener.page;
  await page.goto("/");
  await step("the verified song is listed", async () => {
    await expect(page.getByRole("button", { name: "Play Kept Song" }).first()).toBeVisible();
  });
  await step("the taken-down song is gone from every list", async () => {
    await expect(page.getByRole("button", { name: "Play Pulled Song" })).toHaveCount(0);
    await expect(page.getByText("Pulled Song")).toHaveCount(0);
  });
});
