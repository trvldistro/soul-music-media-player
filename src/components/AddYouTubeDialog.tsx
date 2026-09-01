import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CircleCheck, Link2, Loader2, LogIn, Plus, Search, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useInsertTrack,
  useYouTubeLookup,
  useYouTubeSearch,
  type YouTubeVideo,
} from "@/lib/queries";
import { GENRES } from "@/lib/genres";
import { autocompleteArtists } from "@/lib/artistMatch";
import { formatDuration } from "@/lib/format";
import { parseYouTubeId, splitVideoTitle, youtubeWatchUrl } from "@/lib/youtube";
import { songCode } from "@/lib/songCode";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AddYouTubeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signedIn: boolean;
  /** Existing artist profiles, for pick-the-right-page suggestions. */
  artists?: { name: string; status: string }[];
}

const BAD_LINK = "That doesn't look like a YouTube link — copy it straight from YouTube.";

/**
 * The way fans add music now: paste a YouTube link (or search once the API key
 * is set), confirm the details, and the song joins the library streaming
 * straight from YouTube — no music files ever land on this site.
 */
export function AddYouTubeDialog({ open, onOpenChange, signedIn, artists = [] }: AddYouTubeDialogProps) {
  const [mode, setMode] = useState<"link" | "search">("link");
  const [url, setUrl] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<YouTubeVideo[]>([]);
  const [video, setVideo] = useState<YouTubeVideo | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [genre, setGenre] = useState("Soul");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const lookup = useYouTubeLookup();
  const search = useYouTubeSearch();
  const insertTrack = useInsertTrack();
  const busy = lookup.isPending || insertTrack.isPending;
  const suggestions = useMemo(() => autocompleteArtists(artist, artists), [artist, artists]);

  useEffect(() => {
    if (!open) {
      setMode("link");
      setUrl("");
      setQuery("");
      setResults([]);
      setVideo(null);
      setTitle("");
      setArtist("");
      setAlbum("");
      setGenre("Soul");
      setError(null);
      setNotice(null);
    }
  }, [open]);

  function applyVideo(v: YouTubeVideo) {
    setVideo(v);
    const split = splitVideoTitle(v.title, v.channel);
    setTitle(split.title);
    setArtist(split.artist);
    setError(null);
  }

  async function handleLookup() {
    setError(null);
    setNotice(null);
    if (!parseYouTubeId(url)) {
      setError(BAD_LINK);
      return;
    }
    try {
      applyVideo(await lookup.mutateAsync(url));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't read that link — try again.");
    }
  }

  async function handleSearch() {
    setError(null);
    setNotice(null);
    const outcome = await search.mutateAsync(query);
    if (outcome.ok) {
      setResults(outcome.results);
      return;
    }
    if (outcome.reason === "missing_key") {
      setNotice("Search unlocks once a YouTube API key is added — until then, paste a video link instead.");
      return;
    }
    setError(outcome.message ?? "Search failed — try again in a moment.");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!video) {
      setError(mode === "link" ? "Look up a YouTube link first." : "Pick a search result first.");
      return;
    }
    if (!artist.trim()) {
      setError("Artist name is required.");
      return;
    }
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    try {
      const inserted = await insertTrack.mutateAsync({
        title: title.trim(),
        artist: artist.trim(),
        album: album.trim(),
        genre,
        duration: video.durationSeconds,
        audioUrl: youtubeWatchUrl(video.videoId),
        coverUrl: video.thumbnail,
        mediaKind: "youtube",
        youtubeId: video.videoId,
        uploaderName: artist.trim(),
      });
      toast.success("Added to the library", {
        description: `${title.trim()} · ${artist.trim()} — ${songCode(
          inserted.rowId,
        )}, streaming straight from YouTube. Marked Unverified until the admin reviews it.`,
      });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add that song — try again.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-border bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-2xl italic">
            <Youtube className="h-6 w-6 text-red-500" /> Add from YouTube
          </DialogTitle>
          <DialogDescription>
            Songs play straight from YouTube through their official player — no music files
            are uploaded here, so the artists and their labels keep getting paid.
          </DialogDescription>
        </DialogHeader>

        {!signedIn ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border p-8 text-center">
            <LogIn className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Sign in to add songs and build your own playlists and favorites.
            </p>
            <Button asChild className="rounded-full">
              <Link to="/signin?redirect=/">Sign in</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" aria-label="Add from YouTube">
            {/* Paste a link, or search */}
            <div className="grid grid-cols-2 gap-1 rounded-full border border-border bg-secondary/60 p-1">
              {(
                [
                  { id: "link", label: "Paste a link", icon: Link2 },
                  { id: "search", label: "Search YouTube", icon: Search },
                ] as const
              ).map((option) => {
                const Icon = option.icon;
                const active = mode === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setMode(option.id)}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition",
                      active
                        ? "bg-primary text-primary-foreground shadow"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" /> {option.label}
                  </button>
                );
              })}
            </div>

            {mode === "link" ? (
              <div className="space-y-1.5">
                <Label htmlFor="yt-link">YouTube link</Label>
                <div className="flex gap-2">
                  <Input
                    id="yt-link"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=…"
                    autoComplete="off"
                  />
                  <Button
                    type="button"
                    onClick={handleLookup}
                    disabled={lookup.isPending}
                    className="shrink-0 rounded-full font-semibold"
                  >
                    {lookup.isPending ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="mr-1 h-4 w-4" />
                    )}
                    Look up the video
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Any youtube.com or youtu.be link works.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="space-y-1.5">
                  <Label htmlFor="yt-search">Search YouTube</Label>
                  <div className="flex gap-2">
                    <Input
                      id="yt-search"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Artist, song or album"
                      autoComplete="off"
                    />
                    <Button
                      type="button"
                      onClick={handleSearch}
                      disabled={search.isPending || !query.trim()}
                      className="shrink-0 rounded-full font-semibold"
                    >
                      {search.isPending ? (
                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="mr-1 h-4 w-4" />
                      )}
                      Search
                    </Button>
                  </div>
                </div>
                {notice && (
                  <div
                    role="status"
                    className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3"
                  >
                    <p className="text-xs leading-relaxed">{notice}</p>
                  </div>
                )}
                {results.length > 0 && (
                  <div
                    role="listbox"
                    aria-label="YouTube results"
                    className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-border p-1"
                  >
                    {results.map((r) => (
                      <button
                        key={r.videoId}
                        type="button"
                        role="option"
                        aria-selected={video?.videoId === r.videoId}
                        aria-label={`Use ${r.title}`}
                        onClick={() => applyVideo(r)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg p-2 text-left transition",
                          video?.videoId === r.videoId ? "bg-primary/15" : "hover:bg-accent/60",
                        )}
                      >
                        {r.thumbnail ? (
                          <img src={r.thumbnail} alt="" className="h-10 w-16 shrink-0 rounded object-cover" />
                        ) : null}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{r.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {r.channel}
                            {r.durationSeconds ? ` · ${formatDuration(r.durationSeconds)}` : ""}
                          </span>
                        </span>
                        <Plus className="h-4 w-4 shrink-0 text-primary" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {video && (
              <>
                <div className="flex items-start gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3">
                  {video.thumbnail ? (
                    <img
                      src={video.thumbnail}
                      alt=""
                      className="h-14 w-24 shrink-0 rounded-md object-cover shadow"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                      <CircleCheck className="h-4 w-4" /> Found on YouTube
                    </p>
                    <p className="mt-0.5 truncate text-sm font-medium">{video.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {video.channel}
                      {video.durationSeconds ? ` · ${formatDuration(video.durationSeconds)}` : ""}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="yt-artist">
                      Artist name <span className="text-primary">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="yt-artist"
                        value={artist}
                        onChange={(e) => setArtist(e.target.value)}
                        placeholder="The name your fans know"
                        autoComplete="off"
                      />
                      {suggestions.length > 0 && (
                        <div
                          role="listbox"
                          aria-label="Matching artists"
                          className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-popover shadow-xl"
                        >
                          {suggestions.map((s) => (
                            <button
                              key={s.name}
                              type="button"
                              role="option"
                              aria-selected={false}
                              aria-label={`Choose artist ${s.name}`}
                              onClick={() => setArtist(s.name)}
                              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-accent"
                            >
                              <span className="truncate">{s.name}</span>
                              {s.status === "claimed" && (
                                <span className="shrink-0 rounded-full border border-emerald-500/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                                  Verified
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Pick a matching artist if one appears — same name, same page.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="yt-title">
                      Title <span className="text-primary">*</span>
                    </Label>
                    <Input
                      id="yt-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Song title"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="yt-album">Album</Label>
                    <Input
                      id="yt-album"
                      value={album}
                      onChange={(e) => setAlbum(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Genre</Label>
                    <Select value={genre} onValueChange={setGenre}>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {GENRES.map((g) => (
                          <SelectItem key={g} value={g}>
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {error}
              </p>
            )}

            <Button type="submit" disabled={busy} className="w-full rounded-full font-semibold">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              {busy ? "Adding…" : "Add to the library"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
