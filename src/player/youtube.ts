/**
 * YouTube's official IFrame Player, wrapped to behave like the <audio> and
 * <video> elements the player already drives: play/pause, currentTime,
 * duration, volume and the "timeupdate" / "ended" / "loadedmetadata" /
 * "error" events the player listens for.
 *
 * One hard rule: the iframe is never moved around the DOM. Moving an iframe
 * reloads it, which would restart the song. The provider styles its parked
 * box into view instead (see PlayerProvider).
 */

export interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  setVolume(volume: number): void;
  loadVideoById(options: { videoId: string; startSeconds?: number }): void;
  destroy(): void;
}

interface YTPlayerOptions {
  width?: string | number;
  height?: string | number;
  videoId?: string;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (event: { target: YTPlayer }) => void;
    onStateChange?: (event: { data: number; target: YTPlayer }) => void;
    onError?: (event: { data: number }) => void;
  };
}

interface YTNamespace {
  Player: new (element: HTMLElement, options: YTPlayerOptions) => YTPlayer;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number; CUED: number };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;

/** Loads YouTube's official IFrame API exactly once. */
export function loadYouTubeApi(): Promise<YTNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube player needs a browser"));
  }
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YTNamespace>((resolve, reject) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      if (window.YT) resolve(window.YT);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      apiPromise = null;
      reject(new Error("YouTube player failed to load"));
    };
    document.head.appendChild(script);
  });
  return apiPromise;
}

/**
 * The adapter itself. Everything the player needs from a media element is
 * here, routed to YouTube's official player.
 */
export class YouTubeMedia {
  private player: YTPlayer | null = null;
  /** The wrapper the iframe lives in — created once, never moved. */
  private wrapper: HTMLElement | null = null;
  private home: HTMLElement | null = null;
  private listeners = new Map<string, Set<(event: Event) => void>>();
  private tick: number | null = null;
  private announcedDuration = false;
  private pendingPlay = false;
  private volume01 = 0.9;
  paused = true;
  readyState = 0;

  /** Parks the wrapper inside `home` (a 0×0 box the provider styles into view). */
  attach(home: HTMLElement | null): void {
    this.home = home;
    if (this.wrapper && home && this.wrapper.parentElement !== home) {
      home.appendChild(this.wrapper);
    }
  }

  addEventListener(type: string, listener: (event: Event) => void): void {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener);
    this.listeners.set(type, set);
  }

  removeEventListener(type: string, listener: (event: Event) => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  private emit(type: string): void {
    const event = new Event(type);
    for (const listener of [...(this.listeners.get(type) ?? [])]) {
      listener(event);
    }
  }

  get currentTime(): number {
    return this.player?.getCurrentTime() ?? 0;
  }

  set currentTime(seconds: number) {
    if (this.player && Number.isFinite(seconds)) {
      this.player.seekTo(Math.max(0, seconds), true);
    }
  }

  get duration(): number {
    return this.player?.getDuration() ?? 0;
  }

  get volume(): number {
    return this.volume01;
  }

  set volume(v: number) {
    this.volume01 = Math.min(1, Math.max(0, v));
    if (this.player) this.player.setVolume(Math.round(this.volume01 * 100));
  }

  /** Loads (or swaps) a video. Safe to call before the API script finishes. */
  async load(videoId: string, opts?: { startAt?: number; autoplay?: boolean }): Promise<void> {
    const startSeconds = Math.max(0, Math.floor(opts?.startAt ?? 0));
    if (opts?.autoplay) this.pendingPlay = true;
    if (this.player) {
      this.announcedDuration = false;
      this.player.loadVideoById({ videoId, startSeconds });
      return;
    }
    const YT = await loadYouTubeApi();
    const home = this.home ?? document.body;
    const wrapper = document.createElement("div");
    wrapper.className = "h-full w-full";
    home.appendChild(wrapper);
    this.wrapper = wrapper;
    this.announcedDuration = false;
    this.player = new YT.Player(wrapper, {
      width: "100%",
      height: "100%",
      videoId,
      playerVars: {
        playsinline: 1,
        rel: 0,
        ...(startSeconds > 0 ? { start: startSeconds } : {}),
      },
      events: {
        onReady: () => {
          this.readyState = 1;
          this.player?.setVolume(Math.round(this.volume01 * 100));
          if (this.pendingPlay) this.player?.playVideo();
        },
        onStateChange: (event: { data: number }) => this.handleStateChange(event.data),
        onError: () => this.emit("error"),
      },
    });
  }

  /** YouTube's own state numbers: 1 playing, 2 paused, 0 ended. */
  handleStateChange(state: number): void {
    if (state === 1) {
      this.paused = false;
      this.pendingPlay = false;
      if (!this.announcedDuration && this.duration > 0) {
        this.announcedDuration = true;
        this.readyState = 1;
        this.emit("loadedmetadata");
      }
      this.startTicking();
    } else if (state === 0) {
      this.paused = true;
      this.stopTicking();
      this.emit("ended");
    } else if (state === 2) {
      this.paused = true;
      this.stopTicking();
    }
  }

  private startTicking(): void {
    if (this.tick != null) return;
    this.tick = window.setInterval(() => {
      this.emit("timeupdate");
      if (!this.announcedDuration && this.duration > 0) {
        this.announcedDuration = true;
        this.emit("loadedmetadata");
      }
    }, 250);
  }

  private stopTicking(): void {
    if (this.tick != null) {
      window.clearInterval(this.tick);
      this.tick = null;
    }
  }

  play(): Promise<void> {
    if (this.player) {
      this.player.playVideo();
    } else {
      this.pendingPlay = true;
    }
    this.paused = false;
    return Promise.resolve();
  }

  pause(): void {
    this.pendingPlay = false;
    this.paused = true;
    this.player?.pauseVideo();
  }

  /** Test seam: pretend YouTube handed us a ready-made player. */
  inject(player: YTPlayer): void {
    this.player = player;
    this.readyState = 1;
    player.setVolume(Math.round(this.volume01 * 100));
    if (this.pendingPlay) player.playVideo();
  }
}
