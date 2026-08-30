import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AudioLines,
  CircleCheck,
  Clapperboard,
  Image as ImageIcon,
  Info,
  LogIn,
  Music2,
  TriangleAlert,
  Upload,
} from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { content } from "@/lib/shared/kliv-content.js";
import { useAttachVideo, useInsertTrack, useTracks } from "@/lib/queries";
import {
  isVideoFile,
  isWavFile,
  probeMediaDuration,
  validateUpload,
  type UploadKind,
} from "@/lib/uploadValidation";
import { cn } from "@/lib/utils";
import { GENRES } from "@/lib/genres";
import { autocompleteArtists } from "@/lib/artistMatch";
import { findSongForVideo } from "@/lib/mediaMatch";
import { songCode } from "@/lib/songCode";
import { toast } from "sonner";

const WAV_ACCEPT = ".wav,.wave,audio/wav,audio/x-wav,audio/wave";
const VIDEO_ACCEPT = ".mp4,.m4v,.webm,.mov,video/mp4,video/webm,video/quicktime";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signedIn: boolean;
  /** Existing artist profiles, for pick-the-right-page suggestions. */
  artists?: { name: string; status: string }[];
}

export function UploadDialog({ open, onOpenChange, signedIn, artists = [] }: UploadDialogProps) {
  const [kind, setKind] = useState<UploadKind>("song");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [genre, setGenre] = useState("Soul");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState<number | null>(null);
  const [stage, setStage] = useState("");
  const insertTrack = useInsertTrack();
  const attachVideo = useAttachVideo();
  const tracksQ = useTracks();
  const library = tracksQ.data ?? [];
  const suggestions = useMemo(() => autocompleteArtists(artist, artists), [artist, artists]);
  // A video whose artist + title match an existing song attaches to that song
  // (matched the way artist names are) instead of becoming a second entry — but
  // only when no WAV is riding along, which means a brand-new song.
  const songMatch = useMemo(
    () => (kind === "video" && !audioFile ? findSongForVideo(library, artist, title) : null),
    [kind, audioFile, library, artist, title],
  );
  const attachTarget = songMatch && !songMatch.videoUrl ? songMatch : null;
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setKind("song");
      setTitle("");
      setArtist("");
      setAlbum("");
      setGenre("Soul");
      setAudioFile(null);
      setVideoFile(null);
      setCoverFile(null);
      setCoverPreview(null);
      setBusy(false);
      setPct(null);
      setStage("");
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  function titleFromFile(file: File) {
    return file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ");
  }

  function pickAudio(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) return;
    if (!isWavFile(file)) {
      toast.error("Songs must be WAV files", {
        description: `“${file.name}” isn’t a WAV — convert it first, then try again.`,
      });
      return;
    }
    setAudioFile(file);
    if (!title.trim()) setTitle(titleFromFile(file));
  }

  function pickVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file) return;
    if (!isVideoFile(file)) {
      toast.error("Music videos must be MP4, WebM or MOV", {
        description: `“${file.name}” isn’t a video format the player can stream.`,
      });
      return;
    }
    setVideoFile(file);
    if (!title.trim()) setTitle(titleFromFile(file));
  }

  function pickCover(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    setCoverFile(file);
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(file ? URL.createObjectURL(file) : null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const rejection = validateUpload({ kind, artist, title, audioFile, videoFile });
    if (rejection) {
      toast.error(rejection);
      return;
    }
    setBusy(true);
    setPct(2);
    try {
      // Matched an existing song: attach the video to it instead of creating a
      // second library entry.
      if (kind === "video" && !audioFile && attachTarget && videoFile) {
        setStage("Uploading the video…");
        const uploaded = await content.uploadFile(videoFile, "videos", {
          onProgress: (pr) => setPct(2 + Math.round(pr.percentage * 0.95)),
        });
        setPct(99);
        setStage("Adding it to the song…");
        await attachVideo.mutateAsync({ trackId: attachTarget.rowId, videoUrl: uploaded.path });
        toast.success("Video added to the song", {
          description: `“${attachTarget.title}” by ${attachTarget.artist} (${songCode(
            attachTarget.rowId,
          )}) — listeners can now flip between the song and the video.`,
        });
        onOpenChange(false);
        return;
      }

      const primary = kind === "video" ? (videoFile as File) : (audioFile as File);
      const duration = await probeMediaDuration(primary);

      let audioPath = "";
      if (audioFile) {
        setStage("Uploading the WAV…");
        const uploaded = await content.uploadFile(audioFile, "music", {
          onProgress: (pr) =>
            setPct(Math.max(2, Math.round(pr.percentage * (kind === "video" ? 0.55 : 0.8)))),
        });
        audioPath = uploaded.path;
      }

      let videoPath = "";
      if (videoFile) {
        setStage("Uploading the video…");
        const from = audioPath ? 55 : 2;
        const span = audioPath ? 37 : 80;
        const uploaded = await content.uploadFile(videoFile, "videos", {
          onProgress: (pr) => setPct(from + Math.round(pr.percentage * span)),
        });
        videoPath = uploaded.path;
      }

      let coverPath = "";
      if (coverFile) {
        setStage("Uploading the cover…");
        const from = videoPath ? 92 : audioPath ? 80 : 2;
        const uploaded = await content.uploadFile(coverFile, "covers", {
          onProgress: (pr) => setPct(from + Math.round(pr.percentage * (99 - from))),
        });
        coverPath = uploaded.path;
      }

      setPct(99);
      setStage("Adding it to the library…");
      const inserted = await insertTrack.mutateAsync({
        title: title.trim(),
        artist: artist.trim(),
        album: album.trim(),
        genre,
        duration,
        audioUrl: audioPath || videoPath,
        coverUrl: coverPath,
        mediaKind: kind === "video" ? "video" : "audio",
        videoUrl: videoPath,
        uploaderName: artist.trim(),
      });
      toast.success(kind === "video" ? "Your music video is live" : "Your song is live", {
        description: `${title.trim()} · ${artist.trim()} — live as ${songCode(
          inserted.rowId,
        )} and marked Unverified until the admin reviews it.`,
      });
      onOpenChange(false);
    } catch (err) {
      toast.error("Upload failed", {
        description: err instanceof Error ? err.message : "Something went wrong — try again.",
      });
    } finally {
      setBusy(false);
      setPct(null);
      setStage("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-border bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl italic">Share your music</DialogTitle>
          <DialogDescription>
            Fans keep the crates full. Upload your song as a WAV, or share a music video — it
            becomes streamable for everyone.
          </DialogDescription>
        </DialogHeader>

        {!signedIn ? (
          <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border p-8 text-center">
            <LogIn className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Sign in to upload music and build your own playlists and favorites.
            </p>
            <Button asChild className="rounded-full">
              <Link to="/signin?redirect=/">Sign in</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" aria-label="Share your music">
            {/* Song or music video */}
            <div className="grid grid-cols-2 gap-1 rounded-full border border-border bg-secondary/60 p-1">
              {(
                [
                  { id: "song", label: "Song (WAV)", icon: Music2 },
                  { id: "video", label: "Music video", icon: Clapperboard },
                ] as const
              ).map((option) => {
                const Icon = option.icon;
                const active = kind === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setKind(option.id)}
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

            {/* WAV picker */}
            <button
              type="button"
              onClick={() => audioInputRef.current?.click()}
              className={cn(
                "flex w-full flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-center transition",
                audioFile
                  ? "border-primary/60 bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-accent/40",
              )}
            >
              <AudioLines className="h-7 w-7 text-primary" />
              {audioFile ? (
                <>
                  <span className="text-sm font-medium">{audioFile.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {kind === "video" ? "WAV attached — tap to change" : "Tap to choose a different WAV file"}
                  </span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {kind === "video"
                    ? "Add the song as a WAV too (optional)"
                    : "Choose the song file — must be a WAV"}
                </span>
              )}
            </button>
            <input ref={audioInputRef} type="file" accept={WAV_ACCEPT} hidden onChange={pickAudio} />

            {/* Music video picker */}
            {kind === "video" && (
              <>
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className={cn(
                    "flex w-full flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-center transition",
                    videoFile
                      ? "border-primary/60 bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-accent/40",
                  )}
                >
                  <Clapperboard className="h-7 w-7 text-primary" />
                  {videoFile ? (
                    <>
                      <span className="text-sm font-medium">{videoFile.name}</span>
                      <span className="text-xs text-muted-foreground">Tap to choose a different video</span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Choose the music video — MP4, WebM or MOV
                    </span>
                  )}
                </button>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept={VIDEO_ACCEPT}
                  hidden
                  onChange={pickVideo}
                />

                {attachTarget && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3">
                    <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                    <p className="text-xs leading-relaxed">
                      This matches the song{" "}
                      <span className="font-semibold">
                        “{attachTarget.title}” by {attachTarget.artist}
                      </span>{" "}
                      <span className="font-mono">({songCode(attachTarget.rowId)})</span> — the video
                      will be added to that song, and listeners can switch between the song and the
                      video while it plays.
                    </p>
                  </div>
                )}
                {songMatch && !attachTarget && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    <p className="text-xs leading-relaxed">
                      A song called “{songMatch.title}” by {songMatch.artist} already has a video —
                      the first one stays. Check the spelling, or this will be shared on its own as a
                      music video.
                    </p>
                  </div>
                )}
                {!songMatch && title.trim() && artist.trim() && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-border bg-secondary/40 p-3">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      No song called “{title.trim()}” by {artist.trim()} yet — this will be shared on
                      its own as a music video. Share the song first if you want them linked.
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="upload-artist">
                  Artist name <span className="text-primary">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="upload-artist"
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
                <Label htmlFor="upload-title">
                  Title <span className="text-primary">*</span>
                </Label>
                <Input
                  id="upload-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Song title"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="upload-album">Album</Label>
                <Input
                  id="upload-album"
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

            {/* Cover picker */}
            {!attachTarget && (
            <div className="flex items-center gap-4">
              {coverPreview ? (
                <img src={coverPreview} alt="Cover preview" className="h-16 w-16 rounded-lg object-cover shadow" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-border">
                  <ImageIcon className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <Label htmlFor="upload-cover" className="text-sm">
                  Cover art
                </Label>
                <p className="text-xs text-muted-foreground">Square images look best. Optional.</p>
                <Input id="upload-cover" type="file" accept="image/*" onChange={pickCover} className="mt-1.5" />
              </div>
            </div>
            )}

            {pct !== null && (
              <div className="space-y-1.5">
                <Progress value={pct} className="h-1.5" />
                {stage && <p className="text-xs text-muted-foreground">{stage}</p>}
              </div>
            )}

            <Button type="submit" disabled={busy} className="w-full rounded-full font-semibold">
              <Upload className="mr-2 h-4 w-4" />
              {busy ? `Uploading…${pct !== null ? ` ${pct}%` : ""}` : "Share with the fans"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
