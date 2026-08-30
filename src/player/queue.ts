export type RepeatMode = "off" | "all" | "one";

/**
 * The play order as a list of queue indices. Unshuffled it is the identity;
 * shuffled it starts at `startIndex` (the track the user clicked) followed by
 * every other index exactly once, in random order.
 */
export function buildOrder(length: number, startIndex: number, shuffle: boolean): number[] {
  if (length <= 0) return [];
  const start = Math.max(0, Math.min(startIndex, length - 1));
  if (!shuffle) {
    return Array.from({ length }, (_, i) => i);
  }
  const rest = Array.from({ length }, (_, i) => i).filter((i) => i !== start);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = rest[i] as number;
    rest[i] = rest[j] as number;
    rest[j] = tmp;
  }
  return [start, ...rest];
}

/** Position after `pos`, or null when the order ends and repeat does not wrap. */
export function nextPos(orderLength: number, pos: number, repeat: RepeatMode): number | null {
  if (orderLength <= 0) return null;
  if (pos + 1 < orderLength) return pos + 1;
  return repeat === "all" ? 0 : null;
}

/** Position before `pos`; wraps only under repeat-all, otherwise clamps at 0. */
export function prevPos(orderLength: number, pos: number, repeat: RepeatMode): number {
  if (orderLength <= 0) return 0;
  if (pos > 0) return pos - 1;
  return repeat === "all" ? orderLength - 1 : 0;
}
