import { Clapperboard, Clock, Heart, Lock, Mic2, MoreHorizontal, Music2, Pencil, Play, Plus, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatDuration, formatPlayCount } from "@/lib/format";
import { songCode } from "@/lib/songCode";
import { Visualizer } from "./Visualizer";
import type { Track } from "@/lib/types";

interface TrackRowProps {
  track: Track;
  index: number;
  isCurrent?: boolean;
  isPlaying?: boolean;
  isFavorite?: boolean;
  canFavorite?: boolean;
  onPlay: () => void;
  onToggleFavorite?: () => void;
  onAddToPlaylist?: () => void;
  onEdit?: () => void;
  /** True when the uploader already spent their one edit — shows a locked, disabled item. */
  editUsed?: boolean;
  /** Opens the artist page for this track's artist. */
  onOpenArtist?: (name: string) => void;
  /** Opens the timed-lyrics editor for this track. */
  onLyrics?: () => void;
  onRemove?: () => void;
}

export function TrackRow({
  track,
  index,
  isCurrent = false,
  isPlaying = false,
  isFavorite = false,
  canFavorite = false,
  onPlay,
  onToggleFavorite,
  onAddToPlaylist,
  onEdit,
  editUsed = false,
  onOpenArtist,
  onLyrics,
  onRemove,
}: TrackRowProps) {
  return (
    <div
      className={cn(
        "group grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50 md:grid-cols-[2.25rem_minmax(0,1fr)_minmax(0,9rem)_6rem_4.5rem_auto]",
        isCurrent && "bg-accent/40",
      )}
    >
      <div className="relative flex h-6 w-9 items-center justify-center">
        {isCurrent ? (
          <Visualizer active={isPlaying} bars={3} className="h-3.5" />
        ) : (
          <>
            <span className="text-sm tabular-nums text-muted-foreground group-hover:invisible">
              {index}
            </span>
            <button
              aria-label={`Play ${track.title}`}
              onClick={onPlay}
              className="absolute inset-0 flex items-center justify-center text-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              <Play className="h-4 w-4 fill-current" />
            </button>
          </>
        )}
      </div>

      <div className="flex min-w-0 items-center gap-3">
        {track.coverUrl ? (
          <img
            src={track.coverUrl}
            alt=""
            className="h-10 w-10 shrink-0 rounded-md object-cover shadow"
          />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary">
            {track.mediaKind === "video" ? (
              <Clapperboard className="h-4 w-4 text-gold-soft" />
            ) : (
              <Music2 className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        )}
        <div className="min-w-0">
          <p className={cn("truncate text-sm font-medium", isCurrent ? "text-primary" : "text-foreground")}>
            {track.videoUrl && (
              <span className="mr-1.5 inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-gold-soft">
                <Clapperboard className="h-3 w-3" /> Video
              </span>
            )}
            {track.moderationStatus === "unverified" && (
              <span className="mr-1.5 inline-flex items-center gap-1 rounded-full border border-amber-500/40 px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-amber-400">
                <Clock className="h-3 w-3" /> Unverified
              </span>
            )}
            {track.editedAt !== null && (
              <span className="mr-1.5 inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Pencil className="h-3 w-3" /> Edited
              </span>
            )}
            <span className="truncate">{track.title}</span>
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {onOpenArtist ? (
              <button
                onClick={() => onOpenArtist(track.artist)}
                className="underline-offset-2 transition hover:text-foreground hover:underline"
              >
                {track.artist}
              </button>
            ) : (
              track.artist
            )}
            <span className="mx-1.5 opacity-40">·</span>
            <span title="Plays across the platform">
              {formatPlayCount(track.playCount ?? 0)} {track.playCount === 1 ? "play" : "plays"}
            </span>
            {track.rowId > 0 && (
              <>
                <span className="mx-1.5 opacity-40">·</span>
                <span
                  data-testid={`song-code-${track.rowId}`}
                  title={`Song code ${songCode(track.rowId)} — search it to find this song fast`}
                  className="font-mono text-[10px] tracking-wider text-muted-foreground/80"
                >
                  {songCode(track.rowId)}
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      <p className="hidden truncate text-sm text-muted-foreground md:block">
        {track.album || "—"}
      </p>

      <span className="hidden rounded-full border border-border px-2 py-0.5 text-center text-[11px] tracking-wide text-muted-foreground lg:inline-block">
        {track.genre}
      </span>

      <span className="hidden text-right text-xs tabular-nums text-muted-foreground sm:block">
        {formatDuration(track.duration)}
      </span>

      <div className="flex items-center justify-end gap-0.5">
        {canFavorite && onToggleFavorite && (
          <button
            aria-label={isFavorite ? `Unfavorite ${track.title}` : `Favorite ${track.title}`}
            aria-pressed={isFavorite}
            onClick={onToggleFavorite}
            className="rounded-full p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-rose"
          >
            <Heart className={cn("h-4 w-4", isFavorite && "fill-rose text-rose")} />
          </button>
        )}
        {(onAddToPlaylist || onRemove || onEdit || editUsed || onLyrics) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label={`More options for ${track.title}`}
                className="rounded-full p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit details
                </DropdownMenuItem>
              )}
              {editUsed && (
                <DropdownMenuItem disabled>
                  <Lock className="mr-2 h-4 w-4" /> Edit used
                </DropdownMenuItem>
              )}
              {onAddToPlaylist && (
                <DropdownMenuItem onClick={onAddToPlaylist}>
                  <Plus className="mr-2 h-4 w-4" /> Add to playlist
                </DropdownMenuItem>
              )}
              {onLyrics && (
                <DropdownMenuItem onClick={onLyrics}>
                  <Mic2 className="mr-2 h-4 w-4" /> Lyrics
                </DropdownMenuItem>
              )}
              {onRemove && (
                <DropdownMenuItem onClick={onRemove} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Remove
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
