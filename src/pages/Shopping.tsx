import { useEffect, useState, useCallback, useRef } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Section } from "@/components/Section";
import { AccessibleButton } from "@/components/AccessibleButton";
import { LiveRegion } from "@/components/LiveRegion";
import { useSpeech } from "@/hooks/use-speech";
import { Plus, Trash2, ShoppingCart } from "lucide-react";

/**
 * Shopping Page
 *
 * Manages a shopping list with:
 * - Add items via text input
 * - Remove items individually
 * - All changes announced via aria-live for screen readers
 * - Voice feedback on each action
 * - Semantic list (<ul>/<li>) for proper AT navigation
 */
const ShoppingPage = () => {
  const { speak } = useSpeech();
  const [items, setItems] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = "Courses — Plateforme Accessible";
  }, []);

  const handleAdd = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (!trimmed) return;

      setItems((prev) => [...prev, trimmed]);
      const msg = `${trimmed} ajouté à la liste. ${items.length + 1} article${items.length + 1 > 1 ? "s" : ""} au total.`;
      setAnnouncement(msg);
      speak(msg);
      setInputValue("");
      // Return focus to input for quick successive additions
      inputRef.current?.focus();
    },
    [inputValue, items.length, speak]
  );

  const handleRemove = useCallback(
    (index: number) => {
      const removed = items[index];
      setItems((prev) => prev.filter((_, i) => i !== index));
      const remaining = items.length - 1;
      const msg = `${removed} retiré. ${remaining} article${remaining !== 1 ? "s" : ""} restant${remaining !== 1 ? "s" : ""}.`;
      setAnnouncement(msg);
      speak(msg);
    },
    [items, speak]
  );

  return (
    <PageLayout>
      <Section title="Liste de courses" headingLevel="h1" id="shopping">
        <p className="text-foreground mb-6 max-w-2xl">
          Ajoutez des articles à votre liste de courses. Chaque modification est
          annoncée vocalement et via votre lecteur d'écran.
        </p>

        {/* Add item form */}
        <form onSubmit={handleAdd} className="flex flex-wrap gap-3 mb-8 max-w-lg">
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="item-input" className="block font-semibold text-foreground mb-2">
              Nouvel article
            </label>
            <input
              ref={inputRef}
              type="text"
              id="item-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className={[
                "w-full px-4 py-3 rounded-lg border-2 border-input",
                "bg-card text-foreground text-lg",
                "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-ring focus-visible:outline-offset-2",
                "min-h-target",
              ].join(" ")}
              placeholder="Ex : Pain, Lait, Beurre"
              aria-describedby="item-help"
            />
            <p id="item-help" className="mt-1 text-muted-foreground">
              Tapez le nom de l'article puis appuyez sur Entrée ou cliquez Ajouter.
            </p>
          </div>
          <div className="self-end">
            <AccessibleButton type="submit" variant="primary">
              <Plus className="w-5 h-5" aria-hidden="true" />
              Ajouter
            </AccessibleButton>
          </div>
        </form>

        {/* Announcements */}
        <LiveRegion politeness="assertive" className="mb-6">
          {announcement && (
            <p className="p-3 rounded bg-secondary text-secondary-foreground font-medium">
              {announcement}
            </p>
          )}
        </LiveRegion>

        {/* Shopping list */}
        {items.length === 0 ? (
          <div className="p-6 rounded-lg border-2 border-dashed border-border text-center">
            <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-3" aria-hidden="true" />
            <p className="text-muted-foreground text-lg">
              Votre liste est vide. Ajoutez un article ci-dessus.
            </p>
          </div>
        ) : (
          <div>
            <p className="text-foreground font-semibold mb-3">
              {items.length} article{items.length > 1 ? "s" : ""} dans votre liste :
            </p>
            {/* Semantic list for screen reader navigation */}
            <ul className="space-y-2 max-w-lg" role="list">
              {items.map((item, index) => (
                <li
                  key={`${item}-${index}`}
                  className={[
                    "flex items-center justify-between gap-4 p-4 rounded-lg",
                    "bg-card border-2 border-border",
                  ].join(" ")}
                >
                  <span className="text-foreground text-lg font-medium">
                    {item}
                  </span>
                  <AccessibleButton
                    variant="destructive"
                    onClick={() => handleRemove(index)}
                    aria-label={`Retirer ${item} de la liste`}
                    className="px-3 py-2"
                  >
                    <Trash2 className="w-5 h-5" aria-hidden="true" />
                    <span className="sr-only sm:not-sr-only">Retirer</span>
                  </AccessibleButton>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>
    </PageLayout>
  );
};

export default ShoppingPage;
