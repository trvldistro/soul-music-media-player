import {
  ChevronUp,
  Clapperboard,
  Heart,
  Music2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePlayer } from "@/player/PlayerProvider";
import { Visualizer } from "./Visualizer";

interface PlayerBarProps {
  favorite?: boolean;
  canFavorite?: boolean;
  onToggleFavorite?: () => void;
  onExpand: () => void;
}

export function PlayerBar({ favorite, canFavorite, onToggleFavorite, onExpand }: PlayerBarProps) {
  const p = usePlayer();
  const t = p.current;
  const isMobile = useIsMobile();

  return (
    <div data-testid="player-bar" className="glass fixed inset-x-0 bottom-0 z-40 border-t border-border/80">
      <div className="mx-auto flex h-[76px] max-w-[1700px] items-center gap-3 px-3 sm:gap-4 sm:px-5">
        {/* Now playing */}
        <div className="flex min-w-0 flex-1 items-center gap-3 md:w-80 md:flex-none">
          {t ? (
            <>
              {t.coverUrl ? (
                <img src={t.coverUrl} alt="" className="h-12 w-12 rounded-md object-cover shadow" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-secondary">
                  <Music2 className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.title}</p>
                <p className="truncate text-xs text-muted-foreground">{t.artist}</p>
              </div>
              {canFavorite && onToggleFavorite && (
                <button
                  aria-label={favorite ? `Unfavorite ${t.title}` : `Favorite ${t.title}`}
                  aria-pressed={favorite}
                  onClick={onToggleFavorite}
                  className="hidden rounded-full p-2 text-muted-foreground transition hover:bg-secondary hover:text-rose sm:block"
                >
                  <Heart className={cn("h-4 w-4", favorite && "fill-rose text-rose")} />
                </button>
              )}
              {p.videoAvailable && (
                <button
                  aria-label={p.videoMode ? "Play the song" : "Play the video"}
                  aria-pressed={p.videoMode}
                  title={p.videoMode ? "Switch to the song" : "Switch to the video"}
                  onClick={() => p.setVideoMode(!p.videoMode)}
                  className="hidden rounded-full p-2 text-muted-foreground transition hover:bg-secondary hover:text-gold-soft sm:block"
                >
                  {p.videoMode ? <Music2 className="h-4 w-4" /> : <Clapperboard className="h-4 w-4" />}
                </button>
              )}
            </>
          ) : (
            <p className="truncate text-sm text-muted-foreground">Nothing spinning — pick a groove</p>
          )}
        </div>

        {/* Transport (desktop) */}
        {!isMobile && (
        <div className="flex flex-1 flex-col items-center gap-1.5">
          <div className="flex items-center gap-2">
            <button
              aria-label={p.shuffle ? "Turn off shuffle" : "Turn on shuffle"}
              onClick={p.toggleShuffle}
              className={cn(
                "rounded-full p-2 transition",
                p.shuffle ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Shuffle className="h-4 w-4" />
            </button>
            <button
              aria-label="Previous track"
              onClick={p.prev}
              className="rounded-full p-2 text-muted-foreground transition hover:text-foreground"
            >
              <SkipBack className="h-5 w-5 fill-current" />
            </button>
            <button
              aria-label={p.playing ? "Pause" : "Play"}
              onClick={p.toggle}
              disabled={!t}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/20 transition hover:scale-105 active:scale-95 disabled:opacity-40"
            >
              {p.playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
            </button>
            <button
              aria-label="Next track"
              onClick={p.next}
              className="rounded-full p-2 text-muted-foreground transition hover:text-foreground"
            >
              <SkipForward className="h-5 w-5 fill-current" />
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
                "rounded-full p-2 transition",
                p.repeat !== "off" ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p.repeat === "one" ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex w-full max-w-xl items-center gap-3">
            <span className="w-10 text-right text-[11px] tabular-nums text-muted-foreground">
              {formatDuration(p.progress)}
            </span>
            <Slider
              value={[Math.min(p.progress, p.duration || 0)]}
              max={Math.max(p.duration, 0.1)}
              step={0.1}
              onValueChange={(v) => p.seek(v[0] ?? 0)}
              disabled={!t}
              className="flex-1"
              aria-label="Seek"
            />
            <span className="w-10 text-[11px] tabular-nums text-muted-foreground">
              {formatDuration(p.duration)}
            </span>
          </div>
        </div>
        )}

        {/* Right side */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Visualizer active={p.playing} className="hidden lg:flex" />
          {/* Mobile transport */}
          {isMobile && (
            <>
              <button
                aria-label={p.playing ? "Pause" : "Play"}
                onClick={p.toggle}
                disabled={!t}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
              >
                {p.playing ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
              </button>
              <button
                aria-label="Next track"
                onClick={p.next}
                className="rounded-full p-2 text-muted-foreground transition hover:text-foreground"
              >
                <SkipForward className="h-5 w-5 fill-current" />
              </button>
            </>
          )}
          {!isMobile && (
          <div className="flex items-center gap-2">
            <button
              aria-label={p.muted ? "Unmute" : "Mute"}
              onClick={p.toggleMuted}
              className="rounded-full p-2 text-muted-foreground transition hover:text-foreground"
            >
              {p.muted || p.volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <Slider
              value={[p.muted ? 0 : p.volume]}
              max={1}
              step={0.01}
              onValueChange={(v) => p.setVolume(v[0] ?? 0)}
              className="w-20"
              aria-label="Volume"
            />
          </div>
          )}
          <button
            aria-label="Open now playing"
            onClick={onExpand}
            disabled={!t}
            className="rounded-full p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-40"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
