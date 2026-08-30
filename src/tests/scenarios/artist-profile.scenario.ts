import { expect, scenario, step } from "kliv-scenario";

scenario("a verified artist personalises their profile page", {
  setup: {
    users: {
      artist: { name: "Soulsetter" },
      fan: { name: "Fan" },
      reviewer: { name: "Reviewer", groups: ["team-administrators"] },
    },
    database: [
      {
        table: "tracks",
        rows: [
          {
            title: "Testify",
            artist: "Soulsetter",
            album: "Testify",
            genre: "Soul",
            duration_seconds: 214,
            audio_url: "/music/testify.wav",
            cover_url: "",
            is_demo: 1,
          },
        ],
      },
      { table: "artists", rows: [{ name: "Soulsetter", status: "unclaimed" }] },
    ],
  },
}, async ({ users }) => {
  const { artist, fan, reviewer } = users;

  await step("a squatter saves a profile row that nobody verified", async () => {
    const res = await fan.request("/api/v2/database/artist_profiles", {
      method: "POST",
      body: { name: "Soulsetter", bio: "fake bio from a squatter", image_url: "", links_json: "[]" },
    });
    if (!res.ok) throw new Error("squatter row insert failed: " + res.status);
  });

  await step("the artist saves their own bio and links", async () => {
    const res = await artist.request("/api/v2/database/artist_profiles", {
      method: "POST",
      body: {
        name: "Soulsetter",
        bio: "Gospel-soul four-piece from the east side.",
        image_url: "",
        links_json: JSON.stringify([
          { platform: "spotify", url: "https://open.spotify.com/artist/soulsetter" },
          { platform: "instagram", url: "https://instagram.com/soulsetter" },
        ]),
      },
    });
    if (!res.ok) throw new Error("artist profile insert failed: " + res.status);
  });

  await step("the reviewer verifies the artist, the way the dashboard does", async () => {
    const res = await reviewer.request("/api/v2/database/artists?name=eq.Soulsetter", {
      method: "PUT",
      body: { status: "claimed", claimant_uuid: artist.uuid, claimed_at: Date.now() },
    });
    if (!res.ok) throw new Error("artist verify failed: " + res.status);
  });

  await step("the page shows the real bio and links, never the squatter's", async () => {
    await artist.page.goto("/");
    await artist.page.getByRole("button", { name: "Soulsetter", exact: true }).first().click();
    await expect(artist.page.getByRole("heading", { name: "Soulsetter" })).toBeVisible();
    await expect(artist.page.getByText("Verified artist")).toBeVisible();
    await expect(artist.page.getByText("Gospel-soul four-piece from the east side.")).toBeVisible();
    await expect(artist.page.getByRole("link", { name: "Spotify" })).toBeVisible();
    await expect(artist.page.getByRole("link", { name: "Instagram" })).toBeVisible();
    await expect(artist.page.getByText("fake bio from a squatter")).toBeHidden();
  });

  await step("the verified artist edits their profile right from the page", async () => {
    await artist.page.getByRole("button", { name: "Edit profile" }).click();
    await artist.page.getByLabel("Bio").fill("New chapter, same soul.");
    await artist.page.getByRole("button", { name: "Save profile" }).click();
    await expect(artist.page.getByText("Profile updated")).toBeVisible();
    await expect(artist.page.getByText("New chapter, same soul.")).toBeVisible();
  });
});
