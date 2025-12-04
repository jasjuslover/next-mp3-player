import * as React from "react";

import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(({ className, value = 0, ...props }, ref) => (
  <div ref={ref} className={cn("relative h-2 w-full overflow-hidden rounded-full bg-white/10", className)} {...props}>
    <div
      className="h-full w-full origin-left rounded-full bg-emerald-400 transition-[transform,opacity] duration-200"
      style={{ transform: `scaleX(${Math.max(0, Math.min(100, value)) / 100})` }}
    />
  </div>
));
Progress.displayName = "Progress";
