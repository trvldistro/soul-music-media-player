import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Mic2, Pause, Play, RotateCcw, Timer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatStamp, splitLyricsText, type LyricLine } from "@/lib/lyrics";
import { useCreateLyrics, useLyrics, useSaveLyrics } from "@/lib/queries";
import { SOUL_POINTS } from "@/lib/soulPoints";
import type { Track } from "@/lib/types";
import { usePlayer } from "@/player/PlayerProvider";
import { cn } from "@/lib/utils";

interface LyricsEditorDialogProps {
  /** Track to write lyrics for; null closes the dialog. */
  track: Track | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Paste lyrics, then stamp each line with the playback position to build
 * karaoke-style synced lyrics. The first save of lyrics and the first sync
 * each earn Soul Points, verified server-side.
 */
export function LyricsEditorDialog({ track, onOpenChange }: LyricsEditorDialogProps) {
  const open = track !== null;
  const player = usePlayer();
  const lyricsQ = useLyrics(open && track ? track.rowId : null);
  const createLyrics = useCreateLyrics();
  const saveLyrics = useSaveLyrics();

  const [text, setText] = useState("");
  const [times, setTimes] = useState<Record<number, number>>({});
  const [sel, setSel] = useState(0);
  const initKeyRef = useRef("");

  const row = lyricsQ.data ?? null;
  const lines = useMemo(() => splitLyricsText(text), [text]);
  const stampedCount = Object.keys(times).length;
  const isCurrent = track != null && player.current?.rowId === track.rowId;

  // Initialize the editor whenever the dialog opens on a different lyrics row.
  useEffect(() => {
    if (!open || !track) return;
    const key = `${track.rowId}:${row ? row.rowId : "new"}`;
    if (initKeyRef.current === key) return;
    initKeyRef.current = key;
    const plain = row?.plainText ?? "";
    const split = splitLyricsText(plain);
    const initial: Record<number, number> = {};
    split.forEach((line, i) => {
      const stamped = row?.lines[i];
      if (stamped && stamped.text === line) initial[i] = stamped.t;
    });
    setText(plain);
    setTimes(initial);
    setSel(0);
  }, [open, track, row]);

  function stamp() {
    if (!lines[sel]) return;
    const at = player.progress;
    setTimes((prev) => ({ ...prev, [sel]: at }));
    setSel((s) => Math.min(s + 1, Math.max(lines.length - 1, 0)));
  }

  function handleCreate() {
    if (!track || lines.length === 0) return;
    createLyrics.mutate(
      { trackId: track.rowId, text },
      {
        onSuccess: ({ awarded }) => {
          toast.success(
            awarded > 0 ? `Lyrics saved · +${awarded} Soul Points` : "Lyrics saved",
          );
        },
        onError: (error) => {
          const message = error instanceof Error ? error.message : String(error);
          toast.error(
            message.toLowerCase().includes("unique")
              ? "This song already has lyrics."
              : "Could not save the lyrics. Try again.",
          );
        },
      },
    );
  }

  function handleSaveSync() {
    if (!row) return;
    const stamped: LyricLine[] = lines
      .map((lineText, i) => ({ t: times[i], text: lineText }))
      .filter((l): l is LyricLine & { t: number } => typeof l.t === "number")
      .sort((a, b) => a.t - b.t);
    saveLyrics.mutate(
      {
        rowId: row.rowId,
        plainText: text,
        lines: stamped,
        awardSync: row.syncState === "unsynced" && stamped.length > 0,
      },
      {
        onSuccess: ({ awarded }) => {
          toast.success(awarded > 0 ? `Sync saved · +${awarded} Soul Points` : "Sync saved");
        },
        onError: () => toast.error("Could not save the sync. Try again."),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onOpenChange(false)}>
      <DialogContent className="max-w-2xl rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl italic">
            <Mic2 className="h-5 w-5 text-primary" /> Lyrics
            {track && <span className="truncate text-sm font-normal text-muted-foreground">· {track.title}</span>}
          </DialogTitle>
          <DialogDescription>
            {row
              ? "Play the song, then stamp each line at the moment it's sung. Tap a line to select it."
              : "Paste the lyrics for this song — one line per row. You'll sync them next."}
          </DialogDescription>
        </DialogHeader>

        {lyricsQ.isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !row ? (
          <div className="space-y-4">
            <Textarea
              aria-label="Lyrics text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={"First line of the verse…\nSecond line…\n\nChorus goes here…"}
              rows={10}
              className="font-mono text-sm"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                +{SOUL_POINTS.lyrics} Soul Points for the first lyrics on a song.
              </p>
              <Button
                className="rounded-full font-semibold"
                disabled={createLyrics.isPending || lines.length === 0}
                onClick={handleCreate}
              >
                {createLyrics.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save lyrics
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-secondary/40 p-2.5">
              <Button
                size="sm"
                variant="secondary"
                className="rounded-full"
                onClick={() => (isCurrent ? player.toggle() : track && player.playTracks([track], 0))}
              >
                {isCurrent && player.playing ? (
                  <Pause className="mr-1.5 h-3.5 w-3.5" />
                ) : (
                  <Play className="mr-1.5 h-3.5 w-3.5" />
                )}
                {isCurrent ? (player.playing ? "Pause" : "Play") : "Load track"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full"
                onClick={() => player.seek(0)}
                aria-label="Restart playback"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              <span className="ml-1 rounded-full bg-card px-2.5 py-1 text-xs tabular-nums text-gold-soft">
                {formatStamp(player.progress)}
              </span>
              <Button
                size="sm"
                className="ml-auto rounded-full font-semibold"
                onClick={stamp}
                disabled={!lines[sel]}
              >
                <Timer className="mr-1.5 h-3.5 w-3.5" /> Stamp line {sel + 1}
              </Button>
            </div>

            <div className="max-h-72 space-y-1 overflow-y-auto rounded-xl border border-border/60 p-2">
              {lines.map((line, i) => {
                const t = times[i];
                return (
                  <button
                    key={i}
                    onClick={() => setSel(i)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2.5 py-1.5 text-left transition",
                      i === sel ? "bg-accent" : "hover:bg-accent/50",
                    )}
                  >
                    <span
                      className={cn(
                        "w-14 shrink-0 rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold tabular-nums",
                        t != null
                          ? "bg-primary/15 text-primary"
                          : "border border-border text-muted-foreground",
                      )}
                    >
                      {t != null ? formatStamp(t) : "—:—"}
                    </span>
                    <span className={cn("truncate text-sm", i === sel ? "text-foreground" : "text-muted-foreground")}>
                      {line}
                    </span>
                  </button>
                );
              })}
              {lines.length === 0 && (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                  No lines yet — edit the text and save again.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {stampedCount}/{lines.length} lines stamped ·{" "}
                {row.syncState === "unsynced"
                  ? `first sync earns +${SOUL_POINTS.lyrics_sync} Soul Points`
                  : "already synced"}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full"
                  disabled={stampedCount === 0}
                  onClick={() => setTimes({})}
                >
                  Clear stamps
                </Button>
                <Button
                  size="sm"
                  className="rounded-full font-semibold"
                  disabled={saveLyrics.isPending || lines.length === 0}
                  onClick={handleSaveSync}
                >
                  {saveLyrics.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                  Save sync
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
