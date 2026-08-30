import { ArrowLeft, ListMusic, Play, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlayer } from "@/player/PlayerProvider";
import {
  useDeletePlaylist,
  usePlaylistTracks,
  useRemovePlaylistTrack,
} from "@/lib/queries";
import { formatTrackTotal } from "@/lib/format";
import type { Playlist, Track } from "@/lib/types";
import { TrackRow } from "./TrackRow";
import { VinylDisc } from "./VinylDisc";

interface PlaylistsViewProps {
  playlists: Playlist[];
  onOpen: (id: number) => void;
  onNew: () => void;
}

export function PlaylistsView({ playlists, onOpen, onNew }: PlaylistsViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl italic sm:text-4xl">Playlists</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your personal sides of the story.</p>
        </div>
        <Button onClick={onNew} className="rounded-full font-semibold">
          <Plus className="mr-1.5 h-4 w-4" /> New playlist
        </Button>
      </div>

      {playlists.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border px-6 py-16 text-center">
          <ListMusic className="h-10 w-10 text-muted-foreground" />
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            No playlists yet. Put together the first mix — every great soul collection started with one record.
          </p>
          <Button onClick={onNew} className="rounded-full font-semibold">
            <Plus className="mr-1.5 h-4 w-4" /> New playlist
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {playlists.map((pl) => (
            <button key={pl.rowId} onClick={() => onOpen(pl.rowId)} className="group text-left">
              <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-accent/80 via-secondary to-background shadow-lg shadow-black/30 transition-transform duration-300 group-hover:scale-[1.02]">
                <div className="w-2/3 opacity-90 transition-transform duration-500 group-hover:scale-105">
                  <VinylDisc label={pl.name} />
                </div>
              </div>
              <p className="mt-3 truncate font-display text-lg italic transition-colors group-hover:text-primary">
                {pl.name}
              </p>
              {pl.description && (
                <p className="truncate text-xs text-muted-foreground">{pl.description}</p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface PlaylistDetailProps {
  playlist: Playlist;
  tracks: Track[];
  favorites: Set<number>;
  canFavorite: boolean;
  onToggleFavorite: (track: Track) => void;
  onAddToPlaylist: (track: Track) => void;
  onBack: () => void;
  currentId: number | null;
  isPlaying: boolean;
}

export function PlaylistDetail({
  playlist,
  tracks,
  favorites,
  canFavorite,
  onToggleFavorite,
  onAddToPlaylist,
  onBack,
  currentId,
  isPlaying,
}: PlaylistDetailProps) {
  const player = usePlayer();
  const entriesQ = usePlaylistTracks(playlist.rowId);
  const removeEntry = useRemovePlaylistTrack();
  const deletePlaylist = useDeletePlaylist();

  const byId = new Map(tracks.map((t) => [t.rowId, t]));
  const playlistTracks = (entriesQ.data ?? [])
    .map((entry) => byId.get(entry.trackId))
    .filter((t): t is Track => Boolean(t));
  const seconds = playlistTracks.reduce((s, t) => s + t.duration, 0);

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-accent/70 via-card to-background p-6 sm:p-9">
        <div className="grain-overlay pointer-events-none absolute inset-0" />
        <div className="relative flex flex-col gap-7 sm:flex-row sm:items-center">
          <div className="w-40 shrink-0 sm:w-44">
            <VinylDisc label={playlist.name} spinning={player.playing} />
          </div>
          <div className="min-w-0 flex-1">
            <button
              onClick={onBack}
              className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> All playlists
            </button>
            <h1 className="truncate font-display text-3xl leading-tight font-black italic tracking-tight sm:text-4xl">
              {playlist.name}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {playlist.description
                ? `${playlist.description} · `
                : ""}
              {formatTrackTotal(playlistTracks.length, seconds)}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                onClick={() => playlistTracks.length > 0 && player.playTracks(playlistTracks)}
                disabled={playlistTracks.length === 0}
                className="h-11 rounded-full px-7 font-semibold"
              >
                <Play className="mr-2 h-4 w-4 fill-current" /> Play all
              </Button>
              <Button
                variant="outline"
                onClick={() => deletePlaylist.mutate(playlist.rowId, { onSuccess: onBack })}
                className="h-11 rounded-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-0.5">
        {entriesQ.isLoading ? (
          <p className="py-6 text-sm text-muted-foreground">Loading…</p>
        ) : playlistTracks.length === 0 ? (
          <p className="py-10 text-center text-sm leading-relaxed text-muted-foreground">
            This playlist is waiting for its first track. Use the ⋯ menu on any song and choose
            “Add to playlist”.
          </p>
        ) : (
          (entriesQ.data ?? []).map((entry, i) => {
            const track = byId.get(entry.trackId);
            if (!track) return null;
            return (
              <TrackRow
                key={entry.rowId}
                track={track}
                index={i + 1}
                isCurrent={currentId === track.rowId}
                isPlaying={isPlaying}
                isFavorite={favorites.has(track.rowId)}
                canFavorite={canFavorite}
                onPlay={() => player.playTracks(playlistTracks, i)}
                onToggleFavorite={() => onToggleFavorite(track)}
                onAddToPlaylist={() => onAddToPlaylist(track)}
                onRemove={() => removeEntry.mutate(entry.rowId)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
