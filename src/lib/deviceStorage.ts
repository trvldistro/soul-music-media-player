import type { MediaKind, Track } from "./types";

/**
 * Device storage access.
 *
 * Instead of importing copies into the app, the visitor grants read access to
 * a folder of their own music (the browser's storage-permission prompt). Files
 * are listed straight from that folder and streamed from it while playing.
 * Nothing is uploaded, nothing is copied — a playable object URL is created
 * for the one file that is currently playing and released again afterwards.
 *
 * Two access paths:
 *  - Directory access (File System Access API, Chromium desktop): the folder
 *    handle is remembered in IndexedDB and re-confirmed on later visits.
 *  - Picked files (everywhere, incl. phones): audio/video chosen in a file
 *    picker. Still no copies — the picked File objects are read directly.
 */

export const DEVICE_ROW_BASE = -1_000_000_000;
/** Hard stop so a giant folder cannot freeze the tab. */
const MAX_FILES = 5000;
const DB_NAME = "soul-device-storage";
const STORE = "handles";
const KEY = "music";
/** Cheap localStorage hint that a folder handle exists, so untouched
 * browsers never open IndexedDB at all. */
const FOLDER_HINT_KEY = "soul:device-folder";

export interface DeviceMediaMeta {
  /** Path inside the granted folder / picker, e.g. "Soul/Aretha/01.mp3". */
  path: string;
  name: string;
  title: string;
  artist: string;
  /** Parent folder name — "" for loose files at the root. */
  album: string;
  kind: MediaKind;
  size: number;
  lastModified: number;
}

// ---------------------------------------------------------------- pure helpers

const AUDIO_EXT = /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|weba)$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|mkv)$/i;

/** What a device file is, or null when the app cannot play it. */
export function deviceKindFor(file: { type?: string; name: string }): MediaKind | null {
  const type = (file.type || "").toLowerCase();
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  if (VIDEO_EXT.test(file.name)) return "video";
  if (AUDIO_EXT.test(file.name)) return "audio";
  return null;
}

/**
 * "Adele - Hello.mp3" → artist "Adele", title "Hello".
 * "02 - Marvin Gaye - Got To Give It Up.flac" → track number stripped.
 */
export function parseMediaFileName(name: string): { artist: string; title: string } {
  const base = name
    .replace(/\.[^.]+$/, "")
    .replace(/_+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const parts = base
    .split(" - ")
    .map((p) => p.trim())
    .filter(Boolean);
  while (parts.length > 1 && /^\d{1,3}$/.test(parts[0] ?? "")) parts.shift();
  if (parts.length >= 2) {
    return { artist: parts[0], title: parts.slice(1).join(" - ") };
  }
  const solo = parts[0] ?? base;
  const stripped = solo.replace(/^\d{1,3}[\s.\u2013-]+\s*/, "").trim();
  return { artist: "", title: stripped || base };
}

/** "Soul/Aretha/01.mp3" → "Aretha"; "01.mp3" → "". */
export function parentFolderOf(path: string): string {
  const idx = path.lastIndexOf("/");
  if (idx <= 0) return "";
  return path.slice(0, idx).split("/").filter(Boolean).pop() ?? "";
}

/** Numeric-aware ordering, so "2.mp3" lands before "10.mp3". */
export function comparePaths(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return unit === 0 ? `${Math.round(value)} B` : `${value.toFixed(1)} ${units[unit]}`;
}

/** One list with no duplicates — a picked file beats the same folder file. */
export function mergeDeviceFiles(
  picked: DeviceMediaMeta[],
  fromFolder: DeviceMediaMeta[],
): DeviceMediaMeta[] {
  const byPath = new Map<string, DeviceMediaMeta>();
  for (const meta of fromFolder) byPath.set(meta.path, meta);
  for (const meta of picked) byPath.set(meta.path, meta);
  return [...byPath.values()].sort((a, b) => comparePaths(a.path, b.path));
}

/** Device rows get ids at or below this base, never colliding with database rows. */
const rowIdByPath = new Map<string, number>();

export function deviceRowIdFor(path: string): number {
  let id = rowIdByPath.get(path);
  if (id === undefined) {
    id = DEVICE_ROW_BASE - rowIdByPath.size;
    rowIdByPath.set(path, id);
  }
  return id;
}

export function isDeviceRowId(rowId: number): boolean {
  return rowId <= DEVICE_ROW_BASE;
}

// ------------------------------------------------------------- handle plumbing

interface DeviceFileHandleLike {
  kind: "file";
  name: string;
  getFile(): Promise<File>;
}

interface DeviceDirHandleLike {
  kind: "directory";
  name: string;
  values(): AsyncIterableIterator<DeviceFileHandleLike | DeviceDirHandleLike>;
  queryPermission?(opts: { mode: "read" | "readwrite" }): Promise<PermissionState>;
  requestPermission?(opts: { mode: "read" | "readwrite" }): Promise<PermissionState>;
  getDirectoryHandle(name: string): Promise<DeviceDirHandleLike>;
  getFileHandle(name: string): Promise<DeviceFileHandleLike>;
}

type PickerWindow = Window & {
  showDirectoryPicker?: (options?: {
    id?: string;
    mode?: "read" | "readwrite";
    startIn?: string;
  }) => Promise<DeviceDirHandleLike>;
};

let cachedFolder: DeviceDirHandleLike | null = null;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable"));
      return;
    }
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB is unavailable"));
    } catch (e) {
      reject(e instanceof Error ? e : new Error("IndexedDB is unavailable"));
    }
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("device storage operation failed"));
        t.oncomplete = () => db.close();
      }),
  );
}

async function loadFolderHandle(): Promise<DeviceDirHandleLike | null> {
  if (cachedFolder) return cachedFolder;
  // No hint ⇒ no folder was ever granted here: skip storage entirely.
  try {
    if (typeof localStorage === "undefined" || !localStorage.getItem(FOLDER_HINT_KEY)) {
      return null;
    }
  } catch {
    /* fall through to the handle store */
  }
  try {
    const stored = await withStore("readonly", (s) => s.get(KEY) as IDBRequest<unknown>);
    if (stored && typeof stored === "object" && (stored as { kind?: string }).kind === "directory") {
      return stored as DeviceDirHandleLike;
    }
  } catch {
    /* nothing remembered (or private mode) — simply ask again */
  }
  return null;
}

async function saveFolderHandle(handle: DeviceDirHandleLike): Promise<void> {
  try {
    await withStore("readwrite", (s) => s.put(handle, KEY) as IDBRequest<IDBValidKey>);
    try {
      localStorage.setItem(FOLDER_HINT_KEY, handle.name);
    } catch {
      /* hint is an optimisation only */
    }
  } catch {
    /* remembering is best-effort; this visit still works */
  }
}

async function deleteFolderHandle(): Promise<void> {
  try {
    localStorage.removeItem(FOLDER_HINT_KEY);
  } catch {
    /* ignore */
  }
  try {
    await withStore("readwrite", (s) => s.delete(KEY) as unknown as IDBRequest<undefined>);
  } catch {
    /* ignore */
  }
}

async function permissionOf(
  handle: DeviceDirHandleLike,
  request: boolean,
): Promise<"granted" | "prompt" | "denied"> {
  try {
    if (handle.queryPermission) {
      const state = await handle.queryPermission({ mode: "read" });
      if (state === "granted") return "granted";
      if (!request || !handle.requestPermission) return state === "denied" ? "denied" : "prompt";
      const answer = await handle.requestPermission({ mode: "read" });
      return answer;
    }
  } catch {
    /* fall through */
  }
  return "prompt";
}

// -------------------------------------------------------------- public surface

export function supportsDirectoryPicker(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof (window as PickerWindow).showDirectoryPicker === "function"
  );
}

export interface FolderStatus {
  supported: boolean;
  /** Folder name when one is remembered, "" otherwise. */
  name: string;
  permission: "granted" | "prompt" | "denied" | null;
}

/** Whether a folder is remembered and what its access state is. */
export async function getFolderStatus(): Promise<FolderStatus> {
  if (!supportsDirectoryPicker()) return { supported: false, name: "", permission: null };
  const handle = cachedFolder ?? (await loadFolderHandle());
  cachedFolder = handle;
  if (!handle) return { supported: true, name: "", permission: null };
  const permission = await permissionOf(handle, false);
  return { supported: true, name: handle.name, permission };
}

/**
 * Shows the browser's storage-permission prompt for a music folder and
 * remembers the grant. Returns the folder name, or null when the visitor
 * cancelled / the browser cannot ask.
 */
export async function pickMusicFolder(): Promise<string | null> {
  const w = typeof window !== "undefined" ? (window as PickerWindow) : undefined;
  if (!w?.showDirectoryPicker) return null;
  let handle: DeviceDirHandleLike;
  try {
    handle = await w.showDirectoryPicker({ id: "soul-music", mode: "read", startIn: "music" });
  } catch {
    return null;
  }
  cachedFolder = handle;
  await saveFolderHandle(handle);
  return handle.name;
}

/** Re-confirms access to the remembered folder (must run from a user gesture). */
export async function ensureFolderAccess(): Promise<boolean> {
  const handle = cachedFolder ?? (await loadFolderHandle());
  if (!handle) return false;
  cachedFolder = handle;
  return (await permissionOf(handle, true)) === "granted";
}

/** Forgets the folder grant. The visitor's files are never touched by this. */
export async function disconnectFolder(): Promise<void> {
  cachedFolder = null;
  await deleteFolderHandle();
}

function metaFromFile(file: File, path: string): DeviceMediaMeta | null {
  const kind = deviceKindFor(file);
  if (!kind) return null;
  const { artist, title } = parseMediaFileName(file.name);
  return {
    path,
    name: file.name,
    title: title || file.name,
    artist,
    album: parentFolderOf(path),
    kind,
    size: file.size,
    lastModified: file.lastModified,
  };
}

/** Walks the granted folder (skip hidden entries) and lists playable files. */
export async function scanFolder(
  onProgress?: (count: number) => void,
): Promise<DeviceMediaMeta[]> {
  const handle = cachedFolder ?? (await loadFolderHandle());
  cachedFolder = handle;
  if (!handle) return [];
  if ((await permissionOf(handle, false)) !== "granted") return [];

  const found: DeviceMediaMeta[] = [];
  const stack: Array<{ dir: DeviceDirHandleLike; prefix: string }> = [
    { dir: handle, prefix: "" },
  ];
  while (stack.length > 0 && found.length < MAX_FILES) {
    const { dir, prefix } = stack.pop() as { dir: DeviceDirHandleLike; prefix: string };
    try {
      for await (const entry of dir.values()) {
        if (found.length >= MAX_FILES) break;
        if (entry.name.startsWith(".")) continue;
        if (entry.kind === "directory") {
          stack.push({
            dir: entry,
            prefix: prefix ? `${prefix}/${entry.name}` : entry.name,
          });
        } else {
          const file = await entry.getFile();
          const meta = metaFromFile(file, prefix ? `${prefix}/${file.name}` : file.name);
          if (meta) {
            found.push(meta);
            onProgress?.(found.length);
          }
        }
      }
    } catch {
      /* an unreadable subfolder is skipped, the rest still lists */
    }
  }
  return found.sort((a, b) => comparePaths(a.path, b.path));
}

// ------------------------------------------------------- picked files (fallback)

const sessionFiles = new Map<string, File>();

export interface RegisterResult {
  added: number;
  /** Unplayable files and files already listed. */
  skipped: number;
}

/**
 * Registers files chosen in a picker. They are NOT copied anywhere — the
 * browser keeps reading them from device storage while they play.
 */
export function registerSessionFiles(files: FileList | File[] | null): RegisterResult {
  const result: RegisterResult = { added: 0, skipped: 0 };
  if (!files) return result;
  for (const file of Array.from(files as ArrayLike<File>)) {
    if (deviceKindFor(file) === null) {
      result.skipped += 1;
      continue;
    }
    const rel =
      (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
    const path = rel
      .replace(/\\/g, "/")
      .split("/")
      .filter(Boolean)
      .join("/");
    if (!path || sessionFiles.has(path)) {
      result.skipped += 1;
      continue;
    }
    sessionFiles.set(path, file);
    result.added += 1;
  }
  return result;
}

export function listSessionFiles(): DeviceMediaMeta[] {
  const metas: DeviceMediaMeta[] = [];
  for (const [path, file] of sessionFiles) {
    const meta = metaFromFile(file, path);
    if (meta) metas.push(meta);
  }
  return metas.sort((a, b) => comparePaths(a.path, b.path));
}

export function clearSessionFiles(): void {
  for (const path of sessionFiles.keys()) closeDeviceMedia(path);
  sessionFiles.clear();
}

/** Everything playable right now: picked files plus the granted folder. */
export async function listDeviceMedia(
  onProgress?: (count: number) => void,
): Promise<DeviceMediaMeta[]> {
  const fromFolder = await scanFolder(onProgress);
  return mergeDeviceFiles(listSessionFiles(), fromFolder);
}

// ------------------------------------------------------------------ streaming

const openUrls = new Map<string, string>();

/**
 * A playable URL for one device file, read straight from storage. The URL is
 * cached while the file plays and must be released with closeDeviceMedia.
 */
export async function openDeviceMedia(path: string): Promise<string> {
  const cached = openUrls.get(path);
  if (cached) return cached;

  let file: File | null = sessionFiles.get(path) ?? null;
  if (!file) {
    const handle = cachedFolder ?? (await loadFolderHandle());
    cachedFolder = handle;
    if (handle) {
      const parts = path.split("/").filter(Boolean);
      try {
        let dir = handle;
        for (const part of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(part);
        const fileHandle = await dir.getFileHandle(parts[parts.length - 1] as string);
        file = await fileHandle.getFile();
      } catch {
        file = null;
      }
    }
  }
  if (!file) throw new Error(`Could not read ${path} from device storage`);
  const url = URL.createObjectURL(file);
  openUrls.set(path, url);
  return url;
}

/** Releases a device file's URL once nothing plays it anymore. */
export function closeDeviceMedia(path: string | null | undefined): void {
  if (!path) return;
  const url = openUrls.get(path);
  if (url) {
    URL.revokeObjectURL(url);
    openUrls.delete(path);
  }
}

// Durations the player discovered while a device file was playing.
const durations = new Map<string, number>();

export function rememberDeviceDuration(path: string, seconds: number): void {
  if (Number.isFinite(seconds) && seconds > 0) durations.set(path, seconds);
}

export function getDeviceDuration(path: string): number {
  return durations.get(path) ?? 0;
}

// ------------------------------------------------------------- player tracks

export function toDeviceTracks(metas: DeviceMediaMeta[]): Track[] {
  return metas.map((m) => ({
    rowId: deviceRowIdFor(m.path),
    title: m.title,
    artist: m.artist || m.album || "On this device",
    album: m.album || "Device storage",
    genre: "From your device",
    duration: getDeviceDuration(m.path),
    audioUrl: "",
    coverUrl: "",
    isDemo: false,
    mediaKind: m.kind,
    videoUrl: "",
    uploaderName: "",
    createdBy: null,
    editState: "locked",
    editedAt: null,
    moderationStatus: "verified",
    moderationNote: null,
    removedAt: null,
    playCount: 0,
    createdAt: m.lastModified,
    devicePath: m.path,
  }));
}
