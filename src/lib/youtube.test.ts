import { describe, expect, it } from "vitest";
import {
  cleanChannelName,
  isYouTubeResultsPayload,
  isYouTubeVideoPayload,
  parseISODuration,
  parseYouTubeId,
  preferOfficialMusic,
  splitVideoTitle,
  youtubeThumbnail,
  youtubeWatchUrl,
} from "./youtube";

// @kliv-spec-derived — from user intent: "fans paste a YouTube link to add a song"
describe("parseYouTubeId", () => {
  it("reads every normal YouTube link shape", () => {
    expect(parseYouTubeId("https://www.youtube.com/watch?v=DC4TgXeOCss")).toBe("DC4TgXeOCss");
    expect(parseYouTubeId("https://youtu.be/DC4TgXeOCss?si=xyz")).toBe("DC4TgXeOCss");
    expect(parseYouTubeId("https://www.youtube.com/shorts/DC4TgXeOCss")).toBe("DC4TgXeOCss");
    expect(parseYouTubeId("https://music.youtube.com/watch?v=DC4TgXeOCss&list=x")).toBe(
      "DC4TgXeOCss",
    );
    expect(parseYouTubeId("https://www.youtube.com/embed/DC4TgXeOCss")).toBe("DC4TgXeOCss");
    expect(parseYouTubeId("DC4TgXeOCss")).toBe("DC4TgXeOCss");
  });

  it("refuses anything that isn't a YouTube link", () => {
    expect(parseYouTubeId("banana")).toBeNull();
    expect(parseYouTubeId("https://vimeo.com/123456")).toBeNull();
    expect(parseYouTubeId("")).toBeNull();
    expect(parseYouTubeId("https://youtube.com/watch?v=short")).toBeNull();
  });
});

// @kliv-spec-derived — durations come back from YouTube as "PT3M42S"
describe("parseISODuration", () => {
  it("converts YouTube's durations to seconds", () => {
    expect(parseISODuration("PT3M42S")).toBe(222);
    expect(parseISODuration("PT1H2M3S")).toBe(3723);
    expect(parseISODuration("PT45S")).toBe(45);
    expect(parseISODuration("P1DT2H")).toBe(93600);
    expect(parseISODuration("")).toBe(0);
    expect(parseISODuration(undefined)).toBe(0);
  });
});

// @kliv-spec-derived — prefill artist and title from the video's own name
describe("splitVideoTitle", () => {
  it("splits 'Artist - Title' and drops the (Official Video) noise", () => {
    expect(
      splitVideoTitle("Aretha Franklin - Respect (Official Video)", "Aretha Franklin - Topic"),
    ).toEqual({ artist: "Aretha Franklin", title: "Respect" });
  });

  it("keeps a dash inside the title itself", () => {
    expect(splitVideoTitle("Lil L33 - We Do Our Best In This Game", "Lil L33")).toEqual({
      artist: "Lil L33",
      title: "We Do Our Best In This Game",
    });
  });

  it("falls back to the channel name when there's no dash", () => {
    expect(splitVideoTitle("Respect [Official Audio]", "Aretha Franklin - Topic")).toEqual({
      artist: "Aretha Franklin",
      title: "Respect",
    });
  });
});

describe("cleanChannelName", () => {
  it("strips YouTube Music's '- Topic' suffix", () => {
    expect(cleanChannelName("Aretha Franklin - Topic")).toBe("Aretha Franklin");
    expect(cleanChannelName("Plain Channel")).toBe("Plain Channel");
  });
});

describe("urls", () => {
  it("builds the watch link and thumbnail", () => {
    expect(youtubeWatchUrl("abc")).toBe("https://www.youtube.com/watch?v=abc");
    expect(youtubeThumbnail("abc")).toBe("https://i.ytimg.com/vi/abc/hqdefault.jpg");
  });
});

// @kliv-spec-derived — from user intent: "I can't find music, I only find
// videos": the song itself (YouTube Music's auto-generated Topic audio) must
// come first, then official VEVO releases, and fan lyric videos / reaction
// uploads must sink.
describe("preferOfficialMusic", () => {
  const topic = { videoId: "a", title: "Aretha Franklin - Respect", channel: "Aretha Franklin - Topic" };
  const vevo = { videoId: "b", title: "Respect (Official Video)", channel: "ArethaFranklinVEVO" };
  const fanLyrics = { videoId: "c", title: "Respect LYRICS HD", channel: "SoulFan99" };
  const reaction = { videoId: "d", title: "Reacting to Respect!!", channel: "ReactBoys" };

  it("puts the official track and VEVO release above fan uploads", () => {
    const ordered = preferOfficialMusic([fanLyrics, reaction, vevo, topic]);
    expect(ordered.map((v) => v.videoId)).toEqual(["a", "b", "c", "d"]);
  });

  it("ranks the Topic studio audio ahead of a VEVO music video", () => {
    expect(preferOfficialMusic([vevo, topic]).map((v) => v.videoId)).toEqual(["a", "b"]);
  });

  it("keeps YouTube's own order between equally-official results", () => {
    const topic2 = { videoId: "e", title: "Respect (Live)", channel: "Aretha Franklin - Topic" };
    expect(preferOfficialMusic([topic, topic2]).map((v) => v.videoId)).toEqual(["a", "e"]);
  });

  it("gives a fan lyric video no lift just for the word LYRICS", () => {
    expect(preferOfficialMusic([fanLyrics, reaction]).map((v) => v.videoId)).toEqual(["c", "d"]);
  });

  it("accepts an empty list", () => {
    expect(preferOfficialMusic([])).toEqual([]);
  });
});

// @kliv-spec-derived — from user intent: "the Search YouTube box must show the
// results YouTube returned". The gateway can mislabel a good response as
// failed, so a complete payload is judged by its own shape.
describe("YouTube payload recognition", () => {
  const video = {
    videoId: "A134hShx_gw",
    title: "Aretha Franklin - Respect (Official Lyric Video)",
    channel: "Aretha Franklin",
    thumbnail: "https://i.ytimg.com/vi/A134hShx_gw/mqdefault.jpg",
    durationSeconds: 151,
  };

  it("accepts a real results list", () => {
    expect(isYouTubeResultsPayload([video, { ...video, videoId: "9iayJ8u4Qew" }])).toBe(true);
  });

  it("accepts an empty results list", () => {
    expect(isYouTubeResultsPayload([])).toBe(true);
  });

  it("rejects anything that isn't a list of complete videos", () => {
    expect(isYouTubeResultsPayload(undefined)).toBe(false);
    expect(isYouTubeResultsPayload("results")).toBe(false);
    expect(isYouTubeResultsPayload([{ title: "no id" }])).toBe(false);
    expect(isYouTubeResultsPayload([video, { channel: "no id or title" }])).toBe(false);
  });

  it("recognizes a single video payload for the link lookup", () => {
    expect(isYouTubeVideoPayload(video)).toBe(true);
    expect(isYouTubeVideoPayload({ error: "not_found" })).toBe(false);
    expect(isYouTubeVideoPayload(null)).toBe(false);
  });
});