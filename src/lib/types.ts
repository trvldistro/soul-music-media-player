import type { LyricLine } from "./lyrics";
import { parseLinks, type ArtistLink } from "./artistProfile";
import { mapModerationStatus, type ModerationStatus } from "./admin";

export type MediaKind = "audio" | "video";

export interface Track {
  rowId: number;
  title: string;
  artist: string;
  album: string;
  genre: string;
  /** Duration in seconds (0 when unknown). */
  duration: number;
  audioUrl: string;
  coverUrl: string;
  isDemo: boolean;
  /** "video" for music videos uploaded by fans, "audio" for songs. */
  mediaKind: MediaKind;
  /** Content path of the music video (empty for audio-only tracks). */
  videoUrl: string;
  /** Who attached the music video to this song, when one is attached. */
  videoBy?: string | null;
  /** Artist name typed into the fan upload form. */
  uploaderName: string;
  createdBy: string | null;
  /** "locked" once the uploader has spent their one allowed edit. */
  editState: "editable" | "locked";
  /** Unix milliseconds when the one-time edit was used (null while unused). */
  editedAt: number | null;
  /** Admin moderation state; fan uploads start "unverified", takedowns are "removed". */
  moderationStatus: ModerationStatus;
  /** Why the track was taken down, when it was (null otherwise). */
  moderationNote: string | null;
  /** Unix ms when it was taken down — the 7-day delete clock starts here. */
  removedAt: number | null;
  /** Platform-wide play counter, incremented server-side each time it plays. */
  playCount?: number;
  /** Unix milliseconds when the track was added to the library. */
  createdAt: number;
  /**
   * Path inside the visitor's own device storage (device tracks only). The
   * playable URL is resolved on demand — no copy ever exists.
   */
  devicePath?: string;
}

interface TrackDBRow {
  _row_id: number;
  title: string;
  artist: string;
  album: string;
  genre: string;
  duration_seconds: number;
  audio_url: string;
  cover_url: string;
  is_demo: number;
  media_kind?: string | null;
  video_url?: string | null;
  video_attached_by?: string | null;
  uploader_name?: string | null;
  edit_state?: string | null;
  edited_at?: number | null;
  moderation_status?: string | null;
  moderation_note?: string | null;
  moderation_removed_at?: number | null;
  play_count?: number | null;
  _created_by?: string | null;
  _created_at?: number | null;
}

export function mapTrack(row: TrackDBRow): Track {
  return {
    rowId: row._row_id,
    title: row.title,
    artist: row.artist,
    album: row.album ?? "",
    genre: row.genre ?? "Soul",
    duration: Number(row.duration_seconds) || 0,
    audioUrl: row.audio_url,
    coverUrl: row.cover_url ?? "",
    isDemo: row.is_demo === 1,
    mediaKind: row.media_kind === "video" ? "video" : "audio",
    videoUrl: row.video_url ?? "",
    videoBy: row.video_attached_by ?? null,
    uploaderName: row.uploader_name ?? "",
    createdBy: row._created_by ?? null,
    editState: row.edit_state === "locked" ? "locked" : "editable",
    editedAt: row.edited_at ?? null,
    moderationStatus: mapModerationStatus(row.moderation_status),
    moderationNote: row.moderation_note ?? null,
    removedAt: row.moderation_removed_at ?? null,
    playCount: Number(row.play_count) || 0,
    createdAt: Number(row._created_at) || 0,
  };
}

export interface Playlist {
  rowId: number;
  name: string;
  description: string;
}

export interface PlaylistEntry {
  rowId: number;
  playlistId: number;
  trackId: number;
  position: number;
}

export type ArtistStatus = "unclaimed" | "pending" | "claimed";

/** Claim/verification state for an artist name. A missing row means "unclaimed". */
export interface ArtistProfile {
  rowId: number;
  name: string;
  status: ArtistStatus;
  claimantUuid: string | null;
  claimEvidence: string;
  claimLink: string;
  claimedAt: number | null;
}

interface ArtistDBRow {
  _row_id: number;
  name: string;
  status: string;
  claimant_uuid?: string | null;
  claim_evidence?: string | null;
  claim_link?: string | null;
  claimed_at?: number | null;
}

export function mapArtist(row: ArtistDBRow): ArtistProfile {
  return {
    rowId: row._row_id,
    name: row.name,
    status: row.status === "claimed" ? "claimed" : row.status === "pending" ? "pending" : "unclaimed",
    claimantUuid: row.claimant_uuid ?? null,
    claimEvidence: row.claim_evidence ?? "",
    claimLink: row.claim_link ?? "",
    claimedAt: row.claimed_at ?? null,
  };
}

/** The extra profile content a verified artist adds: bio, photo, links. */
export interface ArtistProfileExtra {
  rowId: number;
  name: string;
  bio: string;
  imageUrl: string;
  links: ArtistLink[];
  createdBy: string | null;
}

interface ArtistExtraDBRow {
  _row_id: number;
  name: string;
  bio?: string | null;
  image_url?: string | null;
  links_json?: string | null;
  _created_by?: string | null;
}

export function mapArtistExtra(row: ArtistExtraDBRow): ArtistProfileExtra {
  return {
    rowId: row._row_id,
    name: row.name,
    bio: row.bio ?? "",
    imageUrl: row.image_url ?? "",
    links: parseLinks(row.links_json),
    createdBy: row._created_by ?? null,
  };
}

export interface TrackLyrics {
  rowId: number;
  trackId: number;
  plainText: string;
  /** Timestamped lines, sorted by time (empty while unsynced). */
  lines: LyricLine[];
  syncState: "unsynced" | "synced";
  createdBy: string | null;
}

interface LyricsDBRow {
  _row_id: number;
  track_id: number;
  plain_text: string;
  lines_json: string;
  sync_state: string;
  _created_by?: string | null;
}

export function mapLyrics(row: LyricsDBRow, parse: (json: string) => LyricLine[]): TrackLyrics {
  return {
    rowId: row._row_id,
    trackId: row.track_id,
    plainText: row.plain_text ?? "",
    lines: parse(row.lines_json ?? "[]"),
    syncState: row.sync_state === "synced" ? "synced" : "unsynced",
    createdBy: row._created_by ?? null,
  };
}

export interface SoulPointsEntry {
  points: number;
  reason: string;
  createdAt: number;
}
