import { Clapperboard, Play, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatTrackTotal } from "@/lib/format";
import type { Album } from "@/lib/tracks";
import type { Track } from "@/lib/types";
import { AlbumCard } from "./AlbumCard";
import { TrackRow } from "./TrackRow";
import { canEditTrack } from "@/lib/trackEdit";

interface HomeViewProps {
  albums: Album[];
  featured: Album | null;
  tracks: Track[];
  genres: string[];
  genre: string | null;
  onGenre: (genre: string | null) => void;
  onPlayAlbum: (album: Album) => void;
  onOpenAlbum: (album: Album) => void;
  onOpenArtist: (name: string) => void;
  onPlayTracks: (tracks: Track[], startIndex: number, preferVideo?: boolean) => void;
  favorites: Set<number>;
  canFavorite: boolean;
  onToggleFavorite: (track: Track) => void;
  onAddToPlaylist: (track: Track) => void;
  onAddLyrics: (track: Track) => void;
  onRemoveTrack: (track: Track) => void;
  onEditTrack: (track: Track) => void;
  currentUserId: string | null;
  currentId: number | null;
  isPlaying: boolean;
  onOpenUpload: () => void;
  fanUploads: Track[];
  videos: Track[];
  loading: boolean;
}

export function HomeView({
  albums,
  featured,
  tracks,
  genres,
  genre,
  onGenre,
  onPlayAlbum,
  onOpenAlbum,
  onOpenArtist,
  onPlayTracks,
  favorites,
  canFavorite,
  onToggleFavorite,
  onAddToPlaylist,
  onAddLyrics,
  onRemoveTrack,
  onEditTrack,
  currentUserId,
  currentId,
  isPlaying,
  onOpenUpload,
  fanUploads,
  videos,
  loading,
}: HomeViewProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-56 animate-pulse rounded-3xl bg-secondary/60" />
        <div className="h-6 w-40 animate-pulse rounded bg-secondary/60" />
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl bg-secondary/60" />
          ))}
        </div>
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 rounded-3xl border border-dashed border-border px-6 py-20 text-center">
        <span className="font-display text-5xl italic text-muted-foreground">The crates are empty</span>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          Nothing in the library yet. Add your first song and the turntable starts turning.
        </p>
        <Button onClick={onOpenUpload} className="rounded-full font-semibold">
          <PlusCircle className="mr-2 h-4 w-4" /> Add music
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {featured && (
        <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-accent/70 via-card to-background p-6 sm:p-9">
          <div className="grain-overlay pointer-events-none absolute inset-0" />
          {featured.coverUrl && (
            <div
              className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-cover bg-center opacity-20 blur-3xl"
              style={{ backgroundImage: `url(${featured.coverUrl})` }}
            />
          )}
          <p className="relative text-[11px] font-semibold uppercase tracking-[0.32em] text-gold-soft">
            Featured record
          </p>
          <div className="relative mt-5 flex flex-col gap-7 sm:flex-row sm:items-center">
            <div className="w-40 shrink-0 overflow-hidden rounded-2xl shadow-2xl shadow-black/50 sm:w-48">
              {featured.coverUrl ? (
                <img src={featured.coverUrl} alt={featured.name} className="aspect-square w-full object-cover" />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-gradient-to-br from-accent to-background">
                  <span className="font-display text-4xl italic text-muted-foreground">{featured.name}</span>
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-4xl leading-tight font-black italic tracking-tight sm:text-5xl">
                {featured.name}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {featured.artist} · {formatTrackTotal(featured.tracks.length, featured.tracks.reduce((s, t) => s + t.duration, 0))}
              </p>
              <Button
                onClick={() => onPlayAlbum(featured)}
                className="mt-5 h-11 rounded-full px-7 font-semibold"
              >
                <Play className="mr-2 h-4 w-4 fill-current" /> Play the record
              </Button>
            </div>
          </div>
        </section>
      )}

      {videos.length > 0 && (
        <section>
          <div className="mb-5 flex items-end justify-between">
            <h2 className="font-display text-2xl italic">Music videos</h2>
            <span className="text-xs text-muted-foreground">{videos.length} videos</span>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((video, i) => (
              <button
                key={video.rowId}
                onClick={() => onPlayTracks(videos, i, true)}
                aria-label={`Play video ${video.title}`}
                className="group overflow-hidden rounded-2xl border border-border/70 bg-card text-left transition hover:border-primary/50"
              >
                <div className="relative aspect-video w-full overflow-hidden bg-secondary">
                  {video.coverUrl ? (
                    <img
                      src={video.coverUrl}
                      alt=""
                      className="h-full w-full object-cover transition group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent to-background">
                      <Clapperboard className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl">
                      <Play className="h-5 w-5 fill-current" />
                    </span>
                  </span>
                  <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur">
                    <Clapperboard className="h-3 w-3" /> Video
                  </span>
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-medium">{video.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{video.artist}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-5 flex items-end justify-between">
          <h2 className="font-display text-2xl italic">Albums</h2>
          <span className="text-xs text-muted-foreground">{albums.length} records</span>
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {albums.map((album) => (
            <AlbumCard
              key={album.key}
              album={album}
              onPlay={() => onPlayAlbum(album)}
              onOpen={() => onOpenAlbum(album)}
            />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="mr-3 font-display text-2xl italic">All tracks</h2>
          {["All", ...genres].map((g) => {
            const value = g === "All" ? null : g;
            const active = (genre ?? "All") === (value ?? "All");
            return (
              <button
                key={g}
                onClick={() => onGenre(value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium tracking-wide transition",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                )}
              >
                {g}
              </button>
            );
          })}
        </div>
        <div className="space-y-0.5">
          {tracks.map((track, i) => (
            <TrackRow
              key={track.rowId}
              track={track}
              index={i + 1}
              isCurrent={currentId === track.rowId}
              isPlaying={isPlaying}
              isFavorite={favorites.has(track.rowId)}
              canFavorite={canFavorite}
              onPlay={() => onPlayTracks(tracks, i)}
              onToggleFavorite={() => onToggleFavorite(track)}
              onAddToPlaylist={() => onAddToPlaylist(track)}
              onOpenArtist={onOpenArtist}
              onLyrics={() => onAddLyrics(track)}
              onEdit={canEditTrack(track, currentUserId) ? () => onEditTrack(track) : undefined}
              editUsed={track.createdBy === currentUserId && track.editState === "locked"}
              onRemove={() => onRemoveTrack(track)}
            />
          ))}
          {tracks.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No tracks in this genre yet.
            </p>
          )}
        </div>
      </section>

      {fanUploads.length > 0 && (
        <section>
          <div className="mb-2 flex items-end justify-between">
            <h2 className="font-display text-2xl italic">From the fans</h2>
            <span className="text-xs text-muted-foreground">{fanUploads.length} songs</span>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Shared by the SOUL MUSIC community — tap “Add music” to drop yours in.
          </p>
          <div className="space-y-0.5">
            {fanUploads.map((track, i) => (
              <TrackRow
                key={track.rowId}
                track={track}
                index={i + 1}
                isCurrent={currentId === track.rowId}
                isPlaying={isPlaying}
                isFavorite={favorites.has(track.rowId)}
                canFavorite={canFavorite}
                onPlay={() => onPlayTracks(fanUploads, i)}
                onToggleFavorite={() => onToggleFavorite(track)}
                onAddToPlaylist={() => onAddToPlaylist(track)}
                onOpenArtist={onOpenArtist}
                onLyrics={() => onAddLyrics(track)}
                onEdit={canEditTrack(track, currentUserId) ? () => onEditTrack(track) : undefined}
                editUsed={track.createdBy === currentUserId && track.editState === "locked"}
                onRemove={() => onRemoveTrack(track)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
