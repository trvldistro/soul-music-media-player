import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Track } from "@/lib/types";
import { buildOrder, nextPos, prevPos, type RepeatMode } from "./queue";
import { hasSongAndVideo, pickSource } from "@/lib/mediaMatch";
import { YouTubeMedia } from "./youtube";
import { recordPlay } from "@/lib/plays";
import {
  closeDeviceMedia,
  openDeviceMedia,
  rememberDeviceDuration,
} from "@/lib/deviceStorage";

export interface PlayerApi {
  current: Track | null;
  playing: boolean;
  queue: Track[];
  order: number[];
  pos: number;
  shuffle: boolean;
  repeat: RepeatMode;
  volume: number;
  muted: boolean;
  progress: number;
  duration: number;
  playTracks: (tracks: Track[], startIndex?: number, opts?: { preferVideo?: boolean }) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (seconds: number) => void;
  jumpTo: (orderPosition: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setVolume: (v: number) => void;
  toggleMuted: () => void;
  /**
   * Moves the shared music-video element into `target` so it can be shown.
   * Pass null to tuck it away again — playback keeps running either way.
   */
  mountVideo: (target: HTMLElement | null) => void;
  /**
   * Points YouTube's parked player box at `target` (the Now Playing stage).
   * Pass null to fall back to the small floating thumbnail. The iframe
   * itself never moves — moving it would restart the song.
   */
  mountYouTube: (target: HTMLElement | null) => void;
  /** True while the current song plays through its attached video. */
  videoMode: boolean;
  /** True when the current song has both audio and an attached video. */
  videoAvailable: boolean;
  /** Flips the current song between its audio and its attached video. */
  setVideoMode: (on: boolean) => void;
}

/** Anything the player can drive: a real media element or YouTube's player. */
type ActiveMedia = HTMLMediaElement | YouTubeMedia;

const PlayerContext = createContext<PlayerApi | null>(null);

const VOLUME_KEY = "soul:volume";

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  if (audioRef.current === null && typeof window !== "undefined") {
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;
  }
  // One persistent <video> element, rendered below and lent to the Now Playing
  // overlay while a music video is on screen.
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const videoHomeRef = useRef<HTMLDivElement | null>(null);
  // YouTube's official player, parked in its own box below. The box is styled
  // into view (never reparented) so the video never restarts.
  const ytRef = useRef<YouTubeMedia | null>(null);
  if (ytRef.current === null) ytRef.current = new YouTubeMedia();
  const ytHomeRef = useRef<HTMLDivElement | null>(null);
  const ytStageTargetRef = useRef<HTMLElement | null>(null);

  const [queue, setQueue] = useState<Track[]>([]);
  const [order, setOrder] = useState<number[]>([]);
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [volume, setVolumeState] = useState<number>(() => {
    if (typeof window === "undefined") return 0.9;
    const stored = window.localStorage.getItem(VOLUME_KEY);
    const parsed = stored === null ? Number.NaN : Number(stored);
    return Number.isFinite(parsed) ? parsed : 0.9;
  });
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  // Whether a song that also has an attached video should play through the video.
  const [videoMode, setVideoModeState] = useState(false);

  const current = queue[order[pos] ?? -1] ?? null;
  // Which source plays: YouTube's player, the video element, or the audio element.
  const source = current ? pickSource(current, videoMode) : "audio";
  const isVideoTrack = source === "video";

  // Latest values for stable event listeners.
  const live = useRef({ order, pos, repeat, playing, queue });
  live.current = { order, pos, repeat, playing, queue };

  // The element that plays the current track.
  const activeElRef = useRef<ActiveMedia | null>(audioRef.current);
  activeElRef.current =
    source === "youtube"
      ? ytRef.current
      : isVideoTrack
        ? videoElRef.current
        : audioRef.current;

  // ended / loadedmetadata listeners (attached once to all three elements)
  useEffect(() => {
    const media: ActiveMedia[] = [audioRef.current, videoElRef.current, ytRef.current].filter(
      (el): el is ActiveMedia => el != null,
    );
    const onEnded = (event: Event) => {
      const el = event.target as ActiveMedia | null;
      if (el == null || el !== activeElRef.current) return;
      const { order: o, pos: p, repeat: r } = live.current;
      if (r === "one") {
        el.currentTime = 0;
        el.play().catch(() => undefined);
        return;
      }
      const np = nextPos(o.length, p, r);
      if (np === null) {
        setPlaying(false);
        setProgress(0);
        el.currentTime = 0;
        return;
      }
      setPos(np);
      // The auto-advanced track counts as played too.
      void recordPlay(live.current.queue[o[np] ?? -1] ?? null);
    };
    const onLoaded = (event: Event) => {
      const el = event.target as ActiveMedia | null;
      if (el == null || el !== activeElRef.current) return;
      if (Number.isFinite(el.duration) && el.duration > 0) {
        setDuration(el.duration);
        const track = live.current.queue[live.current.order[live.current.pos] ?? -1] ?? null;
        if (track?.devicePath) rememberDeviceDuration(track.devicePath, el.duration);
      }
    };
    const onError = (event: Event) => {
      if (event.target !== activeElRef.current) return;
      // A missing or unloadable file: stop pretending it is playing.
      console.warn("[player] media failed to load");
    };
    for (const el of media) {
      el.addEventListener("ended", onEnded);
      el.addEventListener("loadedmetadata", onLoaded);
      el.addEventListener("error", onError);
    }
    return () => {
      for (const el of media) {
        el.removeEventListener("ended", onEnded);
        el.removeEventListener("loadedmetadata", onLoaded);
        el.removeEventListener("error", onError);
      }
    };
  }, []);

  // Park YouTube's player box off-screen; views style it into place later.
  useEffect(() => {
    const home = ytHomeRef.current;
    if (home) ytRef.current?.attach(home);
  }, []);

  // Load the current track into the right element and retire the others.
  // Device-storage tracks resolve their playable URL on demand, straight from
  // the visitor's storage, so loading is async with a cancellation guard.
  const prevDevicePathRef = useRef<string | null>(null);
  // Position to restore after flipping between a song's audio and its video.
  const resumeAtRef = useRef<number | null>(null);
  useEffect(() => {
    const audio = audioRef.current;
    const video = videoElRef.current;
    const yt = ytRef.current;
    const retireEl = (el: HTMLMediaElement | null) => {
      if (!el) return;
      el.pause();
      el.removeAttribute("src");
      el.load();
    };
    let cancelled = false;
    const run = async () => {
      if (!current) {
        closeDeviceMedia(prevDevicePathRef.current);
        prevDevicePathRef.current = null;
        retireEl(audio);
        retireEl(video);
        yt?.pause();
        setProgress(0);
        setDuration(0);
        return;
      }
      // Coming back from a flip between audio and video: land at the same spot.
      const resumeAt = resumeAtRef.current;
      resumeAtRef.current = null;
      // Songs streamed from YouTube play through the official embedded player.
      if (source === "youtube" && current.youtubeId) {
        closeDeviceMedia(prevDevicePathRef.current);
        prevDevicePathRef.current = null;
        retireEl(audio);
        retireEl(video);
        try {
          await yt?.load(current.youtubeId, {
            startAt: resumeAt ?? 0,
            autoplay: live.current.playing,
          });
        } catch {
          console.warn("[player] YouTube player failed to load");
        }
        if (cancelled) return;
        setProgress(resumeAt ?? 0);
        setDuration(current.duration || 0);
        return;
      }
      let src: string;
      if (current.devicePath) {
        const previous = prevDevicePathRef.current;
        if (previous && previous !== current.devicePath) closeDeviceMedia(previous);
        prevDevicePathRef.current = current.devicePath;
        try {
          src = await openDeviceMedia(current.devicePath);
        } catch {
          console.warn("[player] could not read from device storage");
          src = "";
        }
      } else {
        if (prevDevicePathRef.current) closeDeviceMedia(prevDevicePathRef.current);
        prevDevicePathRef.current = null;
        src = isVideoTrack && video ? current.videoUrl || current.audioUrl : current.audioUrl;
      }
      if (cancelled) return;
      const el = isVideoTrack && video ? video : audio;
      if (isVideoTrack && video) {
        video.src = src;
        retireEl(audio);
      } else if (audio) {
        audio.src = src;
        retireEl(video);
      }
      yt?.pause();
      setProgress(0);
      setDuration(current.duration || 0);
      if (resumeAt != null && el) {
        const seekTo = () => {
          try {
            el.currentTime = resumeAt;
          } catch {
            /* not seekable yet — the listener below catches it */
          }
        };
        if (el.readyState >= 1) seekTo();
        else el.addEventListener("loadedmetadata", seekTo, { once: true });
        setProgress(resumeAt);
      }
      if (live.current.playing && el) el.play().catch(() => undefined);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [current?.rowId, source]);

  // Play / pause intent.
  useEffect(() => {
    const el = activeElRef.current;
    if (!el || !current) return;
    if (playing) {
      el.play().catch(() => undefined);
    } else {
      el.pause();
    }
  }, [playing, current?.rowId, source]);

  // Volume.
  useEffect(() => {
    for (const el of [audioRef.current, videoElRef.current, ytRef.current]) {
      if (el) el.volume = muted ? 0 : volume;
    }
    if (!muted) {
      window.localStorage.setItem(VOLUME_KEY, String(volume));
    }
  }, [volume, muted]);

  // Smooth progress via rAF while playing.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const el = activeElRef.current;
      if (el) setProgress(el.currentTime || 0);
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [playing]);

  // Lock-screen / media key metadata.
  useEffect(() => {
    if (!current) return;
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return;
    if (typeof MediaMetadata === "undefined") return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: current.title,
        artist: current.artist,
        album: current.album,
        artwork: current.coverUrl ? [{ src: current.coverUrl }] : [],
      });
    } catch {
      /* mediaSession is a nice-to-have */
    }
  }, [current]);

  const playTracks = useCallback(
    (tracks: Track[], startIndex = 0, opts?: { preferVideo?: boolean }) => {
      if (tracks.length === 0) return;
      setQueue(tracks);
      setOrder(buildOrder(tracks.length, startIndex, shuffle));
      setPos(0);
      setPlaying(true);
      // Starting from the videos shelf opens the attached video straight away.
      setVideoModeState(!!opts?.preferVideo);
      // Counting the play the moment it is requested — device files (negative
      // row ids) are skipped inside recordPlay and stay fully off the server.
      void recordPlay(tracks[startIndex]);
    },
    [shuffle],
  );

  const toggle = useCallback(() => {
    if (!current) return;
    setPlaying((p) => !p);
  }, [current]);

  const next = useCallback(() => {
    const { order: o, pos: p, repeat: r } = live.current;
    const effectiveRepeat: RepeatMode = r === "one" ? "all" : r;
    const np = nextPos(o.length, p, effectiveRepeat);
    if (np === null) {
      setPlaying(false);
      return;
    }
    setPos(np);
    void recordPlay(live.current.queue[o[np] ?? -1] ?? null);
  }, []);

  const prev = useCallback(() => {
    const el = activeElRef.current;
    if (el && el.currentTime > 3) {
      el.currentTime = 0;
      setProgress(0);
      return;
    }
    const { order: o, pos: p, repeat: r } = live.current;
    setPos(prevPos(o.length, p, r));
  }, []);

  const seek = useCallback((seconds: number) => {
    const el = activeElRef.current;
    if (!el || !Number.isFinite(seconds)) return;
    el.currentTime = Math.max(0, seconds);
    setProgress(el.currentTime);
  }, []);

  const jumpTo = useCallback((orderPosition: number) => {
    setPos(orderPosition);
    void recordPlay(live.current.queue[live.current.order[orderPosition] ?? -1] ?? null);
  }, []);

  const toggleShuffle = useCallback(() => {
    const nextShuffle = !shuffle;
    setShuffle(nextShuffle);
    if (queue.length > 0) {
      const currentTrack = queue[order[pos] ?? 0] ?? queue[0];
      const startIndex = currentTrack ? queue.indexOf(currentTrack) : 0;
      setOrder(buildOrder(queue.length, startIndex, nextShuffle));
      setPos(0);
    }
  }, [shuffle, queue, order, pos]);

  const cycleRepeat = useCallback(() => {
    setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"));
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    setVolumeState(clamped);
    if (clamped > 0) setMuted(false);
  }, []);

  const toggleMuted = useCallback(() => setMuted((m) => !m), []);

  const setVideoMode = useCallback(
    (on: boolean) => {
      const track = live.current.queue[live.current.order[live.current.pos] ?? -1] ?? null;
      if (!track || !hasSongAndVideo(track)) return;
      if (on === videoMode) return;
      const el = activeElRef.current;
      resumeAtRef.current = el ? el.currentTime : null;
      setVideoModeState(on);
    },
    [videoMode],
  );

  const mountVideo = useCallback((target: HTMLElement | null) => {
    const video = videoElRef.current;
    if (!video) return;
    const parent = target ?? videoHomeRef.current;
    if (parent && video.parentElement !== parent) {
      parent.appendChild(video);
    }
  }, []);

  const mountYouTube = useCallback((target: HTMLElement | null) => {
    ytStageTargetRef.current = target;
  }, []);

  // YouTube's iframe cannot be moved around the DOM (it would reload and
  // restart the song), so its parked box is styled into place instead:
  // exactly over the Now Playing stage while that screen is open, otherwise a
  // small floating thumbnail above the player bar.
  useEffect(() => {
    if (source !== "youtube") return;
    const box = ytHomeRef.current;
    if (!box) return;
    let raf = 0;
    const apply = () => {
      const target = ytStageTargetRef.current;
      if (target && target.isConnected) {
        const r = target.getBoundingClientRect();
        box.style.cssText =
          `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;` +
          `z-index:55;overflow:hidden;border-radius:1rem;pointer-events:auto;`;
      } else {
        box.style.cssText =
          "position:fixed;right:1rem;bottom:6rem;width:168px;height:94.5px;z-index:45;" +
          "overflow:hidden;border-radius:0.75rem;box-shadow:0 12px 32px rgba(0,0,0,.45);" +
          "pointer-events:none;";
      }
    };
    const tick = () => {
      apply();
      raf = window.requestAnimationFrame(tick);
    };
    apply();
    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
      box.style.cssText = "";
    };
  }, [source]);

  const api = useMemo<PlayerApi>(
    () => ({
      current,
      playing,
      queue,
      order,
      pos,
      shuffle,
      repeat,
      volume,
      muted,
      progress,
      duration,
      playTracks,
      toggle,
      next,
      prev,
      seek,
      jumpTo,
      toggleShuffle,
      cycleRepeat,
      setVolume,
      toggleMuted,
      mountVideo,
      mountYouTube,
      videoMode,
      videoAvailable: hasSongAndVideo(current),
      setVideoMode,
    }),
    [
      current,
      playing,
      queue,
      order,
      pos,
      shuffle,
      repeat,
      volume,
      muted,
      progress,
      duration,
      playTracks,
      toggle,
      next,
      prev,
      seek,
      jumpTo,
      toggleShuffle,
      cycleRepeat,
      setVolume,
      toggleMuted,
      mountVideo,
      mountYouTube,
      videoMode,
      setVideoMode,
      current,
    ],
  );

  // Keyboard shortcuts (space = play/pause, arrows = seek & volume).
  const apiRef = useRef(api);
  apiRef.current = api;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const player = apiRef.current;
      if (e.code === "Space") {
        e.preventDefault();
        player.toggle();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        player.seek(player.progress + 5);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        player.seek(Math.max(0, player.progress - 5));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        player.setVolume(player.volume + 0.05);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        player.setVolume(player.volume - 0.05);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <PlayerContext.Provider value={api}>
      {children}
      {/* Persistent home for the shared music-video element — out of sight, still playing. */}
      <div
        ref={videoHomeRef}
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 h-0 w-0 overflow-hidden"
      >
        <video
          ref={videoElRef}
          playsInline
          preload="metadata"
          className="h-full w-full object-contain"
        />
      </div>
      {/* Parked home for YouTube's official embedded player — styled into view
          while a YouTube song plays, never moved. */}
      <div
        ref={ytHomeRef}
        aria-hidden
        className="pointer-events-none fixed top-0 left-0 h-0 w-0 overflow-hidden bg-black"
      />
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerApi {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used inside <PlayerProvider>");
  return ctx;
}
