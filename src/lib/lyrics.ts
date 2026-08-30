export interface LyricLine {
  /** Timestamp in seconds from the start of the track. */
  t: number;
  text: string;
}

/** Splits pasted lyrics into trimmed, non-empty lines. */
export function splitLyricsText(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** Parses a stored lines_json value safely; invalid input yields []. */
export function parseLines(json: string): LyricLine[] {
  try {
    const raw = JSON.parse(json) as unknown;
    if (!Array.isArray(raw)) return [];
    const lines: LyricLine[] = [];
    for (const item of raw) {
      if (typeof item !== "object" || item === null) continue;
      const t = Number((item as { t?: unknown }).t);
      const text = String((item as { text?: unknown }).text ?? "").trim();
      if (Number.isFinite(t) && t >= 0 && text.length > 0) lines.push({ t, text });
    }
    return lines.sort((a, b) => a.t - b.t);
  } catch {
    return [];
  }
}

/** Serializes lyric lines for storage. */
export function serializeLines(lines: LyricLine[]): string {
  return JSON.stringify(lines);
}

/**
 * The karaoke line on screen at a given time: the latest line whose stamp has
 * been reached. -1 before the first stamp.
 */
export function activeLineIndex(lines: LyricLine[], timeSec: number): number {
  let active = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].t <= timeSec) active = i;
    else break;
  }
  return active;
}

/** Formats a stamp as m:ss.d for the editor. */
export function formatStamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const d = Math.floor((seconds % 1) * 10);
  return `${m}:${String(s).padStart(2, "0")}.${d}`;
}
