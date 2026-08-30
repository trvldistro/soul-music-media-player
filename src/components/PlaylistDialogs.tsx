import { useState } from "react";
import { ListMusic, Plus } from "lucide-react";
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
import { useAddTrackToPlaylist, useCreatePlaylist, usePlaylists } from "@/lib/queries";
import type { Track } from "@/lib/types";
import { toast } from "sonner";

interface CreatePlaylistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePlaylistDialog({ open, onOpenChange }: CreatePlaylistDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const create = useCreatePlaylist();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Give the playlist a name");
      return;
    }
    try {
      await create.mutateAsync({ name: name.trim(), description: description.trim() });
      toast.success("Playlist created", { description: name.trim() });
      setName("");
      setDescription("");
      onOpenChange(false);
    } catch {
      toast.error("Could not create the playlist — try again");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl italic">New playlist</DialogTitle>
          <DialogDescription>A place for the cuts you keep coming back to.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="playlist-name">Name</Label>
            <Input
              id="playlist-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Late night slow jams"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="playlist-description">Description</Label>
            <Input
              id="playlist-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <Button type="submit" disabled={create.isPending} className="w-full rounded-full font-semibold">
            Create playlist
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface AddToPlaylistDialogProps {
  track: Track | null;
  onOpenChange: (open: boolean) => void;
}

export function AddToPlaylistDialog({ track, onOpenChange }: AddToPlaylistDialogProps) {
  const open = track !== null;
  const playlistsQ = usePlaylists(true);
  const addTrack = useAddTrackToPlaylist();
  const createPlaylist = useCreatePlaylist();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  async function addTo(playlistId: number, playlistName: string) {
    if (!track) return;
    try {
      await addTrack.mutateAsync({ playlistId, trackId: track.rowId });
      toast.success("Added", { description: `${track.title} → ${playlistName}` });
      onOpenChange(false);
    } catch {
      toast.error("Could not add the track — try again");
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!track || !newName.trim()) return;
    try {
      const playlist = await createPlaylist.mutateAsync({ name: newName.trim() });
      await addTrack.mutateAsync({ playlistId: playlist.rowId, trackId: track.rowId });
      toast.success("Added", { description: `${track.title} → ${newName.trim()}` });
      setNewName("");
      setCreating(false);
      onOpenChange(false);
    } catch {
      toast.error("Could not create the playlist — try again");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl italic">Add to playlist</DialogTitle>
          <DialogDescription>
            {track ? `Where should “${track.title}” go?` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
          {(playlistsQ.data ?? []).map((pl) => (
            <button
              key={pl.rowId}
              onClick={() => addTo(pl.rowId, pl.name)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-accent/50"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-secondary">
                <ListMusic className="h-4 w-4 text-muted-foreground" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{pl.name}</span>
                {pl.description && (
                  <span className="block truncate text-xs text-muted-foreground">{pl.description}</span>
                )}
              </span>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
          {playlistsQ.data?.length === 0 && !creating && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              No playlists yet — start one below.
            </p>
          )}
        </div>

        {creating ? (
          <form onSubmit={handleCreate} className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Playlist name"
              autoFocus
            />
            <Button type="submit" className="rounded-full" disabled={!newName.trim()}>
              Create
            </Button>
          </form>
        ) : (
          <Button variant="outline" className="w-full rounded-full" onClick={() => setCreating(true)}>
            <Plus className="mr-2 h-4 w-4" /> New playlist
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
