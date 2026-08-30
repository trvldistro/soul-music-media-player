export type UploadKind = "song" | "video";

const WAV_EXTENSIONS = [".wav", ".wave"];
const VIDEO_EXTENSIONS = [".mp4", ".m4v", ".webm", ".mov"];
const WAV_MIME_TYPES = new Set(["audio/wav", "audio/x-wav", "audio/wave", "audio/vnd.wave"]);
const VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
  "video/ogg",
]);

export function isWavFile(file: Pick<File, "name" | "type">): boolean {
  const lower = file.name.toLowerCase();
  if (WAV_EXTENSIONS.some((ext) => lower.endsWith(ext))) return true;
  return WAV_MIME_TYPES.has(file.type);
}

export function isVideoFile(file: Pick<File, "name" | "type">): boolean {
  const lower = file.name.toLowerCase();
  if (VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext))) return true;
  return VIDEO_MIME_TYPES.has(file.type);
}

export interface UploadFormValues {
  kind: UploadKind;
  artist: string;
  title: string;
  audioFile: File | null;
  videoFile: File | null;
}

/**
 * Validates the fan upload form. Returns a human-readable rejection reason the
 * UI can show as-is, or null when the form is ready to submit.
 */
export function validateUpload(values: UploadFormValues): string | null {
  if (!values.artist.trim()) return "Artist name is required";
  if (!values.title.trim()) return "Song title is required";
  if (values.kind === "song") {
    if (!values.audioFile) return "Choose the song as a WAV file";
    if (!isWavFile(values.audioFile)) {
      return "Songs must be WAV files — convert your track and try again";
    }
  } else {
    if (!values.videoFile) return "Choose a music video (MP4, WebM or MOV)";
    if (!isVideoFile(values.videoFile)) return "Music videos must be MP4, WebM or MOV files";
    if (values.audioFile && !isWavFile(values.audioFile)) {
      return "The song file must be WAV — convert your track and try again";
    }
  }
  return null;
}

/**
 * Reads a media file's duration in the browser (0 when it can't be read).
 * Uses a <video> element for video files so their metadata is understood.
 */
export function probeMediaDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(0);
      return;
    }
    const url = URL.createObjectURL(file);
    const el = document.createElement(isVideoFile(file) ? "video" : "audio");
    el.preload = "metadata";
    const finish = (seconds: number) => {
      URL.revokeObjectURL(url);
      resolve(seconds);
    };
    el.addEventListener("loadedmetadata", () => {
      finish(Number.isFinite(el.duration) ? el.duration : 0);
    });
    el.addEventListener("error", () => finish(0));
    el.src = url;
  });
}
