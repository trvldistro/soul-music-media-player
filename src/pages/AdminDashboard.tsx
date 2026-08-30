import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Check,
  Clapperboard,
  Clock,
  Headphones,
  Loader2,
  LogOut,
  Mic2,
  Music2,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Hourglass,
  KeyRound,
  Trash2,
  Users,
  VideoOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ClaimsReview } from "@/components/ClaimsReview";
import { useAuth } from "@/hooks/useAuth";
import { ADMIN_EMAIL, isAdminEmail, moderationLabel, takedownCountdownLabel, type ModerationStatus } from "@/lib/admin";
import {
  fetchAdminSnapshot,
  runAdminAction,
  type AdminActionName,
  type AdminUserRecord,
} from "@/lib/adminApi";
import { useAllLyrics, useModerationTracks } from "@/lib/queries";
import { formatDuration, formatPlayCount } from "@/lib/format";
import { songCode } from "@/lib/songCode";
import type { Track } from "@/lib/types";
import { cn } from "@/lib/utils";

type AdminTab = "queue" | "songs" | "videos" | "lyrics" | "users" | "claims" | "artists";

export default function AdminDashboard() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading admin dashboard" />
      </div>
    );
  }

  if (!user) {
    return (
      <GateScreen
        icon={<Headphones className="h-10 w-10 text-muted-foreground" />}
        title="Admin sign-in required"
        body={
          <>
            This dashboard is restricted to the authorized admin account. Sign in with the
            admin email to continue.
          </>
        }
        actions={
          <Button asChild className="rounded-full font-semibold">
            <Link to="/signin?redirect=/admin">Sign in as admin</Link>
          </Button>
        }
      />
    );
  }

  if (!isAdminEmail(user.email as string | undefined)) {
    return (
      <GateScreen
        icon={<ShieldAlert className="h-10 w-10 text-destructive" />}
        title="Access denied"
        body={
          <>
            This dashboard is restricted to the authorized admin account (
            <span className="font-medium text-foreground">{ADMIN_EMAIL}</span>). You are signed
            in as <span className="font-medium text-foreground">{user.email as string}</span>.
          </>
        }
        actions={
          <>
            <Button variant="outline" className="rounded-full" onClick={() => void signOut()}>
              <LogOut className="mr-1.5 h-4 w-4" /> Sign out
            </Button>
            <Button asChild variant="ghost" className="rounded-full">
              <Link to="/">Back to the player</Link>
            </Button>
          </>
        }
      />
    );
  }

  return <AdminConsole />;
}

function GateScreen({
  icon,
  title,
  body,
  actions,
}: {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
  actions: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-3xl border border-border bg-card px-8 py-14 text-center">
        {icon}
        <h1 className="font-display text-3xl italic">{title}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">{actions}</div>
      </div>
    </div>
  );
}

function AdminConsole() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<AdminTab>("queue");
  const [search, setSearch] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [takedown, setTakedown] = useState<Track | null>(null);
  const [banTarget, setBanTarget] = useState<AdminUserRecord | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminUserRecord | null>(null);

  const tracksQ = useModerationTracks();
  const lyricsQ = useAllLyrics();
  const snapshotQ = useQuery({
    queryKey: ["adminSnapshot"],
    queryFn: fetchAdminSnapshot,
    refetchInterval: 15000,
  });

  const tracks = useMemo(() => tracksQ.data ?? [], [tracksQ.data]);
  const users = snapshotQ.data?.users ?? [];
  const bans = snapshotQ.data?.bans ?? [];
  const activeBans = useMemo(
    () => new Map(bans.filter((b) => Number(b.active) === 1).map((b) => [b.user_uuid, b])),
    [bans],
  );
  const emailFor = (uuid: string | null) =>
    uuid ? users.find((u) => u.uuid === uuid)?.email ?? "" : "";
  const uploadCount = (uuid: string) => tracks.filter((t) => t.createdBy === uuid).length;

  // Every artist profile the system has created, with per-profile song and play
  // totals — verified pages stay listed here even with an empty catalogue.
  const artistRows = useMemo(() => {
    const rows = snapshotQ.data?.artists ?? [];
    if (search.trim() === "") return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((a) => a.name.toLowerCase().includes(q));
  }, [snapshotQ.data, search]);
  const totalPlays = useMemo(
    () => tracks.reduce((sum, t) => sum + (t.playCount || 0), 0),
    [tracks],
  );

  const pendingClaims = snapshotQ.data?.claims ?? [];
  const queue = useMemo(
    () => tracks.filter((t) => t.moderationStatus === "unverified"),
    [tracks],
  );
  const matches = (t: Track) =>
    search.trim() === "" ||
    `${t.title} ${t.artist} ${t.album} ${t.genre} ${emailFor(t.createdBy)}`
      .toLowerCase()
      .includes(search.trim().toLowerCase());
  const songs = useMemo(
    () => tracks.filter((t) => t.mediaKind === "audio" && matches(t)),
    [tracks, search, users],
  );
  const videos = useMemo(
    () => tracks.filter((t) => t.mediaKind === "video" && matches(t)),
    [tracks, search, users],
  );
  const lyrics = useMemo(() => {
    const rows = lyricsQ.data ?? [];
    if (search.trim() === "") return rows;
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const title = tracks.find((t) => t.rowId === row.trackId)?.title ?? "";
      return `${title} ${row.plainText} ${emailFor(row.createdBy)}`.toLowerCase().includes(q);
    });
  }, [lyricsQ.data, search, tracks, users]);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["tracks"] });
    void qc.invalidateQueries({ queryKey: ["artists"] });
    void qc.invalidateQueries({ queryKey: ["artistClaims"] });
    void qc.refetchQueries({ queryKey: ["adminSnapshot"] });
  };

  const [busyAction, setBusyAction] = useState<string | null>(null);

  const act = async (action: AdminActionName, label: string, payload: Record<string, string | number | null> = {}) => {
    setBusyAction(action + JSON.stringify(payload));
    try {
      await runAdminAction(action, payload);
      setNote(null);
      toast.success(label);
      refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : `${label} failed.`;
      setNote(msg);
      toast.error(msg);
    } finally {
      setBusyAction(null);
    }
  };

  const stats: Array<{ label: string; value: number }> = [
    { label: "Waiting review", value: queue.length },
    { label: "Songs", value: tracks.filter((t) => t.mediaKind === "audio").length },
    { label: "Videos", value: tracks.filter((t) => t.mediaKind === "video").length },
    { label: "Lyrics", value: lyricsQ.data?.length ?? 0 },
    { label: "Users", value: users.length },
    { label: "Pending claims", value: pendingClaims.length },
    { label: "Artist profiles", value: artistRows.length },
    { label: "Total plays", value: totalPlays },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70 bg-card/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-5 py-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl italic sm:text-3xl">Admin dashboard</h1>
            <p className="truncate text-xs text-muted-foreground">
              Signed in as {ADMIN_EMAIL} · song review, moderation and artist verification
            </p>
          </div>
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link to="/">
              <Headphones className="mr-1.5 h-4 w-4" /> Back to the player
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-5 py-7">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border/70 bg-card px-4 py-3">
              <p className="text-2xl font-bold tabular-nums">{s.value}</p>
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {note && (
          <p role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {note}
          </p>
        )}
        {snapshotQ.data?.usersError && (
          <p role="alert" className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-400">
            The users list could not be loaded: {snapshotQ.data.usersError}. Moderation still
            works — try again in a moment.
          </p>
        )}

        <Tabs value={tab} onValueChange={(v) => setTab(v as AdminTab)}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList className="flex-wrap">
              <TabsTrigger value="queue">
                Review queue{queue.length > 0 ? ` · ${queue.length}` : ""}
              </TabsTrigger>
              <TabsTrigger value="songs">Songs</TabsTrigger>
              <TabsTrigger value="videos">Videos</TabsTrigger>
              <TabsTrigger value="lyrics">Lyrics</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="claims">Artist claims</TabsTrigger>
              <TabsTrigger value="artists">Artists</TabsTrigger>
            </TabsList>
            <div className="relative w-full max-w-xs">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search content or email…"
                className="h-9 rounded-full pl-9"
                aria-label="Search admin content"
              />
            </div>
          </div>

          <TabsContent value="queue" className="mt-5 space-y-3">
            {queue.length === 0 ? (
              <EmptyState
                icon={<Check className="h-8 w-8 text-muted-foreground" />}
                text="Nothing waiting — new uploads land here marked Unverified."
              />
            ) : (
              queue.map((track) => (
                <div key={track.rowId} className="rounded-2xl border border-border/70 bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-1 gap-4">
                      <TrackThumb track={track} />
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                          {track.title}
                          <StatusChip status={track.moderationStatus} />
                          <KindChip track={track} />
                          {track.rowId > 0 && (
                            <span className="font-mono text-[10px] tracking-wider text-muted-foreground">
                              {songCode(track.rowId)}
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {track.artist} · {track.genre} · {formatDuration(track.duration)}
                          {track.album ? ` · ${track.album}` : ""}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          Uploaded by{" "}
                          <span className="text-foreground">
                            {emailFor(track.createdBy) || track.uploaderName || "unknown"}
                          </span>
                          {track.createdAt
                            ? ` · ${new Date(track.createdAt).toLocaleDateString()}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        size="sm"
                        className="rounded-full font-semibold"
                        disabled={busyAction !== null}
                        onClick={() => act("verify_track", `“${track.title}” is now verified`, { track_id: track.rowId })}
                      >
                        {busyAction?.startsWith("verify_track") ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Verify
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        disabled={busyAction !== null}
                        onClick={() => setTakedown(track)}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Take down
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4">
                    {track.mediaKind === "video" && track.videoUrl ? (
                      <video
                        controls
                        preload="metadata"
                        src={track.videoUrl}
                        className="max-h-72 w-full rounded-xl bg-black"
                        aria-label={`Preview ${track.title}`}
                      />
                    ) : (
                      <audio
                        controls
                        preload="metadata"
                        src={track.audioUrl}
                        className="w-full"
                        aria-label={`Preview ${track.title}`}
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="songs" className="mt-5 space-y-2">
            {songs.length === 0 ? (
              <EmptyState icon={<Music2 className="h-8 w-8 text-muted-foreground" />} text="No songs match." />
            ) : (
              songs.map((track) => (
                <ContentRow
                  key={track.rowId}
                  track={track}
                  uploaderEmail={emailFor(track.createdBy) || track.uploaderName}
                  videoByEmail={emailFor(track.videoBy ?? null) || "a fan"}
                  busy={busyAction !== null}
                  onVerify={() => act("verify_track", `“${track.title}” is now verified`, { track_id: track.rowId })}
                  onTakedown={() => setTakedown(track)}
                  onRestore={() => act("restore_track", `“${track.title}” is back in the review queue`, { track_id: track.rowId })}
                  onDetachVideo={() =>
                    act("detach_video", `Video removed from “${track.title}”`, { track_id: track.rowId })
                  }
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="videos" className="mt-5 space-y-2">
            {videos.length === 0 ? (
              <EmptyState icon={<Clapperboard className="h-8 w-8 text-muted-foreground" />} text="No videos match." />
            ) : (
              videos.map((track) => (
                <ContentRow
                  key={track.rowId}
                  track={track}
                  uploaderEmail={emailFor(track.createdBy) || track.uploaderName}
                  busy={busyAction !== null}
                  onVerify={() => act("verify_track", `“${track.title}” is now verified`, { track_id: track.rowId })}
                  onTakedown={() => setTakedown(track)}
                  onRestore={() => act("restore_track", `“${track.title}” is back in the review queue`, { track_id: track.rowId })}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="lyrics" className="mt-5 space-y-2">
            {lyrics.length === 0 ? (
              <EmptyState icon={<Mic2 className="h-8 w-8 text-muted-foreground" />} text="No lyrics yet." />
            ) : (
              lyrics.map((row) => {
                const track = tracks.find((t) => t.rowId === row.trackId);
                return (
                  <div key={row.rowId} className="rounded-xl border border-border/60 bg-card/60 px-4 py-3">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {track ? track.title : `Track #${row.trackId}`}
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          row.syncState === "synced"
                            ? "border-emerald-500/40 text-emerald-400"
                            : "border-border text-muted-foreground",
                        )}
                      >
                        {row.syncState === "synced" ? "Synced" : "Unsynced"}
                      </span>
                      {track?.moderationStatus === "removed" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-destructive/50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
                          Song taken down
                        </span>
                      )}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {row.plainText.split("\n")[0]?.slice(0, 120) || "(empty)"}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {track ? `${track.artist} · ` : ""}
                      {emailFor(row.createdBy) || "community"}
                    </p>
                  </div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="users" className="mt-5 space-y-2">
            {users.length === 0 ? (
              <EmptyState icon={<Users className="h-8 w-8 text-muted-foreground" />} text="No registered users found." />
            ) : (
              users.map((u) => {
                const ban = activeBans.get(u.uuid);
                const banned = ban !== undefined || !u.enabled;
                const isSelf = isAdminEmail(u.email);
                return (
                  <div key={u.uuid} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                      {(u.name || u.email || "?").charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 truncate text-sm font-medium">
                        {u.email}
                        {isSelf && (
                          <span className="rounded-full border border-primary/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                            Admin
                          </span>
                        )}
                        <span
                          className={cn(
                            "rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                            banned
                              ? "border-destructive/50 text-destructive"
                              : "border-emerald-500/40 text-emerald-400",
                          )}
                        >
                          {banned ? "Banned" : "Active"}
                        </span>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {u.name || "—"} · {uploadCount(u.uuid)} {uploadCount(u.uuid) === 1 ? "upload" : "uploads"}
                        {ban ? ` · ${ban.reason}` : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      disabled={busyAction !== null}
                      onClick={() => setResetTarget(u)}
                    >
                      <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Set password
                    </Button>
                    {banned ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        disabled={busyAction !== null}
                        onClick={() => act("unban_user", `${u.email} can sign in again`, { user_uuid: u.uuid })}
                      >
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Unban
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full text-destructive"
                        disabled={isSelf || busyAction !== null}
                        onClick={() => setBanTarget(u)}
                      >
                        Ban…
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="claims" className="mt-5">
            <ClaimsReview
              claims={pendingClaims}
              busyName={null}
              errorNote={note}
              onApprove={(name) =>
                act("approve_claim", `${name} is now a verified artist`, { name })
              }
              onReject={(name) =>
                act("reject_claim", `Claim for ${name} rejected — the profile stays unclaimed`, { name })
              }
            />
          </TabsContent>
          <TabsContent value="artists" className="mt-5 space-y-2">
            {artistRows.length === 0 ? (
              <EmptyState
                icon={<Mic2 className="h-8 w-8 text-muted-foreground" />}
                text="No artist profiles yet — they appear as fans upload under new names."
              />
            ) : (
              artistRows.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold">
                    {a.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 truncate text-sm font-medium">
                      {a.name}
                      <span
                        className={cn(
                          "rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          a.status === "claimed"
                            ? "border-emerald-500/40 text-emerald-400"
                            : a.status === "pending"
                              ? "border-amber-500/40 text-amber-400"
                              : "border-border text-muted-foreground",
                        )}
                      >
                        {a.status === "claimed" ? "Verified" : a.status === "pending" ? "Claim pending" : "Unclaimed"}
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.songs} {a.songs === 1 ? "song" : "songs"} · {formatPlayCount(a.plays)}{" "}
                      {a.plays === 1 ? "play" : "plays"}
                      {a.created_at ? ` · created ${new Date(a.created_at).toLocaleDateString()}` : ""}
                    </p>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      <TakedownDialog
        track={takedown}
        users={users}
        onClose={() => setTakedown(null)}
        onDone={() => {
          setTakedown(null);
          refresh();
        }}
      />
      <BanDialog
        target={banTarget}
        onClose={() => setBanTarget(null)}
        onDone={() => {
          setBanTarget(null);
          refresh();
        }}
      />
      <ResetPasswordDialog
        target={resetTarget}
        onClose={() => setResetTarget(null)}
        onDone={() => setResetTarget(null)}
      />
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-6 py-14 text-center">
      {icon}
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function TrackThumb({ track }: { track: Track }) {
  return track.coverUrl ? (
    <img src={track.coverUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover shadow" />
  ) : (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-secondary">
      <Music2 className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

function KindChip({ track }: { track: Track }) {
  if (track.mediaKind !== "video") return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold-soft">
      <Clapperboard className="h-3 w-3" /> Video
    </span>
  );
}

function StatusChip({ status }: { status: ModerationStatus }) {
  const cls =
    status === "verified"
      ? "border-emerald-500/40 text-emerald-400"
      : status === "removed"
        ? "border-destructive/50 text-destructive"
        : "border-amber-500/40 text-amber-400";
  const Icon = status === "verified" ? ShieldCheck : status === "removed" ? Trash2 : Clock;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        cls,
      )}
    >
      <Icon className="h-3 w-3" /> {moderationLabel(status)}
    </span>
  );
}

function ContentRow({
  track,
  uploaderEmail,
  videoByEmail,
  busy,
  onVerify,
  onTakedown,
  onRestore,
  onDetachVideo,
}: {
  track: Track;
  uploaderEmail: string;
  videoByEmail?: string;
  busy: boolean;
  onVerify: () => void;
  onTakedown: () => void;
  onRestore: () => void;
  onDetachVideo?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3">
      <TrackThumb track={track} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 truncate text-sm font-medium">
          {track.title}
          <StatusChip status={track.moderationStatus} />
          <KindChip track={track} />
          {track.rowId > 0 && (
            <span className="font-mono text-[10px] tracking-wider text-muted-foreground">
              {songCode(track.rowId)}
            </span>
          )}
          {track.moderationStatus === "removed" && track.removedAt != null && (
            <span className="inline-flex items-center gap-1 rounded-full border border-destructive/40 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
              <Hourglass className="h-3 w-3" /> Auto-deletes {takedownCountdownLabel(track.removedAt)}
            </span>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {track.artist} · {track.album || "single"} · {track.genre} · {formatDuration(track.duration)} · {formatPlayCount(track.playCount ?? 0)} {track.playCount === 1 ? "play" : "plays"}
          {uploaderEmail ? ` · ${uploaderEmail}` : ""}
          {track.mediaKind === "audio" && track.videoUrl && videoByEmail
            ? ` · video by ${videoByEmail}`
            : ""}
        </p>
        {track.moderationStatus === "removed" && track.moderationNote && (
          <p className="truncate text-xs text-destructive">Taken down: {track.moderationNote}</p>
        )}
      </div>
      <div className="flex shrink-0 gap-1.5">
        {track.moderationStatus === "unverified" && (
          <Button size="sm" className="rounded-full font-semibold" disabled={busy} onClick={onVerify}>
            <Check className="mr-1.5 h-3.5 w-3.5" /> Verify
          </Button>
        )}
        {track.mediaKind === "audio" && track.videoUrl && onDetachVideo && (
          <Button size="sm" variant="outline" className="rounded-full" disabled={busy} onClick={onDetachVideo}>
            <VideoOff className="mr-1.5 h-3.5 w-3.5" /> Detach video
          </Button>
        )}
        {track.moderationStatus !== "removed" ? (
          <Button size="sm" variant="outline" className="rounded-full text-destructive" disabled={busy} onClick={onTakedown}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Take down
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="rounded-full" disabled={busy} onClick={onRestore}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restore
          </Button>
        )}
      </div>
    </div>
  );
}

function ResetPasswordDialog({
  target,
  onClose,
  onDone,
}: {
  target: AdminUserRecord | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (target) {
      setPassword("");
      setConfirm("");
      setError(null);
    }
  }, [target]);

  const submit = async () => {
    if (!target) return;
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      await runAdminAction("set_user_password", { user_uuid: target.uuid, password });
      toast.success(`New password set for ${target.email}`, {
        description: "No email needed — share it with them directly.",
      });
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The password wasn't set.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={target !== null} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="rounded-2xl border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl italic">Set a new password</DialogTitle>
          <DialogDescription>
            For {target?.email}. Use this when the reset email doesn't arrive — set a password
            and share it with them directly.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="admin-new-password">New password</Label>
            <Input
              id="admin-new-password"
              type="text"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admin-new-password-confirm">Repeat it</Label>
            <Input
              id="admin-new-password-confirm"
              type="text"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-full" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button className="rounded-full font-semibold" disabled={busy} onClick={() => void submit()}>
            {busy ? "Setting…" : "Set password"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TakedownDialog({
  track,
  users,
  onClose,
  onDone,
}: {
  track: Track | null;
  users: AdminUserRecord[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [alsoBan, setAlsoBan] = useState(false);
  const [busy, setBusy] = useState(false);

  const uploader = useMemo(() => {
    if (!track?.createdBy) return null;
    return users.find((u) => u.uuid === track.createdBy) ?? null;
  }, [track, users]);
  const canBanUploader = uploader !== null && !isAdminEmail(uploader.email);

  const confirm = async () => {
    if (!track) return;
    setBusy(true);
    try {
      await runAdminAction("takedown_track", { track_id: track.rowId, reason: reason.trim() });
      if (alsoBan && canBanUploader && uploader) {
        try {
          await runAdminAction("ban_user", {
            user_uuid: uploader.uuid,
            reason: reason.trim() || "Copyrighted content",
          });
          toast(`${uploader.email} was banned`);
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "The song was removed but the ban failed.");
        }
      }
      toast.success(`“${track.title}” was taken down`);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The takedown failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={track !== null} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="rounded-2xl border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl italic">Take down “{track?.title}”?</DialogTitle>
          <DialogDescription>
            The song disappears from the site immediately. You can restore it from the Songs
            tab for 7 days — after that it is deleted permanently, files and all.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="takedown-reason">Reason</Label>
            <Textarea
              id="takedown-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Copyrighted content, rule violation…"
              className="min-h-20"
            />
          </div>
          {canBanUploader && uploader && (
            <label className="flex items-start gap-3 rounded-xl border border-border/70 p-3 text-sm">
              <Checkbox
                checked={alsoBan}
                onCheckedChange={(c) => setAlsoBan(c === true)}
                className="mt-0.5"
                aria-label="Also ban the uploader"
              />
              <span>
                Also ban the uploader ({uploader.email}) — they can no longer sign in or upload.
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Use for repeat copyright offenders.
                </span>
              </span>
            </label>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-full" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" className="rounded-full" disabled={busy} onClick={() => void confirm()}>
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
            Take down
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BanDialog({
  target,
  onClose,
  onDone,
}: {
  target: AdminUserRecord | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await runAdminAction("ban_user", {
        user_uuid: target.uuid,
        reason: reason.trim() || "Rule violation",
      });
      toast.success(`${target.email} was banned`);
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The ban failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={target !== null} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="rounded-2xl border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl italic">Ban {target?.email}?</DialogTitle>
          <DialogDescription>
            Their account is disabled immediately — sessions are revoked and they cannot sign
            back in. Their uploads stay up until you take them down.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="ban-reason">Reason</Label>
          <Textarea
            id="ban-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Uploaded copyrighted content…"
            className="min-h-20"
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-full" disabled={busy} onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" className="rounded-full" disabled={busy} onClick={() => void confirm()}>
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <ShieldAlert className="mr-1.5 h-4 w-4" />}
            Ban user
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
