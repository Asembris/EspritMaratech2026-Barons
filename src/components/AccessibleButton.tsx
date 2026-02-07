import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * AccessibleButton
 *
 * A button component with:
 * - Minimum 48px touch target (WCAG 2.5.5 AAA, good practice for AA)
 * - Clear focus ring via design system
 * - Semantic <button> element (not div/span)
 * - Variants for primary, secondary, outline, and ghost styles
 *
 * All colors use design system tokens — never inline colors.
 */

const accessibleButtonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 rounded-lg",
    "font-semibold transition-colors",
    "min-h-target min-w-target px-6 py-3",
    "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-ring focus-visible:outline-offset-2",
    "disabled:opacity-50 disabled:pointer-events-none",
    "text-lg leading-tight",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        accent: "bg-accent text-accent-foreground hover:bg-accent/90",
        outline:
          "border-2 border-primary text-primary bg-transparent hover:bg-primary hover:text-primary-foreground",
        ghost: "text-foreground hover:bg-muted",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  }
);

interface AccessibleButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof accessibleButtonVariants> {}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(accessibleButtonVariants({ variant }), className)}
        {...props}
      />
    );
  }
);

AccessibleButton.displayName = "AccessibleButton";
