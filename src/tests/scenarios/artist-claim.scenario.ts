import { expect, scenario, step } from "kliv-scenario";

// Claim review now lives ONLY in the /admin dashboard, which is gated to the
// authorized admin email. A scenario world can never mint that email, so the
// world reviewer is refused at the gate — exactly what a real non-admin would
// see. The verified-artist display is covered by the second case, which seeds
// an already-verified profile.
const library = [
  {
    table: "tracks",
    rows: [
      {
        title: "Testify",
        artist: "The Believers",
        album: "Testify",
        genre: "Soul",
        duration_seconds: 214,
        audio_url: "/music/testify.wav",
        cover_url: "",
        is_demo: 1,
      },
    ],
  },
];

scenario(
  "a fan claims an unclaimed artist profile and the claim waits for review",
  {
    setup: {
      users: {
        fan: { name: "Fan" },
        reviewer: { name: "Reviewer", groups: ["artist_reviewers"] },
      },
      database: library,
    },
  },
  async ({ users }) => {
    const fan = users.fan;
    const reviewer = users.reviewer;
    await step("the artist page opens automatically from a track", async () => {
      await fan.page.goto("/");
      await fan.page.getByRole("button", { name: "The Believers", exact: true }).first().click();
      await expect(fan.page.getByRole("heading", { name: "The Believers" })).toBeVisible();
      await expect(fan.page.getByText("Unclaimed profile")).toBeVisible();
      await expect(fan.page.getByText("1 song · 1 album")).toBeVisible();
    });

    await step("a signed-in artist can apply to claim the profile", async () => {
      await fan.page.getByRole("button", { name: "Claim profile · Verify as artist" }).click();
      await fan.page.getByLabel("Why is this profile yours?").fill("I am the lead singer and I run the band's official page.");
      await fan.page.getByRole("button", { name: "Submit claim" }).click();
      await expect(fan.page.getByText("Claim submitted")).toBeVisible();
      await fan.page.getByRole("button", { name: "Done" }).click();
      await expect(fan.page.getByText("Claim under review")).toBeVisible();
    });

    await step("the review queue is closed to everyone but the admin", async () => {
      await reviewer.page.goto("/admin");
      await expect(reviewer.page.getByText("Access denied")).toBeVisible();
      // The pending claim evidence must not leak to a non-admin.
      await expect(reviewer.page.getByText("I am the lead singer")).toHaveCount(0);
    });

    await step("the fan still sees the claim under review", async () => {
      await expect(fan.page.getByText("Claim under review")).toBeVisible();
    });
  },
);

scenario(
  "a verified artist page shows the verified badge",
  {
    setup: {
      users: { fan: { name: "Fan" } },
      database: [
        ...library,
        {
          table: "artists",
          rows: [
            {
              name: "The Believers",
              status: "claimed",
              claim_evidence: "Verified with the label",
              claimed_at: 1700000000000,
            },
          ],
        },
      ],
    },
  },
  async ({ users }) => {
    const fan = users.fan;
    await step("the artist page opens verified", async () => {
      await fan.page.goto("/");
      await fan.page.getByRole("button", { name: "The Believers", exact: true }).first().click();
      await expect(fan.page.getByRole("heading", { name: "The Believers" })).toBeVisible();
      await expect(fan.page.getByText("Verified artist")).toBeVisible();
      await expect(fan.page.getByText("Unclaimed profile")).toBeHidden();
    });
  },
);
