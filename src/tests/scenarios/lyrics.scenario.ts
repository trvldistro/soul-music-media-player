import { expect, scenario, step } from "kliv-scenario";

const library = [
  {
    table: "tracks",
    rows: [
      {
        title: "Testify",
        artist: "The Believers",
        album: "Testify!",
        genre: "Soul",
        duration_seconds: 12,
        audio_url: "/music/testify.wav",
        cover_url: "",
        is_demo: 0,
      },
    ],
  },
];

scenario(
  "a fan adds and syncs lyrics, earning Soul Points",
  {
    setup: {
      users: { fan: { name: "Fan" } },
      database: library,
    },
  },
  async ({ users }) => {
    const page = users.fan.page;

    await step("the lyrics editor opens from the track menu", async () => {
      await page.goto("/");
      await page.getByRole("button", { name: "More options for Testify" }).first().click();
      await page.getByRole("menuitem", { name: "Lyrics" }).click();
      await expect(page.getByText("Paste the lyrics for this song")).toBeVisible();
    });

    await step("saving the first lyrics stores them", async () => {
      await page.getByLabel("Lyrics text").fill("Keep on keeping on\nThrough the night");
      await page.getByRole("button", { name: "Save lyrics" }).click();
      await expect(page.getByText("Lyrics saved")).toBeVisible();
    });

    await step("stamping and saving the sync", async () => {
      await page.getByRole("button", { name: "Load track" }).click();
      await page.getByRole("button", { name: "Stamp line 1" }).click();
      await page.getByText("Through the night").first().click();
      await page.getByRole("button", { name: "Stamp line 2" }).click();
      await page.getByRole("button", { name: "Save sync" }).click();
      await expect(page.getByText("Sync saved")).toBeVisible();
      await expect(page.getByText("2/2 lines stamped")).toBeVisible();
    });

    await step("synced lyrics show in the now-playing view", async () => {
      await page.getByRole("button", { name: "Close" }).click();
      // The editor's "Load track" already started this song — open the player view.
      await page.getByTestId("player-bar").getByRole("button", { name: "Open now playing" }).click();
      await expect(page.getByText("tap a line to jump")).toBeVisible();
      await expect(page.getByRole("button", { name: "Keep on keeping on" })).toBeVisible();
    });
  },
);
