import { cn } from "@/lib/utils";

interface VisualizerProps {
  active?: boolean;
  bars?: number;
  className?: string;
  barClassName?: string;
}

/** CSS-animated equalizer bars; frozen and dimmed when not active. */
export function Visualizer({ active = false, bars = 4, className, barClassName }: VisualizerProps) {
  return (
    <div aria-hidden className={cn("flex h-4 items-end gap-[3px]", className)}>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className={cn("animate-eq w-[3px] origin-bottom rounded-full bg-primary", barClassName)}
          style={{
            height: "100%",
            animationDelay: `${i * 130}ms`,
            animationDuration: `${620 + (i % 3) * 190}ms`,
            animationPlayState: active ? "running" : "paused",
            opacity: active ? 1 : 0.35,
          }}
        />
      ))}
    </div>
  );
}
