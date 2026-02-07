export type Intent =
  | "go_home"
  | "go_banking"
  | "go_products"
  | "go_accessibility"
  | "read_page"
  | "help"
  | "guide_query"
  | "unknown";

export type IntentResult = { intent: Intent; confidence: number; raw: string };

const hasAny = (t: string, words: string[]) => words.some(w => t.includes(w));

export function detectIntent(raw: string): IntentResult {
  const t = raw.trim().toLowerCase();

  if (!t) return { intent: "unknown", confidence: 0, raw };

  if (hasAny(t, ["aide", "help", "commande"])) {
    return { intent: "help", confidence: 0.9, raw };
  }

  if (hasAny(t, ["lis", "lire", "lecture", "résume", "resume", "décris", "decris"])) {
    return { intent: "read_page", confidence: 0.85, raw };
  }

  // ✅ NEW: page guidance questions
  if (
    hasAny(t, [
      "où suis",
      "où je suis",
      "ou suis",
      "ou je suis",
      "que puis-je faire",
      "quoi faire",
      "explique",
      "explique cette page",
      "que faire ici",
      "que faire ensuite"
    ])
  ) {
    return { intent: "guide_query", confidence: 0.9, raw };
  }

  if (hasAny(t, ["accueil", "home", "début", "debut", "retour"])) {
    return { intent: "go_home", confidence: 0.9, raw };
  }

  if (hasAny(t, ["banque", "bancaire", "compte", "solde", "virement", "transfert"])) {
    return { intent: "go_banking", confidence: 0.85, raw };
  }

  if (hasAny(t, ["courses", "liste", "produit", "produits", "shopping"])) {
    return { intent: "go_products", confidence: 0.85, raw };
  }

  if (hasAny(t, ["accessibilité", "accessibilite", "contraste", "taille", "paramètre", "parametres"])) {
    return { intent: "go_accessibility", confidence: 0.85, raw };
  }

  return { intent: "unknown", confidence: 0.2, raw };
}
