import { Play } from "lucide-react";
import { formatTrackTotal } from "@/lib/format";
import { VinylDisc } from "./VinylDisc";
import type { Album } from "@/lib/tracks";

interface AlbumCardProps {
  album: Album;
  onPlay: () => void;
  onOpen: () => void;
}

export function AlbumCard({ album, onPlay, onOpen }: AlbumCardProps) {
  const seconds = album.tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
  return (
    <div className="group">
      <div className="relative aspect-square">
        <div className="absolute top-0 right-0 h-full w-full translate-x-[5%] transition-transform duration-500 ease-out group-hover:translate-x-[24%]">
          <VinylDisc coverUrl={album.coverUrl} label={album.name} className="opacity-95" />
        </div>
        <button
          onClick={onOpen}
          aria-label={`Open album ${album.name}`}
          className="absolute inset-0 z-10 overflow-hidden rounded-xl bg-secondary shadow-lg shadow-black/40"
        >
          {album.coverUrl ? (
            <img
              src={album.coverUrl}
              alt={album.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent to-background">
              <span className="font-display text-4xl italic text-muted-foreground">{album.name}</span>
            </div>
          )}
        </button>
        <button
          onClick={onPlay}
          aria-label={`Play album ${album.name}`}
          className="absolute right-2 bottom-2 z-20 flex h-11 w-11 translate-y-2 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-xl shadow-black/40 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
        >
          <Play className="h-5 w-5 fill-current" />
        </button>
      </div>
      <button onClick={onOpen} className="mt-3 block w-full text-left">
        <p className="truncate font-display text-lg italic text-foreground transition-colors group-hover:text-primary">
          {album.name}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {album.artist} · {formatTrackTotal(album.tracks.length, seconds)}
        </p>
      </button>
    </div>
  );
}
