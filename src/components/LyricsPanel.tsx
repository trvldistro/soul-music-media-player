import { useEffect, useMemo, useRef } from "react";
import { Mic2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { activeLineIndex } from "@/lib/lyrics";
import { useLyrics } from "@/lib/queries";
import type { Track } from "@/lib/types";
import { usePlayer } from "@/player/PlayerProvider";

interface LyricsPanelProps {
  track: Track;
  signedIn: boolean;
  onAddLyrics: (track: Track) => void;
}

/** Lyrics in the now-playing view: karaoke-synced when timestamps exist. */
export function LyricsPanel({ track, signedIn, onAddLyrics }: LyricsPanelProps) {
  const player = usePlayer();
  const lyricsQ = useLyrics(track.rowId);
  const lyrics = lyricsQ.data ?? null;
  const lines = lyrics?.lines ?? [];
  const active = useMemo(() => activeLineIndex(lines, player.progress), [lines, player.progress]);
  const activeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [active]);

  if (lyricsQ.isLoading) {
    return (
      <div className="mx-auto mt-8 w-full max-w-xl space-y-2" aria-label="Loading lyrics">
        <div className="mx-auto h-3 w-24 animate-pulse rounded bg-secondary/70" />
        <div className="mx-auto h-3 w-64 animate-pulse rounded bg-secondary/70" />
        <div className="mx-auto h-3 w-48 animate-pulse rounded bg-secondary/70" />
      </div>
    );
  }

  if (!lyrics) {
    if (!signedIn) return null;
    return (
      <div className="mx-auto mt-8 w-full max-w-xl text-center">
        <Button
          variant="outline"
          className="rounded-full"
          onClick={() => onAddLyrics(track)}
        >
          <Mic2 className="mr-2 h-4 w-4" /> Add lyrics for this song
        </Button>
      </div>
    );
  }

  return (
    <section className="mx-auto mt-8 w-full max-w-xl" aria-label="Lyrics">
      <div className="mb-2 flex items-center justify-center gap-2">
        <Mic2 className="h-3.5 w-3.5 text-gold-soft" aria-hidden />
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Lyrics{lines.length > 0 ? " · tap a line to jump" : ""}
        </p>
      </div>

      {lines.length === 0 ? (
        <p className="max-h-60 overflow-y-auto whitespace-pre-line px-2 text-center text-sm leading-relaxed text-muted-foreground">
          {lyrics.plainText}
        </p>
      ) : (
        <div className="max-h-72 space-y-1 overflow-y-auto px-2 py-2 text-center">
          {lines.map((line, i) => (
            <button
              key={`${line.t}-${i}`}
              ref={i === active ? activeRef : undefined}
              onClick={() => player.seek(Math.max(0, line.t))}
              className={cn(
                "block w-full rounded-lg px-3 py-1.5 text-sm leading-snug transition-all",
                i === active
                  ? "scale-[1.04] font-semibold text-primary"
                  : i < active
                    ? "text-muted-foreground/50 hover:text-muted-foreground"
                    : "text-muted-foreground hover:text-foreground",
              )}
            >
              {line.text}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
