/**
 * SkipToContent
 *
 * A visually hidden link that becomes visible on focus.
 * Allows keyboard users to skip repetitive navigation and jump to main content.
 * This is a WCAG 2.1 AA requirement (Success Criterion 2.4.1).
 */
export function SkipToContent() {
  return (
    <a href="#main-content" className="skip-link">
      Aller au contenu principal
    </a>
  );
}
