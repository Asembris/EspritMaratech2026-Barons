import { NavLink as RouterNavLink, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { LogIn, LogOut, User } from "lucide-react";

/**
 * Navigation
 *
 * Accessible top navigation bar implementing:
 * - Semantic <nav> landmark with aria-label
 * - aria-current="page" on active link (via NavLink)
 * - Keyboard navigable links (Tab / Shift+Tab)
 * - Visible focus states from design system
 * - Large touch targets (min 48px)
 * - Login/Logout functionality
 */

const navItems = [
  { to: "/", label: "Accueil" },
  { to: "/banking", label: "Banque" },
  { to: "/shopping", label: "Courses" },
  { to: "/translate", label: "Traduction" },
  { to: "/accessibility", label: "Accessibilité" },
];

interface StoredUser {
  id: number;
  username: string;
  email: string;
  full_name: string;
}

export function Navigation() {
  const navigate = useNavigate();
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    // Check localStorage for user
    const stored = localStorage.getItem("clearpath_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        setUser(null);
      }
    }

    // Listen for storage changes (login from another tab)
    const handleStorage = () => {
      const stored = localStorage.getItem("clearpath_user");
      setUser(stored ? JSON.parse(stored) : null);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("clearpath_user");
    setUser(null);
    navigate("/");
  };

  const linkClass = (isActive: boolean) =>
    [
      "inline-flex items-center min-h-target px-5 py-3 rounded-lg",
      "text-lg font-semibold transition-colors",
      "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2",
      isActive
        ? "bg-primary-foreground text-primary underline underline-offset-4"
        : "text-primary-foreground hover:bg-primary-foreground/20",
    ].join(" ");

  return (
    <nav aria-label="Navigation principale" className="bg-primary">
      <div className="container mx-auto px-4">
        <ul className="flex flex-wrap items-center gap-1 py-2" role="list">
          {navItems.map((item) => (
            <li key={item.to}>
              <RouterNavLink
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) => linkClass(isActive)}
              >
                {item.label}
              </RouterNavLink>
            </li>
          ))}

          {/* Spacer */}
          <li className="flex-1" aria-hidden="true" />

          {/* Login/Logout */}
          <li>
            {user ? (
              <div className="flex items-center gap-2">
                <span className="text-primary-foreground flex items-center gap-2 px-3">
                  <User className="w-5 h-5" aria-hidden="true" />
                  <span className="hidden sm:inline">{user.full_name || user.username}</span>
                </span>
                <button
                  onClick={handleLogout}
                  className={[
                    "inline-flex items-center gap-2 min-h-target px-5 py-3 rounded-lg",
                    "text-lg font-semibold transition-colors",
                    "text-primary-foreground hover:bg-red-500/20",
                    "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2",
                  ].join(" ")}
                  aria-label="Se déconnecter"
                >
                  <LogOut className="w-5 h-5" aria-hidden="true" />
                  <span className="hidden sm:inline">Déconnexion</span>
                </button>
              </div>
            ) : (
              <RouterNavLink
                to="/login"
                className={({ isActive }) =>
                  [
                    "inline-flex items-center gap-2 min-h-target px-5 py-3 rounded-lg",
                    "text-lg font-semibold transition-colors",
                    "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2",
                    isActive
                      ? "bg-primary-foreground text-primary"
                      : "text-primary-foreground hover:bg-primary-foreground/20",
                  ].join(" ")
                }
              >
                <LogIn className="w-5 h-5" aria-hidden="true" />
                <span className="hidden sm:inline">Connexion</span>
              </RouterNavLink>
            )}
          </li>
        </ul>
      </div>
    </nav>
  );
}

