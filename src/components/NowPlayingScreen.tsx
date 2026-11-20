import { useEffect, useRef } from "react";
import { pickSource } from "@/lib/mediaMatch";
import { usePlayer } from "@/player/PlayerProvider";
import type { Track } from "@/lib/types";

/**
 * The video for whatever is playing, shown large above the controls.
 *
 * Both the full player and the normal page while the player bar is up use
 * this, so the video is live on screen wherever you are — never a tiny box in
 * the corner. The YouTube player is styled over the placeholder rather than
 * moved into it, because moving the iframe would restart the song.
 */
export function NowPlayingVideo({
  track,
  className,
}: {
  track: Track | null;
  className?: string;
}) {
  const p = usePlayer();
  const source = track ? pickSource(track, p.videoMode) : "audio";
  const showVideo = source === "video";
  const showYouTube = source === "youtube";
  const visible = showVideo || showYouTube;
  const videoMountRef = useRef<HTMLDivElement | null>(null);
  const ytStageRef = useRef<HTMLDivElement | null>(null);
  const mountVideo = p.mountVideo;
  const mountYouTube = p.mountYouTube;
  const setVideoPlacement = p.setVideoPlacement;
  const rowId = track?.rowId ?? null;

  // Borrow the player's shared <video> element while a music video is on screen.
  useEffect(() => {
    if (!visible || !showVideo) return;
    mountVideo(videoMountRef.current);
    return () => mountVideo(null);
  }, [visible, showVideo, mountVideo, rowId]);

  // Point YouTube's parked player box at this stage.
  useEffect(() => {
    if (!visible || !showYouTube) return;
    mountYouTube(ytStageRef.current);
    return () => mountYouTube(null);
  }, [visible, showYouTube, mountYouTube, rowId]);

  // Whatever showed the video last no longer does: park it in the corner.
  useEffect(() => {
    if (!visible) return;
    return () => setVideoPlacement("corner");
  }, [visible, setVideoPlacement]);

  if (!visible) return null;

  return (
    <div
      ref={showVideo ? videoMountRef : ytStageRef}
      data-testid={showYouTube ? "youtube-stage" : "video-stage"}
      role="region"
      aria-label={showYouTube ? "YouTube video" : "Music video"}
      className={className ?? "relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl shadow-black/70"}
    />
  );
}
