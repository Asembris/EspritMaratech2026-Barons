import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

/**
 * AccessibilityContext
 *
 * Provides app-wide accessibility settings:
 * - textSize: normal | large | x-large
 * - highContrast: boolean toggle for high-contrast theme
 *
 * These are applied as CSS classes on <html> so they cascade everywhere.
 */

type TextSize = "normal" | "large" | "x-large";

interface AccessibilitySettings {
  textSize: TextSize;
  highContrast: boolean;
  setTextSize: (size: TextSize) => void;
  toggleHighContrast: () => void;
}

const AccessibilityContext = createContext<AccessibilitySettings | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [textSize, setTextSizeState] = useState<TextSize>("normal");
  const [highContrast, setHighContrast] = useState(false);

  const setTextSize = useCallback((size: TextSize) => {
    setTextSizeState(size);
    const root = document.documentElement;
    root.classList.remove("text-size-normal", "text-size-large", "text-size-x-large");
    root.classList.add(`text-size-${size}`);
  }, []);

  const toggleHighContrast = useCallback(() => {
    setHighContrast((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("high-contrast", next);
      return next;
    });
  }, []);

  return (
    <AccessibilityContext.Provider
      value={{ textSize, highContrast, setTextSize, toggleHighContrast }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("useAccessibility must be inside AccessibilityProvider");
  return ctx;
}
