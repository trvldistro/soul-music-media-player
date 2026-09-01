import { describe, expect, it } from "vitest";
import {
  cleanChannelName,
  parseISODuration,
  parseYouTubeId,
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
