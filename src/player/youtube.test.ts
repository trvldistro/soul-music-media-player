import { describe, expect, it, vi } from "vitest";
import { YouTubeMedia, type YTPlayer } from "./youtube";

function fakePlayer(): YTPlayer {
  return {
    playVideo: vi.fn(),
    pauseVideo: vi.fn(),
    seekTo: vi.fn(),
    getCurrentTime: vi.fn(() => 41.5),
    getDuration: vi.fn(() => 213),
    setVolume: vi.fn(),
    mute: vi.fn(),
    unMute: vi.fn(),
    loadVideoById: vi.fn(),
    destroy: vi.fn(),
  } as unknown as YTPlayer;
}

// @kliv-spec-derived — from user intent: "the same play, pause, seek and volume
// controls drive YouTube songs"
describe("YouTubeMedia", () => {
  it("maps the app's 0–1 volume onto YouTube's 0–100", () => {
    const media = new YouTubeMedia();
    const player = fakePlayer();
    media.inject(player);
    media.volume = 0.5;
    expect(player.setVolume).toHaveBeenCalledWith(50);
  });

  it("plays and pauses through the official player calls", () => {
    const media = new YouTubeMedia();
    const player = fakePlayer();
    media.inject(player);
    void media.play();
    expect(player.playVideo).toHaveBeenCalled();
    expect(media.paused).toBe(false);
    media.pause();
    expect(player.pauseVideo).toHaveBeenCalled();
    expect(media.paused).toBe(true);
  });

  it("seeks through the currentTime setter and reports position and length", () => {
    const media = new YouTubeMedia();
    const player = fakePlayer();
    media.inject(player);
    media.currentTime = 30;
    expect(player.seekTo).toHaveBeenCalledWith(30, true);
    expect(media.currentTime).toBe(41.5);
    expect(media.duration).toBe(213);
  });

  it("announces the song's length and its end like a media element does", () => {
    const media = new YouTubeMedia();
    const player = fakePlayer();
    media.inject(player);
    const loaded = vi.fn();
    const ended = vi.fn();
    media.addEventListener("loadedmetadata", loaded);
    media.addEventListener("ended", ended);
    media.handleStateChange(1); // playing
    expect(loaded).toHaveBeenCalled();
    media.handleStateChange(0); // ended
    expect(ended).toHaveBeenCalled();
    expect(media.paused).toBe(true);
  });

  it("remembers a play request made before the player exists", () => {
    const media = new YouTubeMedia();
    void media.play(); // no player yet
    const player = fakePlayer();
    media.inject(player);
    expect(player.playVideo).toHaveBeenCalled();
  });

  // @kliv-spec-derived — from user intent: "the unmute button must actually
  // make the song audible again". YouTube players come up muted and setVolume
  // never lifts that, so unmute must reach YouTube's unMute call.
  it("un-muting lifts YouTube's mute and restores the volume", () => {
    const media = new YouTubeMedia();
    const player = fakePlayer();
    media.inject(player);
    media.muted = true;
    expect(player.mute).toHaveBeenCalled();
    media.muted = false;
    expect(player.unMute).toHaveBeenCalled();
    expect(player.setVolume).toHaveBeenLastCalledWith(90);
  });

  it("a fresh player is told to un-mute when the app is not muted", () => {
    const media = new YouTubeMedia();
    const player = fakePlayer();
    media.inject(player);
    expect(player.unMute).toHaveBeenCalled();
  });

  it("a player arriving while the app is muted stays muted", () => {
    const media = new YouTubeMedia();
    media.muted = true; // no player yet — just remembered
    const player = fakePlayer();
    media.inject(player);
    expect(player.mute).toHaveBeenCalled();
    expect(player.unMute).not.toHaveBeenCalled();
  });
});
