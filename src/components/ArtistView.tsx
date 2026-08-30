import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  AtSign,
  BadgeCheck,
  Clock3,
  Facebook,
  Globe,
  Instagram,
  LogIn,
  Music2,
  Pencil,
  Play,
  UserRound,
  Youtube,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { groupAlbums, type Album } from "@/lib/tracks";
import { canEditTrack } from "@/lib/trackEdit";
import { linkLabel } from "@/lib/artistProfile";
import type { ArtistProfile, ArtistProfileExtra, Track } from "@/lib/types";
import { AlbumCard } from "./AlbumCard";
import { TrackRow } from "./TrackRow";
import { EditArtistProfileDialog } from "./EditArtistProfileDialog";

interface ArtistViewProps {
  name: string;
  tracks: Track[];
  claim: ArtistProfile | null;
  /** The verified claimant's own profile extras, when they exist. */
  extra: ArtistProfileExtra | null;
  signedIn: boolean;
  onClaim: (name: string) => void;
  onBack: () => void;
  onPlayTracks: (list: Track[], startIndex: number) => void;
  onPlayAlbum: (album: Album) => void;
  onOpenAlbum: (album: Album) => void;
  favorites: Set<number>;
  canFavorite: boolean;
  onToggleFavorite: (track: Track) => void;
  onAddToPlaylist: (track: Track) => void;
  onEditTrack: (track: Track) => void;
  onAddLyrics: (track: Track) => void;
  currentUserId: string | null;
  currentId: number | null;
  isPlaying: boolean;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

function totalMinutes(tracks: Track[]): number {
  return Math.round(tracks.reduce((sum, t) => sum + t.duration, 0) / 60);
}

function linkIcon(platform: string) {
  switch (platform) {
    case "instagram":
      return Instagram;
    case "facebook":
      return Facebook;
    case "youtube":
    case "youtube_music":
      return Youtube;
    case "x":
      return AtSign;
    case "website":
      return Globe;
    default:
      return Music2;
  }
}

/**
 * Genius-style artist page. Any artist name that appears on an upload gets a
 * page automatically; unclaimed pages carry a claim button for the real artist.
 */
export function ArtistView({
  name,
  tracks,
  claim,
  extra,
  signedIn,
  onClaim,
  onBack,
  onPlayTracks,
  onPlayAlbum,
  onOpenAlbum,
  favorites,
  canFavorite,
  onToggleFavorite,
  onAddToPlaylist,
  onEditTrack,
  onAddLyrics,
  currentUserId,
  currentId,
  isPlaying,
}: ArtistViewProps) {
  const [editOpen, setEditOpen] = useState(false);
  const artistTracks = useMemo(
    () => tracks.filter((t) => t.artist.toLowerCase() === name.toLowerCase()),
    [tracks, name],
  );
  const albums = useMemo(() => groupAlbums(artistTracks), [artistTracks]);
  const status = claim?.status ?? "unclaimed";
  const isVerifiedOwner =
    signedIn &&
    claim?.status === "claimed" &&
    claim.claimantUuid != null &&
    claim.claimantUuid === currentUserId;

  return (
    <div className="space-y-8">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to the library
      </button>

      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-accent/70 via-card to-background p-6 sm:p-9">
        <div className="grain-overlay pointer-events-none absolute inset-0" />
        <div className="relative flex flex-col gap-7 sm:flex-row sm:items-end">
          {extra?.imageUrl ? (
            <img
              src={extra.imageUrl}
              alt={`${name} profile photo`}
              className="h-32 w-32 shrink-0 rounded-full border-2 border-primary/30 object-cover shadow-xl shadow-black/40 sm:h-40 sm:w-40"
            />
          ) : (
            <span className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-secondary font-display text-4xl italic text-gold-soft shadow-xl shadow-black/40 sm:h-40 sm:w-40">
              {initials(name) || <UserRound className="h-10 w-10" />}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-gold-soft">Artist</p>
            <h1 className="mt-1 truncate font-display text-3xl leading-tight font-black italic tracking-tight sm:text-5xl">
              {name}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {status === "claimed" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/50 bg-primary/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-primary">
                  <BadgeCheck className="h-3.5 w-3.5" /> Verified artist
                </span>
              ) : status === "pending" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gold-soft">
                  <Clock3 className="h-3.5 w-3.5" /> Claim under review
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Unclaimed profile
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {artistTracks.length} {artistTracks.length === 1 ? "song" : "songs"} · {albums.length}{" "}
                {albums.length === 1 ? "album" : "albums"}
                {totalMinutes(artistTracks) >= 1 && ` · ${totalMinutes(artistTracks)} min`}
              </span>
            </div>

            {status !== "claimed" && (
              <div className="mt-4">
                {status === "unclaimed" &&
                  (signedIn ? (
                    <Button
                      onClick={() => onClaim(name)}
                      className="h-10 rounded-full px-6 font-semibold"
                    >
                      <BadgeCheck className="mr-2 h-4 w-4" /> Claim profile · Verify as artist
                    </Button>
                  ) : (
                    <Button asChild variant="outline" className="h-10 rounded-full px-6 font-semibold">
                      <Link to="/signin?redirect=/">
                        <LogIn className="mr-2 h-4 w-4" /> Sign in to claim this profile
                      </Link>
                    </Button>
                  ))}
                {status === "pending" && (
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Someone applied to verify this profile. Our reviewers are on it.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {(extra?.bio || (extra?.links.length ?? 0) > 0 || isVerifiedOwner) && (
        <section className="rounded-3xl border border-border/60 bg-card/70 p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-2xl italic">About</h2>
            {isVerifiedOwner && (
              <Button
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit profile
              </Button>
            )}
          </div>
          {extra?.bio ? (
            <p className="mt-3 max-w-3xl text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
              {extra.bio}
            </p>
          ) : isVerifiedOwner ? (
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              No bio yet — add one so listeners know who you are.
            </p>
          ) : null}
          {extra && extra.links.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {extra.links.map((link) => {
                const Icon = linkIcon(link.platform);
                return (
                  <a
                    key={link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-3.5 py-1.5 text-xs font-medium transition hover:border-primary/50 hover:text-primary"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {linkLabel(link.platform)}
                  </a>
                );
              })}
            </div>
          )}
        </section>
      )}

      {artistTracks.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-6 py-16 text-center">
          <span className="font-display text-3xl italic text-muted-foreground">No songs yet</span>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            No uploads carry this name so far. Share a track under “{name}” and this page becomes
            their discography.
          </p>
        </div>
      ) : (
        <>
          <section>
            <div className="mb-5 flex items-end justify-between">
              <h2 className="font-display text-2xl italic">Discography</h2>
              <span className="text-xs text-muted-foreground">
                {albums.length} {albums.length === 1 ? "record" : "records"}
              </span>
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
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-2xl italic">All songs</h2>
              <Button
                onClick={() => onPlayTracks(artistTracks, 0)}
                className="h-9 shrink-0 rounded-full px-5 text-sm font-semibold"
              >
                <Play className="mr-2 h-3.5 w-3.5 fill-current" /> Play
              </Button>
            </div>
            <div className="space-y-0.5">
              {artistTracks.map((track, i) => (
                <TrackRow
                  key={track.rowId}
                  track={track}
                  index={i + 1}
                  isCurrent={currentId === track.rowId}
                  isPlaying={isPlaying}
                  isFavorite={favorites.has(track.rowId)}
                  canFavorite={canFavorite}
                  onPlay={() => onPlayTracks(artistTracks, i)}
                  onToggleFavorite={() => onToggleFavorite(track)}
                  onAddToPlaylist={() => onAddToPlaylist(track)}
                  onLyrics={() => onAddLyrics(track)}
                  onEdit={canEditTrack(track, currentUserId) ? () => onEditTrack(track) : undefined}
                  editUsed={track.createdBy === currentUserId && track.editState === "locked"}
                />
              ))}
            </div>
          </section>
        </>
      )}

      <EditArtistProfileDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        artistName={name}
        currentUserId={currentUserId}
        extra={extra}
      />
    </div>
  );
}
