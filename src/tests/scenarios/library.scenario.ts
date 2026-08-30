import { expect, scenario, step } from "kliv-scenario";

const library = [
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
      },
    ],
  },
];

scenario("a listener browses the library and plays a track", {
  setup: { users: { listener: {} }, database: library },
}, async ({ users }) => {
  const page = users.listener.page;
  await page.goto("/");
  await step("library renders", async () => {
    await expect(page.getByText("Testify", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("The Mighty Clouds").first()).toBeVisible();
    await expect(page.getByText("All tracks")).toBeVisible();
  });
  await step("each song shows its play count", async () => {
    await expect(page.getByText("0 plays", { exact: true }).first()).toBeVisible();
  });
  await step("clicking a track starts it", async () => {
    await page.getByRole("button", { name: "Play Testify" }).first().click();
    await expect(page.getByTestId("player-bar").getByText("Testify", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  });
  await step("pausing stops playback", async () => {
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  });
});

scenario("signed-in listener favorites a track", {
  setup: {
    users: { listener: {} },
    database: library,
  },
}, async ({ users }) => {
  const page = users.listener.page;
  await page.goto("/");
  await step("favorites the track from the list", async () => {
    await page.getByRole("button", { name: "Favorite Testify" }).first().click();
    await expect(page.getByRole("button", { name: "Unfavorite Testify" }).first()).toBeVisible();
  });
  await step("it appears under Favorites", async () => {
    await page.getByRole("button", { name: "Favorites", exact: true }).click();
    await expect(page.getByText("Testify", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Groove Line", { exact: true })).toBeHidden();
  });
});
