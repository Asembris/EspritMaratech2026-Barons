import { useEffect } from "react";
import { Link } from "react-router-dom";
import { PageLayout } from "@/components/PageLayout";
import { Section } from "@/components/Section";
import { AccessibleButton } from "@/components/AccessibleButton";
import { Mic, CreditCard, ShoppingCart, Settings } from "lucide-react";

/**
 * Home Page
 *
 * Introduces the platform and its voice-driven accessibility features.
 * Clear CTAs guide users to each section.
 * All content is semantic — no information conveyed by color alone.
 */
const HomePage = () => {
  useEffect(() => {
    document.title = "Accueil — Plateforme Accessible";
  }, []);

  return (
    <PageLayout>
      <Section
        title="Bienvenue sur votre plateforme accessible"
        headingLevel="h1"
        id="welcome"
      >
        <p className="text-lg text-foreground max-w-3xl mb-6 leading-relaxed">
          Cette application a été conçue pour être utilisable par tous, y compris
          les personnes malvoyantes, les personnes à mobilité réduite et les
          seniors. Chaque fonctionnalité est accessible au clavier, compatible
          avec les lecteurs d'écran et enrichie par des retours vocaux.
        </p>

        <div className="flex items-start gap-3 p-4 rounded-lg bg-secondary border-l-4 border-accent mb-8 max-w-3xl">
          <Mic className="w-6 h-6 text-accent flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-foreground">
            <strong>Commande vocale disponible :</strong> Sur les navigateurs
            compatibles, vous pouvez utiliser votre voix pour interagir avec
            certaines fonctionnalités. Un clavier reste toujours disponible en
            alternative.
          </p>
        </div>
      </Section>

      <Section title="Que souhaitez-vous faire ?" id="actions">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl">
          <ActionCard
            to="/banking"
            icon={<CreditCard className="w-8 h-8" aria-hidden="true" />}
            title="Banque"
            description="Consultez votre solde et effectuez des virements simulés."
          />
          <ActionCard
            to="/shopping"
            icon={<ShoppingCart className="w-8 h-8" aria-hidden="true" />}
            title="Courses"
            description="Créez et gérez votre liste de courses facilement."
          />
          <ActionCard
            to="/accessibility"
            icon={<Settings className="w-8 h-8" aria-hidden="true" />}
            title="Accessibilité"
            description="Personnalisez la taille du texte et le contraste."
          />
        </div>
      </Section>
    </PageLayout>
  );
};

/**
 * ActionCard
 *
 * A link styled as a card. Uses <Link> for SPA navigation.
 * The entire card is the link (large touch target).
 * Icon is decorative (aria-hidden), text conveys the action.
 */
function ActionCard({
  to,
  icon,
  title,
  description,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className={[
        "flex flex-col gap-3 p-6 rounded-xl border-2 border-border",
        "bg-card text-card-foreground",
        "hover:border-primary hover:shadow-lg",
        "transition-shadow",
        "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-ring focus-visible:outline-offset-2",
        "min-h-target",
      ].join(" ")}
    >
      <div className="text-primary">{icon}</div>
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </Link>
  );
}

export default HomePage;
