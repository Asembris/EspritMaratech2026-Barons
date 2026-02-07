export type PageContext = {
  page_name: string;
  page_purpose: string;
  available_actions: string[];
  important_elements: string[];
};

export const PAGE_CONTEXTS: Record<string, PageContext> = {
  "/": {
    page_name: "Accueil",
    page_purpose: "Présenter les sections disponibles de l’application.",
    available_actions: [
      "Demander où vous êtes",
      "Demander quoi faire sur cette page",
      "Demander d’expliquer cette page"
    ],
    important_elements: ["Titre de page", "Sections principales"]
  },

  "/banking": {
    page_name: "Banque",
    page_purpose: "Consulter les informations bancaires affichées dans l’application.",
    available_actions: [
      "Demander où vous êtes",
      "Demander quoi faire sur cette page",
      "Demander d’expliquer cette page"
    ],
    important_elements: ["Section banque", "Informations affichées"]
  },

  "/shopping": {
    page_name: "Courses",
    page_purpose: "Voir et gérer les éléments de la page Courses.",
    available_actions: [
      "Demander où vous êtes",
      "Demander quoi faire sur cette page",
      "Demander d’expliquer cette page"
    ],
    important_elements: ["Liste ou cartes", "Informations affichées"]
  },

  "/accessibility": {
    page_name: "Accessibilité",
    page_purpose: "Ajuster les options d’accessibilité de l’application.",
    available_actions: [
      "Demander où vous êtes",
      "Demander quoi faire sur cette page",
      "Demander d’expliquer cette page"
    ],
    important_elements: ["Réglages d’accessibilité", "Options de lecture"]
  }
};

export function getPageContext(pathname: string): PageContext {
  return PAGE_CONTEXTS[pathname] ?? {
    page_name: "Page",
    page_purpose: "Je n’ai pas de contexte pour cette page.",
    available_actions: [],
    important_elements: []
  };
}

