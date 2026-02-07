import { type ReactNode } from "react";

/**
 * Section
 *
 * A semantic <section> with an accessible heading.
 * Uses semantic HTML for structure — screen readers can navigate by headings.
 * The heading level defaults to h2 (appropriate for page subsections).
 */
interface SectionProps {
  title: string;
  children: ReactNode;
  /** Heading level, defaults to "h2" */
  headingLevel?: "h1" | "h2" | "h3";
  className?: string;
  id?: string;
}

export function Section({
  title,
  children,
  headingLevel = "h2",
  className = "",
  id,
}: SectionProps) {
  const Heading = headingLevel;

  return (
    <section
      aria-labelledby={id ? `${id}-heading` : undefined}
      className={`py-8 ${className}`}
      id={id}
    >
      <Heading
        id={id ? `${id}-heading` : undefined}
        className="text-2xl font-bold text-foreground mb-4"
      >
        {title}
      </Heading>
      {children}
    </section>
  );
}
