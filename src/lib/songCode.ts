/**
 * Every song in the library carries a short reference code — SM-0007 — taken
 * from its row id, so it is stable forever (a deleted song's code is never
 * reused) and needs no extra storage. Songs that live only on a listener's
 * own device have no server row, so they carry no code.
 */
export function songCode(rowId: number): string {
  if (!Number.isFinite(rowId) || rowId <= 0) return "";
  return `SM-${String(rowId).padStart(4, "0")}`;
}
