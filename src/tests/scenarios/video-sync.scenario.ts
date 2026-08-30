import { expect, scenario, step } from "kliv-scenario";

// A library with one song that has an attached video and one plain song —
// everything the code and switch journeys need already in place. In a fresh
// world the seeded rows take ids 1 and 2, so their codes are SM-0001/SM-0002.
const world = [
  {
    table: "tracks",
    rows: [
      {
        title: "Testify",
        artist: "The Mighty Clouds",
        album: "Testify!",
        genre: "Soul",
        duration_seconds: 12,
        audio_url: "/music/testify.wav",
        cover_url: "",
        is_demo: 0,
        media_kind: "audio",
        video_url: "/videos/testify.mp4",
        video_state: "attached",
        uploader_name: "The Mighty Clouds",
      },
      {
        title: "Groove Line",
        artist: "The Mighty Clouds",
        album: "Testify!",
        genre: "Funk",
        duration_seconds: 10,
        audio_url: "/music/groove-line.wav",
        cover_url: "",
        is_demo: 0,
        media_kind: "audio",
      },
    ],
  },
];

scenario("every song carries a short code you can track it down by", {
  setup: { users: { listener: {} }, database: world },
}, async ({ users }) => {
  const page = users.listener.page;
  await page.goto("/");

  await step("song rows show their code", async () => {
    await expect(page.getByTestId("song-code-1").first()).toBeVisible();
    await expect(page.getByTestId("song-code-2").first()).toBeVisible();
  });

  await step("searching the code finds exactly that song", async () => {
    await page.getByRole("button", { name: "Search", exact: true }).click();
    await page.getByPlaceholder("Songs, artists, albums, genres, SM-codes…").fill("sm-0001");
    await expect(page.getByTestId("song-code-1").first()).toBeVisible();
    await expect(page.getByTestId("song-code-2")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Play Testify" })).toBeVisible();
  });
});

scenario("a song with an attached video flips between song and video", {
  setup: { users: { listener: {} }, database: world },
}, async ({ users }) => {
  const page = users.listener.page;
  await page.goto("/");

  await step("the song sits on the music videos shelf", async () => {
    await expect(page.getByRole("button", { name: "Play video Testify" })).toBeVisible();
  });

  await step("playing it from the shelf starts it in video mode", async () => {
    await page.getByRole("button", { name: "Play video Testify" }).click();
    await expect(page.getByTestId("player-bar").getByText("Testify", { exact: true })).toBeVisible();
  });

  await step("now playing starts it in video mode", async () => {
    await page.getByRole("button", { name: "Open now playing" }).click();
    await expect(page.getByTestId("video-stage")).toBeVisible();
    await expect(page.getByRole("button", { name: "Switch to the song" })).toBeVisible();
  });

  await step("flipping to the song keeps it playing as audio", async () => {
    await page.getByRole("button", { name: "Switch to the song" }).click();
    await expect(page.getByTestId("video-stage")).toBeHidden();
    await expect(page.getByRole("button", { name: "Switch to the video" })).toBeVisible();
    await expect(page.getByTestId("player-bar").getByText("Testify", { exact: true })).toBeVisible();
  });
});
