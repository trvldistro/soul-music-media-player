import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface SoulPointsBadgeProps {
  points: number;
  className?: string;
}

/** Mini gold badge showing a member's Soul Points total. */
export function SoulPointsBadge({ points, className }: SoulPointsBadgeProps) {
  return (
    <span
      aria-label={`Soul Points: ${points}`}
      title={`${points} Soul Points`}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-bold tracking-wide text-primary",
        className,
      )}
    >
      <Sparkles className="h-3 w-3" aria-hidden />
      {points} SP
    </span>
  );
}
