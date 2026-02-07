import { type ReactNode } from "react";
import { SkipToContent } from "./SkipToContent";
import { Navigation } from "./Navigation";

/**
 * PageLayout
 *
 * Wraps every page with:
 * - Skip-to-content link (WCAG 2.4.1)
 * - Accessible navigation landmark
 * - <main> landmark with id for skip link target
 * - Proper page title via document.title (set in each page)
 * - <footer> landmark
 */
interface PageLayoutProps {
  children: ReactNode;
}

export function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <SkipToContent />

      <header>
        <Navigation />
      </header>

      <main
        id="main-content"
        className="flex-1 container mx-auto px-4 py-8"
        /* tabIndex=-1 allows skip link to move focus here */
        tabIndex={-1}
      >
        {children}
      </main>

      <footer className="bg-secondary py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>
            Application accessible — Conforme WCAG 2.1 AA
          </p>
        </div>
      </footer>
    </div>
  );
}
