import type { Track } from "./types";
import { songCode } from "./songCode";

export interface Album {
  key: string;
  name: string;
  artist: string;
  coverUrl: string;
  tracks: Track[];
}

/** Group tracks into albums, keeping first-appearance order. */
export function groupAlbums(tracks: Track[]): Album[] {
  const albums = new Map<string, Album>();
  for (const track of tracks) {
    const name = track.album.trim() || track.title.trim();
    const key = `${name.toLowerCase()}::${track.artist.toLowerCase()}`;
    let album = albums.get(key);
    if (!album) {
      album = {
        key,
        name,
        artist: track.artist,
        coverUrl: track.coverUrl,
        tracks: [],
      };
      albums.set(key, album);
    }
    if (!album.coverUrl && track.coverUrl) album.coverUrl = track.coverUrl;
    album.tracks.push(track);
  }
  return [...albums.values()];
}

/** Case-insensitive search across title, artist, album, genre and song code. */
export function matchesQuery(track: Track, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [track.title, track.artist, track.album, track.genre, songCode(track.rowId)].some((value) =>
    value.toLowerCase().includes(needle),
  );
}

export function filterByGenre(tracks: Track[], genre: string | null): Track[] {
  if (!genre) return tracks;
  return tracks.filter((t) => t.genre === genre);
}

export function uniqueGenres(tracks: Track[]): string[] {
  const seen = new Set<string>();
  for (const t of tracks) {
    const g = t.genre.trim();
    if (g) seen.add(g);
  }
  return [...seen];
}

/** The album with the most tracks (first on a tie) is the featured record. */
export function featuredAlbum(albums: Album[]): Album | null {
  if (albums.length === 0) return null;
  return albums.reduce((best, album) => (album.tracks.length > best.tracks.length ? album : best));
}
