import type { PageContext } from "./pageContexts";

export function buildGuideAnswer(ctx: PageContext, question: string): string {
  const q = question.trim().toLowerCase();

  // Where am I?
  if (q.includes("où suis") || q.includes("ou suis") || q.includes("où je suis") || q.includes("ou je suis")) {
    return [
      `Vous êtes sur la page ${ctx.page_name}.`,
      ctx.page_purpose
    ].join("\n");
  }

  // What can I do here?
  if (
    q.includes("que puis-je faire") ||
    q.includes("quoi faire") ||
    q.includes("que faire ici") ||
    q.includes("qu'est ce que je peux faire") ||
    q.includes("qu’est ce que je peux faire")
  ) {
    const actions = ctx.available_actions.slice(0, 5);
    if (actions.length === 0) {
      return "Je n’ai pas d’actions disponibles à lire pour cette page.";
    }
    return ["Voici ce que vous pouvez faire ici :", ...actions.map(a => `- ${a}`)].join("\n");
  }

  // Explain this page
  if (q.includes("explique") || q.includes("décris") || q.includes("decris")) {
    const elements = ctx.important_elements.slice(0, 6);
    return [
      ctx.page_purpose,
      elements.length ? "Éléments importants :" : "Je n’ai pas d’éléments importants à lire pour cette page.",
      ...elements.map(e => `- ${e}`)
    ].join("\n");
  }

  // What next?
  if (q.includes("ensuite") || q.includes("après") || q.includes("apres")) {
    const actions = ctx.available_actions.slice(0, 2);
    if (actions.length === 0) {
      return "Je ne peux pas suggérer la suite à partir de cette page.";
    }
    return ["Vous pouvez faire ceci ensuite :", ...actions.map(a => `- ${a}`)].join("\n");
  }

  // Default: out of scope for page-guide MVP
  return "Je peux répondre à : où suis-je, que puis-je faire ici, explique cette page, ou que faire ensuite.";
}
