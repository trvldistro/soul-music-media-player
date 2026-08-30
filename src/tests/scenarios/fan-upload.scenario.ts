import { scenario, step, expect } from "kliv-scenario";

scenario("fan upload form enforces artist name and WAV songs", {
  setup: {
    users: { fan: { name: "Fan" } },
  },
}, async ({ users }) => {
  const page = users.fan.page;

  await step("a signed-in fan can open the upload form", async () => {
    await page.goto("/");
    await page.getByRole("button", { name: "Add music" }).first().click();
    await expect(page.getByText("Share your music")).toBeVisible();
  });

  await step("the form says the song must be a WAV", async () => {
    await expect(page.getByText("must be a WAV")).toBeVisible();
  });

  await step("submitting empty asks for the artist name", async () => {
    await page.getByRole("button", { name: "Share with the fans" }).click();
    await expect(page.getByText("Artist name is required")).toBeVisible();
  });

  await step("a music video upload needs a video file", async () => {
    await page.getByRole("button", { name: "Music video" }).click();
    await page.getByLabel("Artist name").fill("The Believers");
    await page.getByLabel("Title").fill("Live at the Apollo");
    await page.getByRole("button", { name: "Share with the fans" }).click();
    await expect(page.getByText("Choose a music video")).toBeVisible();
  });
});

scenario("fan uploads appear in the community section", {
  setup: {
    users: { fan: { name: "Fan" } },
    database: [
      {
        table: "tracks",
        rows: [
          {
            title: "Sunday Groove",
            artist: "The Believers",
            album: "Fan Tapes",
            genre: "Soul",
            duration_seconds: 14,
            audio_url: "/music/demo-groove.wav",
            cover_url: "",
            is_demo: 0,
            media_kind: "audio",
            uploader_name: "The Believers",
          },
        ],
      },
    ],
  },
}, async ({ users }) => {
  const page = users.fan.page;

  await step("the fan upload shows on the home page", async () => {
    await page.goto("/");
    await expect(page.getByText("From the fans")).toBeVisible();
    // The track shows both in "All tracks" and in "From the fans".
    await expect(page.getByRole("button", { name: "Play Sunday Groove" })).toHaveCount(2);
  });
});
