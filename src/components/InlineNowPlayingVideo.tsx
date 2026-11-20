import { useEffect, useState } from "react";
import { Minus, Music2 } from "lucide-react";
import { usePlayer } from "@/player/PlayerProvider";
import { NowPlayingVideo } from "./NowPlayingScreen";

/**
 * While a video plays and the full player screen is closed, the video lives
 * here: large, in the middle of the page, right above the player bar — with
 * the same transport controls. Minimising it shrinks it to a live thumbnail
 * in the corner so the page underneath is usable again.
 */
export function InlineNowPlayingVideo({ visible }: { visible: boolean }) {
  const p = usePlayer();
  const [minimised, setMinimised] = useState(false);
  const playing = p.current;

  // Picking a different video brings it back on screen.
  useEffect(() => {
    setMinimised(false);
  }, [playing?.rowId]);

  useEffect(() => {
    if (!visible) return;
    if (minimised) p.setVideoPlacement("corner");
    else p.setVideoPlacement("inline");
  }, [visible, minimised, p]);

  if (!visible || !playing || minimised) return null;

  return (
    <div
      data-testid="inline-video-screen"
      className="fixed inset-x-0 bottom-[76px] z-30 animate-in fade-in slide-in-from-bottom duration-200"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/95 to-background/70" />
      <div className="relative mx-auto max-w-3xl px-4 pb-4 pt-3">
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-2xl shadow-black/60 backdrop-blur">
          <NowPlayingVideo
            track={playing}
            className="relative aspect-video w-full overflow-hidden bg-black"
          />
          <div className="flex items-center gap-3 px-3 py-2.5">
            <button
              type="button"
              onClick={p.toggle}
              aria-label={p.playing ? "Pause" : "Play"}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:scale-105"
            >
              {p.playing ? (
                <span className="block h-3.5 w-3.5 border-x-[3px] border-current" />
              ) : (
                <span className="ml-0.5 block h-0 w-0 border-y-[6px] border-l-[10px] border-y-transparent border-l-current" />
              )}
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{playing.title}</p>
              <p className="truncate text-xs text-muted-foreground">{playing.artist}</p>
            </div>
            <button
              type="button"
              onClick={p.toggleMuted}
              aria-label={p.muted ? "Unmute" : "Mute"}
              className="rounded-full p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <Music2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setMinimised(true)}
              aria-label="Minimise the video"
              className="rounded-full p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <Minus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
