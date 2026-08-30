import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Clapperboard,
  FolderOpen,
  Loader2,
  Music2,
  Play,
  RefreshCw,
  Smartphone,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { usePlayer } from "@/player/PlayerProvider";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  clearSessionFiles,
  disconnectFolder,
  ensureFolderAccess,
  formatBytes,
  getDeviceDuration,
  getFolderStatus,
  listDeviceMedia,
  pickMusicFolder,
  registerSessionFiles,
  supportsDirectoryPicker,
  toDeviceTracks,
  type DeviceMediaMeta,
} from "@/lib/deviceStorage";

/**
 * "Device storage" — the visitor grants read access to their own music folder
 * (or picks files on phones), and everything listed here plays straight from
 * device storage. Nothing is imported, copied or uploaded.
 */
export function DeviceLibraryView() {
  const player = usePlayer();
  const qc = useQueryClient();
  const folderInputRef = useRef<HTMLInputElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  const folderQ = useQuery({ queryKey: ["deviceFolder"], queryFn: getFolderStatus });
  const scanQ = useQuery({
    queryKey: ["deviceMedia", folderQ.data?.name, folderQ.data?.permission],
    queryFn: () => listDeviceMedia(),
  });

  const metas = scanQ.data ?? [];
  const folder = folderQ.data;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return metas;
    return metas.filter((m) =>
      `${m.title} ${m.artist} ${m.path}`.toLowerCase().includes(needle),
    );
  }, [metas, query]);

  const totalBytes = useMemo(() => metas.reduce((sum, m) => sum + m.size, 0), [metas]);
  const currentPath = player.current?.devicePath ?? null;

  const openFolder = async () => {
    if (supportsDirectoryPicker()) {
      try {
        const name = await pickMusicFolder();
        if (!name) return; // visitor closed the prompt
        toast.success(`Connected to “${name}” — reading it straight from your device`);
      } catch {
        toast.error("Could not open that folder — try again, or pick files instead.");
        return;
      }
    } else {
      folderInputRef.current?.click();
      return;
    }
    void qc.invalidateQueries({ queryKey: ["deviceFolder"] });
    void qc.invalidateQueries({ queryKey: ["deviceMedia"] });
  };

  const onFilesPicked = (files: FileList | null) => {
    const res = registerSessionFiles(files);
    if (res.added > 0) {
      toast.success(`${res.added} file${res.added === 1 ? "" : "s"} ready — they play straight from storage`);
    }
    if (res.skipped > 0) {
      toast(`${res.skipped} skipped — unplayable or already listed`);
    }
    void qc.invalidateQueries({ queryKey: ["deviceMedia"] });
  };

  const reconnect = async () => {
    const ok = await ensureFolderAccess();
    if (!ok) {
      toast.error("Access was not granted. Allow it in your browser's site settings, then try again.");
      return;
    }
    void qc.invalidateQueries({ queryKey: ["deviceFolder"] });
    void qc.invalidateQueries({ queryKey: ["deviceMedia"] });
  };

  const stopAccess = async () => {
    await disconnectFolder();
    clearSessionFiles();
    setQuery("");
    void qc.invalidateQueries({ queryKey: ["deviceFolder"] });
    void qc.invalidateQueries({ queryKey: ["deviceMedia"] });
    toast("Access stopped — your files stay right where they are.");
  };

  const play = (startIndex = 0) => {
    if (visible.length === 0) return;
    player.playTracks(toDeviceTracks(visible), startIndex);
  };

  const nothingConnected = metas.length === 0 && !folder?.name;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-gold-soft">
            On this device
          </p>
          <h1 className="mt-1 font-display text-3xl font-black italic tracking-tight sm:text-4xl">
            Device storage
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Allow access to your device's music folder once — SOUL reads the files
            straight from storage whenever they play. Nothing is uploaded, nothing is
            copied into the app.
          </p>
        </div>
        {metas.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button
              className="rounded-full bg-gold font-semibold text-[#160d1c] hover:bg-gold-soft"
              disabled={visible.length === 0}
              onClick={() => play(0)}
            >
              <Play className="mr-1.5 h-4 w-4" /> Play all
            </Button>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => {
                void qc.invalidateQueries({ queryKey: ["deviceFolder"] });
                void qc.invalidateQueries({ queryKey: ["deviceMedia"] });
              }}
            >
              <RefreshCw className="mr-1.5 h-4 w-4" /> Refresh
            </Button>
            <Button variant="outline" className="rounded-full" onClick={() => void stopAccess()}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Stop access
            </Button>
          </div>
        )}
      </div>

      {/* Access controls */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card/40 px-4 py-3">
        <Button
          className="rounded-full bg-gold font-semibold text-[#160d1c] hover:bg-gold-soft"
          onClick={() => void openFolder()}
        >
          <FolderOpen className="mr-1.5 h-4 w-4" /> Open music folder
        </Button>
        <Button variant="outline" className="rounded-full" onClick={() => filesInputRef.current?.click()}>
          <Music2 className="mr-1.5 h-4 w-4" /> Pick audio or video files
        </Button>
        {folder?.name ? (
          <span className="text-xs text-muted-foreground">
            {folder.permission === "granted"
              ? `Reading “${folder.name}” — access stays until you stop it.`
              : `“${folder.name}” is remembered — your browser just wants you to re-confirm access.`}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">
            Your browser shows a permission prompt — files never leave the device.
          </span>
        )}
        {folder?.name && folder.permission !== "granted" && (
          <Button variant="outline" className="rounded-full" onClick={() => void reconnect()}>
            Reconnect “{folder.name}”
          </Button>
        )}
        <input
          ref={folderInputRef}
          type="file"
          multiple
          hidden
          aria-label="Choose a music folder from this device"
          onChange={(e) => {
            onFilesPicked(e.target.files);
            e.target.value = "";
          }}
          {...({ webkitdirectory: "" } as Record<string, string>)}
        />
        <input
          ref={filesInputRef}
          type="file"
          accept="audio/*,video/*"
          multiple
          hidden
          aria-label="Pick audio or video files from this device"
          onChange={(e) => {
            onFilesPicked(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {scanQ.isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Reading your device's storage…
        </div>
      ) : nothingConnected ? (
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-border px-6 py-16 text-center">
          <Smartphone className="h-10 w-10 text-muted-foreground" />
          <p className="font-medium">No storage access yet</p>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            Tap “Open music folder” and allow access — your songs and videos play
            straight from your device's storage. Or pick individual files if your
            browser can't grant folder access.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your device's files"
              className="h-9 max-w-xs rounded-full bg-background"
              aria-label="Search device files"
            />
            <p className="text-xs text-muted-foreground">
              {metas.length} file{metas.length === 1 ? "" : "s"} · {formatBytes(totalBytes)} ·
              streaming straight from your device
            </p>
          </div>

          <div className="space-y-0.5">
            {visible.map((m, i) => (
              <DeviceRow
                key={m.path}
                meta={m}
                index={i}
                isCurrent={m.path === currentPath}
                duration={
                  m.path === currentPath && player.duration > 0
                    ? player.duration
                    : getDeviceDuration(m.path)
                }
                onPlay={() => play(i)}
              />
            ))}
            {visible.length === 0 && (
              <p className="px-2 py-8 text-center text-sm text-muted-foreground">
                Nothing on your device matches “{query}”.
              </p>
            )}
          </div>

          <p className="px-2 pt-2 text-xs text-muted-foreground">
            Files stream straight from your device — they never touch our servers, and
            stopping access leaves every file exactly where it was.
          </p>
        </div>
      )}
    </div>
  );
}

function DeviceRow({
  meta,
  index,
  isCurrent,
  duration,
  onPlay,
}: {
  meta: DeviceMediaMeta;
  index: number;
  isCurrent: boolean;
  duration: number;
  onPlay: () => void;
}) {
  return (
    <div
      className={cn(
        "group grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent/50 sm:grid-cols-[2.25rem_minmax(0,1fr)_6rem_4.5rem]",
        isCurrent && "bg-accent/40",
      )}
    >
      <div className="relative flex h-6 w-9 items-center justify-center">
        <span className="text-sm tabular-nums text-muted-foreground group-hover:invisible">
          {index + 1}
        </span>
        <button
          aria-label={`Play ${meta.title}`}
          onClick={onPlay}
          className="absolute inset-0 flex items-center justify-center text-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          <Play className="h-4 w-4 fill-current" />
        </button>
      </div>

      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary">
          {meta.kind === "video" ? (
            <Clapperboard className="h-4 w-4 text-gold-soft" />
          ) : (
            <Music2 className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {meta.kind === "video" && (
              <span className="mr-1.5 inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-gold-soft">
                <Clapperboard className="h-3 w-3" /> Video
              </span>
            )}
            <span className="truncate">{meta.title}</span>
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {meta.artist ? `${meta.artist} · ` : ""}
            {meta.path}
          </p>
        </div>
      </div>

      <span className="hidden text-xs tabular-nums text-muted-foreground sm:block sm:text-right">
        {formatBytes(meta.size)}
      </span>

      <span className="text-right text-xs tabular-nums text-muted-foreground">
        {duration > 0 ? formatDuration(duration) : "–:–"}
      </span>
    </div>
  );
}
