import type { NavigateFunction } from "react-router-dom";
import type { Intent } from "./detectIntent";

export function handleIntent(opts: {
  intent: Intent;
  navigate: NavigateFunction;
  speak: (text: string) => void;
  readCurrentPage: () => void;
  help: () => void;
}) {
  const { intent, navigate, speak, readCurrentPage, help } = opts;

  switch (intent) {
    case "go_home":
      speak("D’accord. Je vous envoie à l’accueil.");
      navigate("/");
      return;

    case "go_banking":
      speak("D’accord. Ouverture de la page banque.");
      navigate("/banking");
      return;

    case "go_products":
      speak("D’accord. Ouverture de la page courses.");
      navigate("/shopping");
      return;

    case "go_accessibility":
      speak("D’accord. Ouverture des paramètres d’accessibilité.");
      navigate("/accessibility");
      return;

    case "read_page":
      speak("D’accord. Je lis la page.");
      readCurrentPage();
      return;

    case "help":
      help();
      return;

    default:
      speak("Je n’ai pas compris. Dites par exemple : accueil, banque, courses, accessibilité, lire la page, ou aide.");
  }
}
