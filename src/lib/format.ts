/** Format seconds as m:ss (or h:mm:ss for very long files). */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Human total for a list of tracks, e.g. "6 tracks · 86 sec of soul". */
export function formatTrackTotal(count: number, seconds: number): string {
  const min = Math.floor(seconds / 60);
  const trackWord = count === 1 ? "track" : "tracks";
  if (min < 1) return `${count} ${trackWord}`;
  const minWord = min === 1 ? "minute" : "minutes";
  return `${count} ${trackWord} · ${min} ${minWord}`;
}

/** Two-letter fallback monogram for the vinyl label when no cover exists. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "SM";
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + second).toUpperCase();
}

/** Compact play counter: 7 → "7", 1234 → "1.2k", 2500000 → "2.5M". */
export function formatPlayCount(count: number): string {
  const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}