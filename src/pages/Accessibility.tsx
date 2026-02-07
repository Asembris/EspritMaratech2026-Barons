import { useEffect } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Section } from "@/components/Section";
import { AccessibleButton } from "@/components/AccessibleButton";
import { LiveRegion } from "@/components/LiveRegion";
import { useAccessibility } from "@/hooks/use-accessibility";
import { Type, Contrast, Check } from "lucide-react";

/**
 * Accessibility Page
 *
 * Provides user controls for:
 * - Text size adjustment (normal, large, extra-large)
 * - High contrast toggle
 * - Explanation of accessibility features
 *
 * All controls use aria-pressed/aria-current for state indication.
 * Changes are announced via aria-live.
 */
const AccessibilityPage = () => {
  const { textSize, setTextSize, highContrast, toggleHighContrast } = useAccessibility();

  useEffect(() => {
    document.title = "Accessibilité — Plateforme Accessible";
  }, []);

  const textSizes = [
    { value: "normal" as const, label: "Normal", description: "Taille de texte standard (18px)" },
    { value: "large" as const, label: "Grand", description: "Texte agrandi (22px)" },
    { value: "x-large" as const, label: "Très grand", description: "Texte très agrandi (26px)" },
  ];

  return (
    <PageLayout>
      <Section title="Paramètres d'accessibilité" headingLevel="h1" id="a11y">
        <p className="text-foreground mb-8 max-w-2xl">
          Personnalisez l'affichage pour améliorer votre confort de lecture.
          Ces réglages s'appliquent immédiatement à toute l'application.
        </p>

        {/* Text size controls */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Type className="w-6 h-6" aria-hidden="true" />
            Taille du texte
          </h2>
          <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Taille du texte">
            {textSizes.map((size) => (
              <AccessibleButton
                key={size.value}
                variant={textSize === size.value ? "primary" : "outline"}
                onClick={() => setTextSize(size.value)}
                aria-pressed={textSize === size.value}
                aria-label={`${size.label} — ${size.description}`}
              >
                {textSize === size.value && (
                  <Check className="w-5 h-5" aria-hidden="true" />
                )}
                {size.label}
              </AccessibleButton>
            ))}
          </div>
          <LiveRegion className="mt-2">
            <p className="text-muted-foreground">
              Taille actuelle : {textSizes.find((s) => s.value === textSize)?.label}
            </p>
          </LiveRegion>
        </div>

        {/* High contrast toggle */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Contrast className="w-6 h-6" aria-hidden="true" />
            Contraste élevé
          </h2>
          <AccessibleButton
            variant={highContrast ? "primary" : "outline"}
            onClick={toggleHighContrast}
            aria-pressed={highContrast}
          >
            {highContrast && <Check className="w-5 h-5" aria-hidden="true" />}
            {highContrast ? "Contraste élevé activé" : "Activer le contraste élevé"}
          </AccessibleButton>
          <LiveRegion className="mt-2">
            <p className="text-muted-foreground">
              Contraste élevé : {highContrast ? "Activé" : "Désactivé"}
            </p>
          </LiveRegion>
        </div>
      </Section>

      {/* Feature explanations */}
      <Section title="Fonctionnalités d'accessibilité" id="features">
        <div className="max-w-3xl space-y-6">
          <FeatureItem
            title="Navigation au clavier"
            description="Toutes les fonctionnalités sont accessibles via Tab, Shift+Tab, Entrée et Espace. Un lien « Aller au contenu principal » apparaît au premier Tab."
          />
          <FeatureItem
            title="Compatibilité lecteur d'écran"
            description="L'application utilise du HTML sémantique, des rôles ARIA appropriés et des régions aria-live pour annoncer les changements dynamiques."
          />
          <FeatureItem
            title="Retour vocal"
            description="Les résultats importants sont lus à haute voix grâce à la synthèse vocale du navigateur (Web Speech API)."
          />
          <FeatureItem
            title="Commande vocale"
            description="Sur les navigateurs compatibles (Chrome, Edge), vous pouvez utiliser des commandes vocales. Un clavier est toujours disponible en alternative."
          />
          <FeatureItem
            title="Respect des préférences système"
            description="Si vous avez activé la réduction des animations dans votre système, l'application respecte ce choix automatiquement."
          />
          <FeatureItem
            title="Cibles tactiles larges"
            description="Tous les boutons et liens ont une taille minimale de 48×48 pixels pour faciliter l'interaction tactile."
          />
        </div>
      </Section>
    </PageLayout>
  );
};

function FeatureItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-5 rounded-lg bg-card border-2 border-border">
      <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

export default AccessibilityPage;
