import { type ReactNode } from "react";

/**
 * LiveRegion
 *
 * Wraps content in an aria-live region so screen readers announce
 * dynamic changes without requiring focus.
 *
 * - "polite": waits for the user's current task to finish before announcing
 * - "assertive": interrupts immediately (use sparingly)
 *
 * aria-atomic="true" ensures the entire region is re-read on change.
 */
interface LiveRegionProps {
  children: ReactNode;
  /** "polite" (default) or "assertive" */
  politeness?: "polite" | "assertive";
  className?: string;
}

export function LiveRegion({
  children,
  politeness = "polite",
  className = "",
}: LiveRegionProps) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className={className}
    >
      {children}
    </div>
  );
}
