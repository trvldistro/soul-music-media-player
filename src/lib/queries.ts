import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import db from "@/lib/shared/kliv-database.js";
import {
  attach_track_video,
  edit_track_once,
  reclaim_artist,
  submit_artist_claim,
} from "@/lib/commands";

import { parseLines, serializeLines, type LyricLine } from "./lyrics";
import { trackIsVisible, isPastPurgeDeadline } from "./admin";
import { awardSoulPoints } from "./soulPoints";
import { findArtistMatch } from "./artistMatch";
import { attachRejectionMessage } from "./mediaMatch";
import { ensureArtistProfile } from "./plays";
import { mapArtist, mapLyrics, mapTrack } from "./types";
import type {
  ArtistProfile,
  MediaKind,
  Playlist,
  PlaylistEntry,
  SoulPointsEntry,
  Track,
  TrackLyrics,
} from "./types";

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
  _created_by?: string | null;
  _created_at?: number | null;
}

export function useTracks() {
  return useQuery<Track[]>({
    queryKey: ["tracks"],
    queryFn: async () => {
      const rows = (await db.query("tracks", { order: "_created_at.asc" })) as unknown as TrackDBRow[];
      // Taken-down songs are hidden from every library surface.
      return rows.map(mapTrack).filter((t) => trackIsVisible(t.moderationStatus));
    },
  });
}

/** Every track including taken-down ones — the admin moderation view only. */
export function useModerationTracks() {
  return useQuery<Track[]>({
    queryKey: ["tracks", "moderation"],
    queryFn: async () => {
      const rows = (await db.query("tracks", { order: "_created_at.desc" })) as unknown as TrackDBRow[];
      // Past its 7-day grace, a take-down is deleted for good by the nightly
      // cleanup — don't list it here while that run is pending.
      return rows.map(mapTrack).filter((t) => !isPastPurgeDeadline(t.removedAt));
    },
    refetchInterval: 8000,
  });
}

/** All lyrics rows, for the admin content view. */
export interface AdminLyricsRow {
  rowId: number;
  trackId: number;
  plainText: string;
  syncState: "unsynced" | "synced";
  createdBy: string | null;
}

export function useAllLyrics() {
  return useQuery<AdminLyricsRow[]>({
    queryKey: ["lyrics", "all"],
    queryFn: async () => {
      const rows = (await db.query("track_lyrics", { order: "_created_at.desc" })) as unknown as {
        _row_id: number;
        track_id: number;
        plain_text: string;
        sync_state: string;
        _created_by?: string | null;
      }[];
      return rows.map((r) => ({
        rowId: r._row_id,
        trackId: r.track_id,
        plainText: r.plain_text ?? "",
        syncState: r.sync_state === "synced" ? "synced" : "unsynced",
        createdBy: r._created_by ?? null,
      }));
    },
  });
}

export function useFavorites(signedIn: boolean) {
  const query = useQuery<Set<number>>({
    queryKey: ["favorites"],
    queryFn: async () => {
      const rows = (await db.query("track_favorites", {})) as unknown as { track_id: number }[];
      return new Set(rows.map((r) => r.track_id));
    },
    enabled: signedIn,
  });
  return { ...query, favorites: query.data ?? new Set<number>() };
}

export function usePlaylists(signedIn: boolean) {
  return useQuery<Playlist[]>({
    queryKey: ["playlists"],
    queryFn: async () => {
      const rows = (await db.query("playlists", { order: "_created_at.desc" })) as unknown as {
        _row_id: number;
        name: string;
        description: string;
      }[];
      return rows.map((r) => ({ rowId: r._row_id, name: r.name, description: r.description ?? "" }));
    },
    enabled: signedIn,
  });
}

export function usePlaylistTracks(playlistId: number | null) {
  return useQuery<PlaylistEntry[]>({
    queryKey: ["playlistTracks", playlistId],
    queryFn: async () => {
      if (playlistId == null) return [];
      const rows = (await db.query("playlist_tracks", {
        playlist_id: `eq.${playlistId}`,
        order: "position.asc",
      })) as unknown as { _row_id: number; playlist_id: number; track_id: number; position: number }[];
      return rows.map((r) => ({
        rowId: r._row_id,
        playlistId: r.playlist_id,
        trackId: r.track_id,
        position: r.position,
      }));
    },
    enabled: playlistId != null,
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ trackId, favorite }: { trackId: number; favorite: boolean }) => {
      if (favorite) {
        await db.delete("track_favorites", { track_id: `eq.${trackId}` });
      } else {
        await db.insertOne("track_favorites", { track_id: trackId });
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}

export function useCreatePlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const row = (await db.insertOne("playlists", {
        name,
        description: description ?? "",
      })) as unknown as { _row_id: number };
      return { rowId: row._row_id, name, description: description ?? "" } satisfies Playlist;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["playlists"] });
    },
  });
}

export function useAddTrackToPlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ playlistId, trackId }: { playlistId: number; trackId: number }) => {
      const counted = (await db.query("playlist_tracks", {
        playlist_id: `eq.${playlistId}`,
        select: "count",
      })) as unknown as { count: number }[];
      const position = Number(counted[0]?.count ?? 0);
      const row = (await db.insertOne("playlist_tracks", {
        playlist_id: playlistId,
        track_id: trackId,
        position,
      })) as unknown as { _row_id: number };
      return row._row_id;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["playlistTracks"] });
    },
  });
}

export function useRemovePlaylistTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entryRowId: number) => {
      await db.delete("playlist_tracks", { _row_id: `eq.${entryRowId}` });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["playlistTracks"] });
    },
  });
}

export function useDeletePlaylist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (playlistId: number) => {
      await db.delete("playlist_tracks", { playlist_id: `eq.${playlistId}` });
      await db.delete("playlists", { _row_id: `eq.${playlistId}` });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["playlists"] });
      void qc.invalidateQueries({ queryKey: ["playlistTracks"] });
    },
  });
}

export interface NewTrackInput {
  title: string;
  artist: string;
  album: string;
  genre: string;
  duration: number;
  audioUrl: string;
  coverUrl: string;
  mediaKind?: MediaKind;
  videoUrl?: string;
  uploaderName?: string;
}

export function useInsertTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewTrackInput) => {
      // One artist, one page: resolve the typed name to the canonical spelling
      // of an existing profile (same name ignoring case, accents, punctuation
      // and spacing) so a different-typed spelling still lands on that page.
      let artistName = input.artist.trim();
      let matchedExisting = false;
      try {
        const rows = (await db.query("artists", {})) as unknown as { name: string }[];
        const match = findArtistMatch(artistName, rows.map((r) => ({ name: r.name })));
        if (match) {
          artistName = match.name;
          matchedExisting = true;
        }
      } catch {
        /* keep the typed spelling if profiles cannot be read */
      }
      const row = (await db.insertOne("tracks", {
        title: input.title,
        artist: artistName,
        album: input.album,
        genre: input.genre,
        duration_seconds: input.duration,
        audio_url: input.audioUrl,
        cover_url: input.coverUrl,
        is_demo: 0,
        media_kind: input.mediaKind ?? "audio",
        video_url: input.videoUrl ?? null,
        uploader_name: input.uploaderName ?? artistName,
      })) as unknown as TrackDBRow;
      const mapped = mapTrack(row);
      // A genuinely new name gets its unclaimed profile server-side.
      if (!matchedExisting) {
        await ensureArtistProfile(artistName);
        void qc.invalidateQueries({ queryKey: ["artists"] });
      }
      // Claim the upload's Soul Points (verified server-side, once per track).
      const { awarded } = await awardSoulPoints("track", mapped.rowId);
      if (awarded > 0) toast.success(`+${awarded} Soul Points earned`);
      void qc.invalidateQueries({ queryKey: ["soulPoints"] });
      return mapped;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tracks"] });
    },
  });
}

export function useDeleteTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (trackId: number) => {
      await db.delete("tracks", { _row_id: `eq.${trackId}` });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tracks"] });
    },
  });
}

export interface EditTrackInput {
  trackId: number;
  title: string;
  artist: string;
  album: string;
  genre: string;
}

// ── Artist profiles & claims ────────────────────────────────────────────────

interface ArtistRow {
  _row_id: number;
  name: string;
  status: string;
  claimant_uuid?: string | null;
  claim_evidence?: string | null;
  claim_link?: string | null;
  claimed_at?: number | null;
}

/**
 * Claim/verification state per artist name. The review queue and a pending
 * claimant's artist page both poll, so a verdict reached in another session
 * shows up without a reload.
 */
export function useArtists(options?: { refetchIntervalMs?: number }) {
  return useQuery<ArtistProfile[]>({
    queryKey: ["artists"],
    queryFn: async () => {
      const rows = (await db.query("artists", { order: "_created_at.asc" })) as unknown as ArtistRow[];
      return rows.map(mapArtist);
    },
    refetchInterval: options?.refetchIntervalMs ?? false,
  });
}

/** Files (or re-opens) a claim application for an artist profile. */
export function useSubmitArtistClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      evidence,
      link,
      reclaim,
    }: {
      name: string;
      evidence: string;
      link: string;
      reclaim?: boolean;
    }) =>
      reclaim
        ? reclaim_artist({ name, claim_evidence: evidence, claim_link: link })
        : submit_artist_claim({ name, claim_evidence: evidence, claim_link: link }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["artists"] });
    },
  });
}

// ── Lyrics ──────────────────────────────────────────────────────────────────

interface LyricsRow {
  _row_id: number;
  track_id: number;
  plain_text: string;
  lines_json: string;
  sync_state: string;
  _created_by?: string | null;
}

export function useLyrics(trackId: number | null) {
  return useQuery<TrackLyrics | null>({
    queryKey: ["lyrics", trackId],
    queryFn: async () => {
      if (trackId == null) return null;
      const rows = (await db.query("track_lyrics", {
        track_id: `eq.${trackId}`,
      })) as unknown as LyricsRow[];
      if (rows.length === 0) return null;
      return mapLyrics(rows[0], parseLines);
    },
    enabled: trackId != null,
  });
}

/** First lyrics for a track: inserts the row and claims the +points award. */
export function useCreateLyrics() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ trackId, text }: { trackId: number; text: string }) => {
      const row = (await db.insertOne("track_lyrics", {
        track_id: trackId,
        plain_text: text,
        lines_json: "[]",
        sync_state: "unsynced",
        source: "community",
      })) as unknown as { _row_id: number };
      const { awarded } = await awardSoulPoints("lyrics", row._row_id);
      return { rowId: row._row_id, awarded };
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ["lyrics", variables.trackId] });
      void qc.invalidateQueries({ queryKey: ["soulPoints"] });
    },
  });
}

/** Saves edited text and the stamped line timestamps. */
export function useSaveLyrics() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      rowId,
      plainText,
      lines,
      awardSync,
    }: {
      rowId: number;
      plainText: string;
      lines: LyricLine[];
      awardSync: boolean;
    }) => {
      await db.update(
        "track_lyrics",
        { _row_id: `eq.${rowId}` },
        { plain_text: plainText, lines_json: serializeLines(lines) },
      );
      const { awarded } = awardSync ? await awardSoulPoints("lyrics_sync", rowId) : { awarded: 0 };
      return { awarded };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["lyrics"] });
      void qc.invalidateQueries({ queryKey: ["soulPoints"] });
    },
  });
}

// ── Soul Points ─────────────────────────────────────────────────────────────

interface SoulPointsRow {
  points: number;
  reason: string;
  _created_at: number;
}

/** The signed-in member's Soul Points total and earning history. */
export function useSoulPoints(signedIn: boolean) {
  const query = useQuery<SoulPointsEntry[]>({
    queryKey: ["soulPoints"],
    queryFn: async () => {
      const rows = (await db.query("soul_points", {
        order: "_created_at.asc",
      })) as unknown as SoulPointsRow[];
      return rows.map((r) => ({
        points: Number(r.points) || 0,
        reason: r.reason ?? "",
        createdAt: Number(r._created_at) || 0,
      }));
    },
    enabled: signedIn,
  });
  return {
    ...query,
    entries: query.data ?? [],
    total: (query.data ?? []).reduce((sum, e) => sum + e.points, 0),
  };
}

/** Applies the one-time detail edit through the guarded edit_track_once command. */
export function useEditTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EditTrackInput) =>
      edit_track_once({
        track_id: input.trackId,
        title: input.title,
        artist: input.artist,
        album: input.album,
        genre: input.genre,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tracks"] });
    },
  });
}

/**
 * Attaches an uploaded music video to the matching song through the guarded
 * attach_track_video rule — one video per song, and the first video stays.
 * Throws a fan-friendly message when the rule refuses.
 */
export function useAttachVideo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ trackId, videoUrl }: { trackId: number; videoUrl: string }) => {
      const result = await attach_track_video({ track_id: trackId, video_url: videoUrl });
      if (result.outcome === "rejected") {
        throw new Error(attachRejectionMessage(result.code));
      }
      return result;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tracks"] });
    },
  });
}
