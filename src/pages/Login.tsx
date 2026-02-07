import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { Section } from "@/components/Section";
import { AccessibleButton } from "@/components/AccessibleButton";
import { LiveRegion } from "@/components/LiveRegion";
import { useSpeech } from "@/hooks/use-speech";
import { loginUser } from "@/lib/omarApi";
import { LogIn, User } from "lucide-react";

/**
 * Login Page
 *
 * Simple login for demo purposes.
 * Sets user in localStorage for assistant chat to use.
 */
const LoginPage = () => {
    const { speak } = useSpeech();
    const navigate = useNavigate();
    const [email, setEmail] = useState("omar@example.com");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [announcement, setAnnouncement] = useState("");

    useEffect(() => {
        document.title = "Connexion — Plateforme Accessible";
        // Check if already logged in
        const user = localStorage.getItem("clearpath_user");
        if (user) {
            navigate("/");
        }
    }, [navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const user = await loginUser(email);
            localStorage.setItem("clearpath_user", JSON.stringify(user));
            const msg = `Bienvenue ${user.full_name || user.username}!`;
            setAnnouncement(msg);
            speak(msg);
            setTimeout(() => navigate("/"), 1000);
        } catch (err) {
            const errMsg = 'Utilisateur non trouvé. Essayez "omar@example.com"';
            setError(errMsg);
            speak(errMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageLayout>
            <Section title="Connexion" headingLevel="h1" id="login">
                <p className="text-foreground mb-6 max-w-md">
                    Connectez-vous pour accéder à l'assistant IA et gérer votre panier.
                </p>

                <div className="max-w-md">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-foreground font-semibold mb-2"
                            >
                                Email
                            </label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={[
                                    "w-full px-4 py-3 rounded-lg border-2 border-input",
                                    "bg-card text-foreground text-lg",
                                    "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-ring focus-visible:outline-offset-2",
                                    "min-h-target",
                                ].join(" ")}
                                placeholder="votre@email.com"
                                required
                                aria-describedby="email-help"
                            />
                            <p id="email-help" className="mt-1 text-muted-foreground">
                                Pour la démo, utilisez : <code>omar@example.com</code>
                            </p>
                        </div>

                        {error && (
                            <LiveRegion politeness="assertive">
                                <p className="p-3 rounded bg-destructive text-destructive-foreground font-medium">
                                    {error}
                                </p>
                            </LiveRegion>
                        )}

                        <AccessibleButton
                            type="submit"
                            disabled={loading}
                            variant="primary"
                            className="w-full"
                        >
                            <LogIn className="w-5 h-5" aria-hidden="true" />
                            {loading ? "Connexion..." : "Se connecter"}
                        </AccessibleButton>
                    </form>

                    <LiveRegion politeness="polite" className="mt-4">
                        {announcement && (
                            <p className="p-3 rounded bg-success text-success-foreground font-medium">
                                {announcement}
                            </p>
                        )}
                    </LiveRegion>
                </div>
            </Section>
        </PageLayout>
    );
};

export default LoginPage;
