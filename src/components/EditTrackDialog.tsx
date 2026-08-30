import { useEffect, useState } from "react";
import { Lock, TriangleAlert } from "lucide-react";
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
import type { CommandResult, EditTrackOnceData } from "@/lib/commands";
import { GENRES } from "@/lib/genres";
import { useEditTrack } from "@/lib/queries";
import { songCode } from "@/lib/songCode";
import { editRejectionMessage } from "@/lib/trackEdit";
import type { Track } from "@/lib/types";
import { toast } from "sonner";

interface EditTrackDialogProps {
  track: Track | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Phase = "warn" | "form" | "locked";

/**
 * Edits a song's details through the guarded edit_track_once command. The uploader is told
 * up front that the edit can happen exactly once; the server enforces that regardless.
 */
export function EditTrackDialog({ track, open, onOpenChange }: EditTrackDialogProps) {
  const [phase, setPhase] = useState<Phase>("warn");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [genre, setGenre] = useState("Soul");
  const editTrack = useEditTrack();
  const busy = editTrack.isPending;

  useEffect(() => {
    if (open && track) {
      setPhase(track.editState === "locked" ? "locked" : "warn");
      setTitle(track.title);
      setArtist(track.artist);
      setAlbum(track.album);
      setGenre(track.genre);
    }
  }, [open, track]);

  async function handleSave() {
    if (!track) return;
    const nextTitle = title.trim();
    const nextArtist = artist.trim();
    if (!nextTitle) {
      toast.error("Title is required");
      return;
    }
    if (!nextArtist) {
      toast.error("Artist name is required");
      return;
    }

    let result: CommandResult<EditTrackOnceData> | null = null;
    try {
      result = await editTrack.mutateAsync({
        trackId: track.rowId,
        title: nextTitle,
        artist: nextArtist,
        album: album.trim(),
        genre,
      });
    } catch {
      toast.error("Couldn't reach the player", {
        description: "Check whether the change landed before trying again.",
      });
      return;
    }

    if (result.outcome === "rejected") {
      toast.error("Edit not saved", { description: editRejectionMessage(result.code) });
      if (result.code === "PreconditionFailed" || result.code === "Conflict") {
        setPhase("locked");
      }
      return;
    }

    toast.success("Details saved", {
      description: "That was your one edit — this song's details are locked now.",
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-border bg-card sm:max-w-md">
        {track && phase === "warn" && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl italic">One edit only</DialogTitle>
              <DialogDescription>
                Read this before you touch anything.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 rounded-xl border border-primary/30 bg-primary/5 p-6 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
                <TriangleAlert className="h-6 w-6 text-primary" />
              </span>
              <p className="text-sm leading-relaxed">
                You can fix the details on{" "}
                <span className="font-semibold">“{track.title}”</span> — but only{" "}
                <span className="font-semibold">once</span>. The moment you save, the title,
                artist, album and genre lock for good.
              </p>
              <p className="text-xs text-muted-foreground">
                Double-check the spelling before you continue.
              </p>
              {track.rowId > 0 && (
                <p className="font-mono text-[11px] tracking-[0.2em] text-muted-foreground">
                  {songCode(track.rowId)}
                </p>
              )}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button className="rounded-full font-semibold" onClick={() => setPhase("form")}>
                Got it — edit details
              </Button>
            </div>
          </>
        )}

        {track && phase === "form" && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl italic">Edit song details</DialogTitle>
              <DialogDescription>
                {track.rowId > 0 ? `${songCode(track.rowId)} · ` : ""}
                {track.title} · {track.artist}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-artist">Artist name</Label>
                  <Input
                    id="edit-artist"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    placeholder="The name your fans know"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-title">Title</Label>
                  <Input
                    id="edit-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Song title"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-album">Album</Label>
                  <Input
                    id="edit-album"
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
              <p className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
                Saving spends your one edit — after this, the details are locked.
              </p>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  className="rounded-full"
                  disabled={busy}
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button className="rounded-full font-semibold" disabled={busy} onClick={() => void handleSave()}>
                  {busy ? "Saving…" : "Save details"}
                </Button>
              </div>
            </div>
          </>
        )}

        {track && phase === "locked" && (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-2xl italic">This song's edit is used</DialogTitle>
              <DialogDescription>The details are locked — one edit per song.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border p-8 text-center">
              <Lock className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                “{track.title}” was already edited once, so its details can't be changed again.
              </p>
            </div>
            <div className="flex justify-end">
              <Button className="rounded-full" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
