import { useMemo, useState } from "react";
import { BadgeCheck, Check, Copy, Link2, Plus, Search, UserPlus, Users } from "lucide-react";
import type { ArtistProfile, Track } from "@/lib/types";
import {
  artistShareLink,
  buildArtistListing,
  searchArtistListing,
  sqlSafeAliasNote,
  type ArtistListing,
} from "@/lib/artistHandle";
import { findArtistMatch, normalizeArtistName } from "@/lib/artistMatch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ArtistsViewProps {
  artists: ArtistProfile[];
  tracks: Track[];
  site: string;
  onOpenArtist: (name: string) => void;
  /** Creates (or resolves to) the artist profile for a typed name. */
  onCreateArtist: (name: string) => Promise<{ name: string; handle: string; created: boolean } | null>;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

/**
 * The artist directory: every profile SOUL has, searchable by name, spelling
 * variant or @handle — no link pasting needed. Each row shows the link an
 * artist can share, and the verified badge doubles as identity confirmation.
 */
export function ArtistsView({ artists, tracks, site, onOpenArtist, onCreateArtist }: ArtistsViewProps) {
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [note, setNote] = useState<{ kind: "ok" | "warn" | "error"; text: string } | null>(null);

  const listing = useMemo(() => buildArtistListing(artists, tracks), [artists, tracks]);
  const shown = useMemo(() => searchArtistListing(listing, query), [listing, query]);

  // A typed name that already IS an artist resolves instead of duplicating.
  const exact = useMemo(() => findArtistMatch(newName, artists), [newName, artists]);

  const copy = async (item: ArtistListing) => {
    const link = artistShareLink(site, item.profile.name);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(item.handle);
      setTimeout(() => setCopied((c) => (c === item.handle ? null : c)), 1800);
    } catch {
      setNote({ kind: "warn", text: `Copy this link by hand: ${link}` });
    }
  };

  const submitNew = async () => {
    const name = newName.trim().replace(/\s+/g, " ");
    if (!name) return;
    setCreating(true);
    setNote(null);
    try {
      const result = await onCreateArtist(name);
      if (!result) {
        setNote({ kind: "error", text: "Could not create the artist. Try again in a moment." });
      } else if (!result.created) {
        setNote({
          kind: "ok",
          text: `${result.name} was already here — same profile, same link. Opening it.`,
        });
      } else {
        setNote({ kind: "ok", text: `${result.name} created · /artist/${result.handle}` });
      }
      const target = result?.name ?? name;
      setCreateOpen(false);
      setNewName("");
      onOpenArtist(target);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl italic sm:text-4xl">Artists</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {listing.length} {listing.length === 1 ? "profile" : "profiles"} · search a name or paste an
            artist's link — both land on the same page.
          </p>
        </div>
        <Button className="h-10 rounded-full px-5 font-semibold" onClick={() => setCreateOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" /> New artist
        </Button>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search artists — name or @handle"
          aria-label="Search artists"
          className="h-12 rounded-full border-border bg-card pl-10 text-base"
        />
      </div>

      {note && (
        <p
          role={note.kind === "error" ? "alert" : "status"}
          className={
            note.kind === "error"
              ? "text-sm font-medium text-destructive"
              : "text-sm text-muted-foreground"
          }
        >
          {note.text}
        </p>
      )}

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-6 py-16 text-center">
          <Users className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            No artist matches “{query.trim()}”.
          </p>
          <Button variant="outline" className="rounded-full" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create “{query.trim()}”
          </Button>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((item) => (
            <li
              key={item.profile.rowId > 0 ? `row-${item.profile.rowId}` : `name-${item.handle}`}
              className="group flex items-center gap-3 rounded-2xl border border-border/60 bg-card/70 p-3 transition hover:border-primary/50"
            >
              <button
                onClick={() => onOpenArtist(item.profile.name)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-secondary font-display text-base italic text-gold-soft">
                  {initials(item.profile.name) || "A"}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 truncate text-sm font-semibold">
                    {item.profile.name}
                    {item.profile.status === "claimed" && (
                      <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-label="Verified artist" />
                    )}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    @{item.handle} · {item.songCount} {item.songCount === 1 ? "song" : "songs"}
                    {item.profile.status === "claimed" ? " · Verified" : ""}
                  </span>
                </span>
              </button>
              <button
                onClick={() => void copy(item)}
                title={artistShareLink(site, item.profile.name)}
                aria-label={`Copy the link to ${item.profile.name}`}
                className="shrink-0 rounded-full border border-border p-2 text-muted-foreground transition hover:border-primary/50 hover:text-primary"
              >
                {copied === item.handle ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl italic">New artist</DialogTitle>
            <DialogDescription>
              Type the exact stage name. If the artist already exists under a slightly different
              spelling, SOUL opens that profile instead of making a duplicate.
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !creating) void submitNew();
            }}
            placeholder="Artist name"
            aria-label="Artist name"
            className="h-11 rounded-full"
          />
          <p className="text-xs text-muted-foreground">{sqlSafeAliasNote()}</p>
          {exact && (
            <p className="flex items-start gap-2 rounded-xl border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
              <Link2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Already exists as <strong className="text-foreground">{exact.name}</strong>
                {normalizeArtistName(exact.name) === normalizeArtistName(newName)
                  ? " — this will open that profile."
                  : "."}
              </span>
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-full font-semibold"
              disabled={creating || !newName.trim()}
              onClick={() => void submitNew()}
            >
              {creating ? "Creating…" : exact ? "Open this artist" : "Create artist"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
