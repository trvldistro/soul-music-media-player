import { scenario, step, expect } from "kliv-scenario";

scenario("adding music from a YouTube link validates the input", {
  setup: {
    users: { fan: { name: "Fan" } },
  },
}, async ({ users }) => {
  const page = users.fan.page;

  await step("a signed-in fan can open the add dialog", async () => {
    await page.goto("/");
    await page.getByRole("button", { name: "Add music" }).first().click();
    await expect(page.getByText("Add from YouTube")).toBeVisible();
  });

  await step("the app says songs stream from YouTube, not uploads", async () => {
    await expect(page.getByText(/straight from YouTube/i)).toBeVisible();
  });

  await step("a nonsense link is refused before anything is sent", async () => {
    await page.getByLabel("YouTube link").fill("banana");
    await page.getByRole("button", { name: "Look up the video" }).click();
    await expect(page.getByText(/doesn't look like a YouTube link/i)).toBeVisible();
  });
});

scenario("YouTube songs appear in the community library", {
  setup: {
    users: { fan: { name: "Fan" } },
    database: [
      {
        table: "tracks",
        rows: [
          {
            title: "Respect",
            artist: "The Queen",
            album: "",
            genre: "Soul",
            duration_seconds: 148,
            audio_url: "https://www.youtube.com/watch?v=DC4TgXeOCss",
            cover_url: "https://i.ytimg.com/vi/DC4TgXeOCss/hqdefault.jpg",
            is_demo: 0,
            media_kind: "youtube",
            youtube_id: "DC4TgXeOCss",
            uploader_name: "The Queen",
          },
        ],
      },
    ],
  },
}, async ({ users }) => {
  const page = users.fan.page;

  await step("the YouTube song shows on the home page with a badge", async () => {
    await page.goto("/");
    await expect(page.getByText("From the fans")).toBeVisible();
    await expect(page.getByText("YouTube").first()).toBeVisible();
    // The track shows both in "All tracks" and in "From the fans".
    await expect(page.getByRole("button", { name: "Play Respect" })).toHaveCount(2);
  });
});
