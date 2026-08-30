import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Home, Menu, Plus, Search, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePlayer, PlayerProvider } from "@/player/PlayerProvider";
import {
  useDeleteTrack,
  useFavorites,
  usePlaylists,
  useToggleFavorite,
  useTracks,
} from "@/lib/queries";
import { filterByGenre, groupAlbums, matchesQuery, featuredAlbum, uniqueGenres, type Album } from "@/lib/tracks";
import { canEditTrack } from "@/lib/trackEdit";
import { isAdminEmail } from "@/lib/admin";
import { selectArtistExtra } from "@/lib/artistProfile";
import type { ArtistProfile, Track } from "@/lib/types";
import { AppSidebar, type View } from "@/components/AppSidebar";
import { HomeView } from "@/components/HomeView";
import { PlaylistsView, PlaylistDetail } from "@/components/PlaylistsView";
import { TrackRow } from "@/components/TrackRow";
import { PlayerBar } from "@/components/PlayerBar";
import { NowPlaying } from "@/components/NowPlaying";
import { MobileNav } from "@/components/MobileNav";
import { UploadDialog } from "@/components/UploadDialog";
import { EditTrackDialog } from "@/components/EditTrackDialog";
import { ArtistView } from "@/components/ArtistView";
import { ClaimArtistDialog } from "@/components/ClaimArtistDialog";
import { LyricsEditorDialog } from "@/components/LyricsEditorDialog";
import { useArtistClaims, useArtistExtras, useArtists, useSoulPoints } from "@/lib/queries";
import { DeviceLibraryView } from "@/components/DeviceLibraryView";
import { AddToPlaylistDialog, CreatePlaylistDialog } from "@/components/PlaylistDialogs";

export default function Index() {
  return (
    <PlayerProvider>
      <SoulApp />
    </PlayerProvider>
  );
}

function SoulApp() {
  const { user, signedIn, signOut } = useAuth();
  const isMobile = useIsMobile();
  const player = usePlayer();

  const [view, setView] = useState<View>("home");
  const [playlistId, setPlaylistId] = useState<number | null>(null);
  const [albumKey, setAlbumKey] = useState<string | null>(null);
  const [genre, setGenre] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);
  const [addToTrack, setAddToTrack] = useState<Track | null>(null);
  const [editTrack, setEditTrack] = useState<Track | null>(null);
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);
  const [artistName, setArtistName] = useState<string | null>(null);
  const [lyricsTrack, setLyricsTrack] = useState<Track | null>(null);
  const [claimName, setClaimName] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const tracksQ = useTracks();
  const favoritesQ = useFavorites(signedIn);
  const playlistsQ = usePlaylists(signedIn);
  // A pending claimant's artist page polls, so a verdict reached in the admin
  // dashboard shows up without a reload.
  const artistsQ = useArtists({
    refetchIntervalMs: view === "artist" ? 4000 : undefined,
  });
  const soulPoints = useSoulPoints(signedIn);
  // Claim applications + profile extras power the artist pages.
  const claimsQ = useArtistClaims({ refetchIntervalMs: view === "artist" ? 4000 : undefined });
  const extrasQ = useArtistExtras({ refetchIntervalMs: view === "artist" ? 4000 : undefined });
  const toggleFavorite = useToggleFavorite();
  const deleteTrack = useDeleteTrack();

  const tracks = useMemo(() => tracksQ.data ?? [], [tracksQ.data]);
  const albums = useMemo(() => groupAlbums(tracks), [tracks]);
  const genres = useMemo(() => uniqueGenres(tracks), [tracks]);
  const featured = useMemo(() => featuredAlbum(albums), [albums]);
  const favorites = favoritesQ.favorites;
  const playlists = playlistsQ.data ?? [];
  const artists = artistsQ.data ?? [];
  const claims = claimsQ.data ?? [];
  const extras = extrasQ.data ?? [];
  const pendingClaimNames = useMemo(
    () => new Set(claims.filter((c) => c.status === "pending").map((c) => c.name.toLowerCase())),
    [claims],
  );

  const visibleTracks = useMemo(() => filterByGenre(tracks, genre), [tracks, genre]);
  const favoriteTracks = useMemo(() => tracks.filter((t) => favorites.has(t.rowId)), [tracks, favorites]);
  const fanUploads = useMemo(() => {
    const fanTracks = tracks.filter((t) => !t.isDemo);
    return [...fanTracks].slice(-10).reverse();
  }, [tracks]);
  const videos = useMemo(
    () => tracks.filter((t) => t.mediaKind === "video" || (t.mediaKind === "audio" && t.videoUrl)),
    [tracks],
  );
  const searchResults = useMemo(
    () => (view === "search" ? tracks.filter((t) => matchesQuery(t, search)) : []),
    [view, tracks, search],
  );
  const searchAlbums = useMemo(
    () =>
      view === "search" && search.trim()
        ? albums.filter((a) => matchesQuery({ ...(a.tracks[0] as Track), title: a.name, album: a.name }, search))
        : [],
    [view, albums, search],
  );
  // Artist profiles that match the query — this is how a verified artist stays
  // reachable even when their whole catalogue has been deleted.
  const searchArtists = useMemo(
    () =>
      view === "search" && search.trim()
        ? artists
            .filter((a) => a.name.toLowerCase().includes(search.trim().toLowerCase()))
            .slice(0, 6)
        : [],
    [view, artists, search],
  );

  const currentId = player.current?.rowId ?? null;
  const currentUserId = (user?.userUuid as string | undefined) ?? null;
  const editProps = (track: Track) => ({
    onEdit: canEditTrack(track, currentUserId) ? () => setEditTrack(track) : undefined,
    editUsed: track.createdBy === currentUserId && track.editState === "locked",
  });

  const handleToggleFavorite = (track: Track) => {
    toggleFavorite.mutate({ trackId: track.rowId, favorite: favorites.has(track.rowId) });
  };
  const handlePlayTracks = (list: Track[], startIndex: number, preferVideo = false) =>
    player.playTracks(list, startIndex, { preferVideo });
  const handlePlayAlbum = (album: Album) => player.playTracks(album.tracks, 0);
  const handleOpenAlbum = (album: Album) => {
    setAlbumKey(album.key);
    setGenre(null);
    setView("home");
  };
  const handleOpenArtist = (name: string) => {
    setArtistName(name);
    setAlbumKey(null);
    setGenre(null);
    setView("artist");
  };
  const handleRemoveTrack = (track: Track) => {
    if (currentId === track.rowId) return;
    deleteTrack.mutate(track.rowId);
  };
  // An unclaimed page with a filed application shows as "under review".
  const claimFor = (name: string): ArtistProfile | null => {
    const row = artists.find((a) => a.name.toLowerCase() === name.toLowerCase()) ?? null;
    if ((row?.status ?? "unclaimed") !== "claimed" && pendingClaimNames.has(name.toLowerCase())) {
      return {
        rowId: row?.rowId ?? -1,
        name: row?.name ?? name,
        status: "pending",
        claimantUuid: null,
        claimEvidence: "",
        claimLink: "",
        claimedAt: null,
      };
    }
    return row;
  };

  const selectedAlbum = albumKey ? albums.find((a) => a.key === albumKey) ?? null : null;
  const selectedPlaylist = playlistId ? playlists.find((p) => p.rowId === playlistId) ?? null : null;

  return (
    <div className="flex min-h-screen">
      {!isMobile && (
        <AppSidebar
          view={view}
          onSelectView={(v) => {
            setView(v);
            setPlaylistId(null);
          }}
          playlists={playlists}
          activePlaylistId={playlistId}
          onSelectPlaylist={(id) => {
            setPlaylistId(id);
            setView("playlist");
          }}
          onUpload={() => setUploadOpen(true)}
          onNewPlaylist={() => setCreatePlaylistOpen(true)}
          user={user}
          soulPoints={soulPoints.total}
          onSignOut={() => void signOut()}
        />
      )}

      <div className="min-w-0 flex-1">
        {isMobile && (
          <>
            {/* Hamburger + Add-music buttons, stacked top-left */}
            <div className="fixed top-3 left-3 z-30 flex flex-col gap-2.5">
              <button
                type="button"
                aria-label="Open menu"
                onClick={() => setMenuOpen(true)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-card/90 text-foreground shadow-lg backdrop-blur transition hover:bg-card"
              >
                <Menu className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Add music"
                onClick={() => setUploadOpen(true)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition hover:scale-105 active:scale-95"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            <MobileNav
              open={menuOpen}
              onClose={() => setMenuOpen(false)}
              view={view}
              onSelectView={(v) => {
                setView(v);
                setPlaylistId(null);
              }}
              onUpload={() => setUploadOpen(true)}
              isAdmin={isAdminEmail(user?.email as string | undefined)}
              signedIn={signedIn}
              user={user}
              soulPoints={soulPoints.total}
              onSignOut={() => void signOut()}
            />
          </>
        )}

        <main className="mx-auto w-full max-w-[1400px] px-4 pt-6 pb-40 pl-[4.5rem] sm:px-7 sm:pl-7">
          {view === "home" && selectedAlbum && (
            <AlbumDetail
              album={selectedAlbum}
              onBack={() => setAlbumKey(null)}
              onOpenArtist={handleOpenArtist}
              onAddLyrics={setLyricsTrack}
            />
          )}

          {view === "home" && !selectedAlbum && (
            <HomeView
              albums={albums}
              featured={featured}
              tracks={visibleTracks}
              genres={genres}
              genre={genre}
              onGenre={setGenre}
              onPlayAlbum={handlePlayAlbum}
              onOpenAlbum={handleOpenAlbum}
              onOpenArtist={handleOpenArtist}
              onPlayTracks={handlePlayTracks}
              favorites={favorites}
              canFavorite={signedIn}
              onToggleFavorite={handleToggleFavorite}
              onAddToPlaylist={setAddToTrack}
              onAddLyrics={setLyricsTrack}
              onRemoveTrack={handleRemoveTrack}
              onEditTrack={setEditTrack}
              currentUserId={currentUserId}
              currentId={currentId}
              isPlaying={player.playing}
              onOpenUpload={() => setUploadOpen(true)}
              fanUploads={fanUploads}
              videos={videos}
              loading={tracksQ.isLoading}
            />
          )}

          {view === "search" && (
            <div className="space-y-8">
              <div className="max-w-xl">
                <h1 className="mb-4 font-display text-3xl italic sm:text-4xl">Search</h1>
                <div className="relative">
                  <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Songs, artists, albums, genres, SM-codes…"
                    className="h-12 rounded-full border-border bg-card pl-10 text-base"
                  />
                </div>
              </div>

              {search.trim() === "" ? (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  Type to dig through the crates.
                </p>
              ) : (
                <>
                {searchArtists.length > 0 && (
                  <section>
                    <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Artist profiles · {searchArtists.length}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {searchArtists.map((a) => (
                        <button
                          key={a.name}
                          onClick={() => handleOpenArtist(a.name)}
                          className="rounded-full border border-border bg-card px-3.5 py-1.5 text-sm transition hover:border-primary/50 hover:text-primary"
                        >
                          {a.name}
                          {a.status === "claimed" && (
                            <span className="ml-2 rounded-full border border-emerald-500/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                              Verified
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </section>
                )}
                  {searchAlbums.length > 0 && (
                    <section>
                      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        Albums
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {searchAlbums.map((a) => a.name).join(" · ")}
                      </p>
                    </section>
                  )}
                  <section>
                    <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Tracks · {searchResults.length}
                    </h2>
                    {searchResults.length === 0 ? (
                      <div className="flex flex-col items-center gap-3 py-12 text-center">
                        <SearchX className="h-8 w-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Nothing matches “{search.trim()}”.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {searchResults.map((track, i) => (
                          <TrackRow
                            key={track.rowId}
                            track={track}
                            index={i + 1}
                            isCurrent={currentId === track.rowId}
                            isPlaying={player.playing}
                            isFavorite={favorites.has(track.rowId)}
                            canFavorite={signedIn}
                            onPlay={() => handlePlayTracks(searchResults, i)}
                            onToggleFavorite={() => handleToggleFavorite(track)}
                            onAddToPlaylist={() => setAddToTrack(track)}
                            onOpenArtist={handleOpenArtist}
                            onLyrics={() => setLyricsTrack(track)}
                            {...editProps(track)}
                          />
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          )}

          {view === "favorites" && (
            <div className="space-y-8">
              <div>
                <h1 className="font-display text-3xl italic sm:text-4xl">Your favorites</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {signedIn
                    ? `${favoriteTracks.length} ${favoriteTracks.length === 1 ? "song" : "songs"} close to your heart`
                    : "Sign in to keep your favorites"}
                </p>
              </div>
              {!signedIn ? (
                <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border px-6 py-16 text-center">
                  <Heart className="h-10 w-10 text-muted-foreground" />
                  <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                    Favorites are personal. Sign in and the hearts you tap will be waiting for you here.
                  </p>
                  <Button asChild className="rounded-full font-semibold">
                    <Link to="/signin?redirect=/">Sign in</Link>
                  </Button>
                </div>
              ) : favoriteTracks.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-6 py-16 text-center">
                  <Heart className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Tap the heart on any track and it lands here.
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {favoriteTracks.map((track, i) => (
                    <TrackRow
                      key={track.rowId}
                      track={track}
                      index={i + 1}
                      isCurrent={currentId === track.rowId}
                      isPlaying={player.playing}
                      isFavorite
                      canFavorite
                      onPlay={() => handlePlayTracks(favoriteTracks, i)}
                      onToggleFavorite={() => handleToggleFavorite(track)}
                      onAddToPlaylist={() => setAddToTrack(track)}
                      onOpenArtist={handleOpenArtist}
                      onLyrics={() => setLyricsTrack(track)}
                      {...editProps(track)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {view === "playlists" && (
            <PlaylistsView
              playlists={playlists}
              onOpen={(id) => {
                setPlaylistId(id);
                setView("playlist");
              }}
              onNew={() => setCreatePlaylistOpen(true)}
            />
          )}

          {view === "device" && <DeviceLibraryView />}

          {view === "playlist" &&
            (selectedPlaylist ? (
              <PlaylistDetail
                playlist={selectedPlaylist}
                tracks={tracks}
                favorites={favorites}
                canFavorite={signedIn}
                onToggleFavorite={handleToggleFavorite}
                onAddToPlaylist={setAddToTrack}
                onBack={() => {
                  setPlaylistId(null);
                  setView("playlists");
                }}
                currentId={currentId}
                isPlaying={player.playing}
              />
            ) : (
              <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border px-6 py-16 text-center">
                <p className="text-sm text-muted-foreground">This playlist is gone.</p>
                <Button variant="outline" className="rounded-full" onClick={() => setView("playlists")}>
                  Back to playlists
                </Button>
              </div>
            ))}

          {view === "artist" && artistName && (
            <ArtistView
              name={artistName}
              tracks={tracks}
              claim={claimFor(artistName)}
              extra={selectArtistExtra(
                extras,
                claimFor(artistName) ?? { name: artistName, status: "unclaimed", claimantUuid: null },
              )}
              signedIn={signedIn}
              onClaim={(name) => setClaimName(name)}
              onBack={() => {
                setArtistName(null);
                setView("home");
              }}
              onPlayTracks={handlePlayTracks}
              onPlayAlbum={handlePlayAlbum}
              onOpenAlbum={handleOpenAlbum}
              favorites={favorites}
              canFavorite={signedIn}
              onToggleFavorite={handleToggleFavorite}
              onAddToPlaylist={setAddToTrack}
              onEditTrack={setEditTrack}
              onAddLyrics={setLyricsTrack}
              currentUserId={currentUserId}
              currentId={currentId}
              isPlaying={player.playing}
            />
          )}
        </main>
      </div>

      <PlayerBar
        favorite={player.current ? favorites.has(player.current.rowId) : false}
        canFavorite={signedIn}
        onToggleFavorite={() => player.current && handleToggleFavorite(player.current)}
        onExpand={() => setNowPlayingOpen(true)}
      />
      <NowPlaying
        open={nowPlayingOpen}
        onClose={() => setNowPlayingOpen(false)}
        signedIn={signedIn}
        onAddLyrics={setLyricsTrack}
      />
      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} signedIn={signedIn} artists={artists} />
      <EditTrackDialog track={editTrack} open={editTrack !== null} onOpenChange={(o) => !o && setEditTrack(null)} />
      <CreatePlaylistDialog open={createPlaylistOpen} onOpenChange={setCreatePlaylistOpen} />
      <AddToPlaylistDialog track={addToTrack} onOpenChange={(open) => !open && setAddToTrack(null)} />
      <ClaimArtistDialog
        artistName={claimName}
        onOpenChange={(o) => !o && setClaimName(null)}
        reclaim={
          claimName != null &&
          artists.some(
            (a) => a.name.toLowerCase() === claimName.toLowerCase() && a.status === "unclaimed",
          )
        }
      />
      <LyricsEditorDialog track={lyricsTrack} onOpenChange={(o) => !o && setLyricsTrack(null)} />
    </div>
  );
}

function AlbumDetail({
  album,
  onBack,
  onOpenArtist,
  onAddLyrics,
}: {
  album: Album;
  onBack: () => void;
  onOpenArtist: (name: string) => void;
  onAddLyrics: (track: Track) => void;
}) {
  const player = usePlayer();
  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-accent/70 via-card to-background p-6 sm:p-9">
        <div className="grain-overlay pointer-events-none absolute inset-0" />
        {album.coverUrl && (
          <div
            className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-cover bg-center opacity-20 blur-3xl"
            style={{ backgroundImage: `url(${album.coverUrl})` }}
          />
        )}
        <div className="relative flex flex-col gap-7 sm:flex-row sm:items-center">
          <div className="w-40 shrink-0 overflow-hidden rounded-2xl shadow-2xl shadow-black/50 sm:w-48">
            {album.coverUrl ? (
              <img src={album.coverUrl} alt={album.name} className="aspect-square w-full object-cover" />
            ) : (
              <div className="flex aspect-square w-full items-center justify-center bg-gradient-to-br from-accent to-background">
                <span className="font-display text-4xl italic text-muted-foreground">{album.name}</span>
              </div>
            )}
          </div>
          <div className="min-w-0">
            <button
              onClick={onBack}
              className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
            >
              <Home className="h-3.5 w-3.5" /> Back to the library
            </button>
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-gold-soft">Album</p>
            <h1 className="mt-1 truncate font-display text-3xl leading-tight font-black italic tracking-tight sm:text-5xl">
              {album.name}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {album.artist} ·{" "}
              {formatTrackTotalLocal(album.tracks.length, album.tracks.reduce((s, t) => s + t.duration, 0))}
            </p>
            <Button
              onClick={() => album.tracks.length > 0 && player.playTracks(album.tracks, 0)}
              disabled={album.tracks.length === 0}
              className="mt-5 h-11 rounded-full px-7 font-semibold"
            >
              Play the record
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-0.5">
        {album.tracks.map((track, i) => (
          <TrackRow
            key={track.rowId}
            track={track}
            index={i + 1}
            isCurrent={player.current?.rowId === track.rowId}
            isPlaying={player.playing}
            onPlay={() => player.playTracks(album.tracks, i)}
            onOpenArtist={onOpenArtist}
            onLyrics={() => onAddLyrics(track)}
          />
        ))}
      </div>
    </div>
  );
}

function formatTrackTotalLocal(count: number, seconds: number): string {
  const min = Math.floor(seconds / 60);
  const word = count === 1 ? "track" : "tracks";
  return min < 1 ? `${count} ${word}` : `${count} ${word} · ${min} min`;
}
