import { useEffect, useRef } from "react";
import { ChevronDown, Clapperboard, Music2, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { hasSongAndVideo, pickSource } from "@/lib/mediaMatch";
import { songCode } from "@/lib/songCode";
import { usePlayer } from "@/player/PlayerProvider";
import type { Track } from "@/lib/types";
import { LyricsPanel } from "./LyricsPanel";
import { VinylDisc } from "./VinylDisc";
import { Visualizer } from "./Visualizer";

interface NowPlayingProps {
  open: boolean;
  onClose: () => void;
  signedIn: boolean;
  onAddLyrics: (track: Track) => void;
}

export function NowPlaying({ open, onClose, signedIn, onAddLyrics }: NowPlayingProps) {
  const p = usePlayer();
  const t = p.current;
  // The video element shows for real music videos and for songs flipped into
  // video mode.
  const showVideo = !!t && pickSource(t, p.videoMode) === "video";
  const videoMountRef = useRef<HTMLDivElement | null>(null);
  const mountVideo = p.mountVideo;

  // Borrow the player's shared <video> element while a music video is on screen.
  useEffect(() => {
    if (!open || !showVideo) return;
    mountVideo(videoMountRef.current);
    return () => mountVideo(null);
  }, [open, showVideo, mountVideo, t?.rowId]);

  if (!open || !t) return null;

  const upNext = p.order
    .map((queueIndex, orderPosition) => ({ track: p.queue[queueIndex], orderPosition }))
    .filter(({ track, orderPosition }) => track && orderPosition >= p.pos);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto animate-in fade-in slide-in-from-bottom duration-300">
      {/* Backdrop from the cover */}
      <div className="pointer-events-none absolute inset-0">
        {t.coverUrl && (
          <div
            className="absolute inset-0 scale-125 bg-cover bg-center opacity-25 blur-3xl"
            style={{ backgroundImage: `url(${t.coverUrl})` }}
          />
        )}
        <div className="absolute inset-0 bg-background/85" />
        <div className="grain-overlay absolute inset-0" />
      </div>

      <div className="relative mx-auto grid max-w-6xl gap-8 px-5 pt-5 pb-16 lg:grid-cols-[minmax(0,1fr)_330px] lg:pt-8">
        <div>
          <div className="flex items-center justify-between">
            <button
              aria-label="Close now playing"
              onClick={onClose}
              className="rounded-full p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-soft">Now playing</p>
            <span className="w-9" />
          </div>

          {/* Music video player, or cover + spinning vinyl */}
          <div className="mt-8 flex justify-center">
            {showVideo ? (
              <div
                ref={videoMountRef}
                data-testid="video-stage"
                role="region"
                aria-label="Music video"
                className="relative aspect-video w-full max-w-2xl overflow-hidden rounded-2xl bg-black shadow-2xl shadow-black/70"
              />
            ) : (
            <div className="relative flex w-full max-w-md items-center">
              <div className="z-10 w-[62%] shrink-0 overflow-hidden rounded-2xl bg-secondary shadow-2xl shadow-black/60">
                {t.coverUrl ? (
                  <img src={t.coverUrl} alt={t.album || t.title} className="aspect-square w-full object-cover" />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center bg-gradient-to-br from-accent to-background">
                    <span className="font-display text-5xl italic text-muted-foreground">{t.title}</span>
                  </div>
                )}
              </div>
              <div
                className={cn(
                  "-ml-[8%] w-[52%] shrink-0 transition-transform duration-700 ease-out",
                  p.playing ? "translate-x-[10%]" : "translate-x-0",
                )}
              >
                <VinylDisc coverUrl={t.coverUrl} label={t.title} spinning={p.playing} />
              </div>
            </div>
            )}
          </div>

          <div className="mt-8 text-center">
            <h2 className="truncate font-display text-3xl italic sm:text-4xl">{t.title}</h2>
            <p className="mt-1.5 truncate text-sm text-gold-soft">
              {t.artist}
              {t.album ? ` · ${t.album}` : ""}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {t.rowId > 0 && (
                <span
                  title="Song code — use it to find this song fast"
                  className="inline-flex items-center rounded-full border border-border px-2.5 py-1 font-mono text-[10px] tracking-[0.18em] text-muted-foreground"
                >
                  {songCode(t.rowId)}
                </span>
              )}
              {hasSongAndVideo(t) ? (
                <div
                  role="group"
                  aria-label="Playback mode"
                  className="inline-flex items-center rounded-full border border-border bg-secondary/60 p-0.5"
                >
                  <button
                    type="button"
                    aria-label="Switch to the song"
                    aria-pressed={!p.videoMode}
                    onClick={() => p.setVideoMode(false)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition",
                      !p.videoMode
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Music2 className="h-3.5 w-3.5" /> Song
                  </button>
                  <button
                    type="button"
                    aria-label="Switch to the video"
                    aria-pressed={p.videoMode}
                    onClick={() => p.setVideoMode(true)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide transition",
                      p.videoMode
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Clapperboard className="h-3.5 w-3.5" /> Video
                  </button>
                </div>
              ) : showVideo ? (
                <p className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-soft">
                  <Clapperboard className="h-3.5 w-3.5" /> Music video
                </p>
              ) : null}
            </div>
            <Visualizer active={p.playing} bars={7} className="mx-auto mt-4 h-5" />
          </div>

          <div className="mx-auto mt-6 w-full max-w-xl">
            <div className="flex items-center gap-3">
              <span className="w-11 text-right text-xs tabular-nums text-muted-foreground">
                {formatDuration(p.progress)}
              </span>
              <Slider
                value={[Math.min(p.progress, p.duration || 0)]}
                max={Math.max(p.duration, 0.1)}
                step={0.1}
                onValueChange={(v) => p.seek(v[0] ?? 0)}
                className="flex-1"
                aria-label="Seek"
              />
              <span className="w-11 text-xs tabular-nums text-muted-foreground">{formatDuration(p.duration)}</span>
            </div>
            <div className="mt-4 flex items-center justify-center gap-5">
              <button
                aria-label={p.shuffle ? "Turn off shuffle" : "Turn on shuffle"}
                onClick={p.toggleShuffle}
                className={cn(
                  "rounded-full p-2.5 transition",
                  p.shuffle ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Shuffle className="h-5 w-5" />
              </button>
              <button
                aria-label="Previous track"
                onClick={p.prev}
                className="rounded-full p-2.5 text-foreground transition hover:scale-105"
              >
                <SkipBack className="h-7 w-7 fill-current" />
              </button>
              <button
                aria-label={p.playing ? "Pause" : "Play"}
                onClick={p.toggle}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/25 transition hover:scale-105 active:scale-95"
              >
                {p.playing ? <Pause className="h-7 w-7 fill-current" /> : <Play className="h-7 w-7 fill-current" />}
              </button>
              <button
                aria-label="Next track"
                onClick={p.next}
                className="rounded-full p-2.5 text-foreground transition hover:scale-105"
              >
                <SkipForward className="h-7 w-7 fill-current" />
              </button>
              <button
                aria-label={
                  p.repeat === "one"
                    ? "Repeat one — switch to off"
                    : p.repeat === "all"
                      ? "Repeat all — switch to one"
                      : "Repeat off — switch to all"
                }
                onClick={p.cycleRepeat}
                className={cn(
                  "rounded-full p-2.5 transition",
                  p.repeat !== "off" ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p.repeat === "one" ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <LyricsPanel track={t} signedIn={signedIn} onAddLyrics={onAddLyrics} />
        </div>

        {/* Up next */}
        <aside className="h-fit rounded-2xl border border-border/70 bg-card/60 p-4 backdrop-blur">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Up next · {upNext.length}
          </h3>
          <div className="mt-3 max-h-[420px] space-y-1 overflow-y-auto pr-1">
            {upNext.map(({ track, orderPosition }) => (
              <button
                key={`${orderPosition}-${track.rowId}`}
                onClick={() => p.jumpTo(orderPosition)}
                className={cn(
                  "w-full rounded-lg px-2.5 py-2 text-left transition",
                  orderPosition === p.pos ? "bg-accent" : "hover:bg-accent/50",
                )}
              >
                <p className={cn("truncate text-sm", orderPosition === p.pos ? "font-medium text-primary" : "text-foreground")}>
                  {track.title}
                </p>
                <p className="truncate text-xs text-muted-foreground">{track.artist}</p>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
