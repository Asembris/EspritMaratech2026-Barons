import { NavLink as RouterNavLink } from "react-router-dom";

/**
 * Navigation
 *
 * Accessible top navigation bar implementing:
 * - Semantic <nav> landmark with aria-label
 * - aria-current="page" on active link (via NavLink)
 * - Keyboard navigable links (Tab / Shift+Tab)
 * - Visible focus states from design system
 * - Large touch targets (min 48px)
 */

const navItems = [
  { to: "/", label: "Accueil" },
  { to: "/banking", label: "Banque" },
  { to: "/shopping", label: "Courses" },
  { to: "/accessibility", label: "Accessibilité" },
];

export function Navigation() {
  return (
    <nav aria-label="Navigation principale" className="bg-primary">
      <div className="container mx-auto px-4">
        <ul className="flex flex-wrap items-center gap-1 py-2" role="list">
          {navItems.map((item) => (
            <li key={item.to}>
              <RouterNavLink
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  [
                    "inline-flex items-center min-h-target px-5 py-3 rounded-lg",
                    "text-lg font-semibold transition-colors",
                    "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2",
                    isActive
                      ? "bg-primary-foreground text-primary underline underline-offset-4"
                      : "text-primary-foreground hover:bg-primary-foreground/20",
                  ].join(" ")
                }
              >
                {item.label}
              </RouterNavLink>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
