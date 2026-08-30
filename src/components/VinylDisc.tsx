import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

interface VinylDiscProps {
  coverUrl?: string;
  label?: string;
  spinning?: boolean;
  className?: string;
}

/** A vinyl record: grooved disc, cover-art label, spindle hole. Spin is
    pausable via animation-play-state so it can freeze when paused. */
export function VinylDisc({ coverUrl, label, spinning = false, className }: VinylDiscProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "vinyl-disc animate-spin-slow relative aspect-square w-full rounded-full [container-type:inline-size]",
        className,
      )}
      style={{ animationPlayState: spinning ? "running" : "paused" }}
    >
      {coverUrl ? (
        <img
          src={coverUrl}
          alt=""
          draggable={false}
          className="absolute inset-[27%] rounded-full object-cover shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
        />
      ) : (
        <div className="absolute inset-[27%] flex items-center justify-center rounded-full bg-primary/90 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]">
          <span className="font-display text-[clamp(0.6rem,14cqw,1.4rem)] font-bold tracking-tight text-primary-foreground">
            {initials(label ?? "SOUL MUSIC")}
          </span>
        </div>
      )}
      <div className="absolute top-1/2 left-1/2 aspect-square w-[5%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black" />
    </div>
  );
}
