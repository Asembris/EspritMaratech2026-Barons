import { useEffect, useState, useCallback } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Section } from "@/components/Section";
import { AccessibleButton } from "@/components/AccessibleButton";
import { LiveRegion } from "@/components/LiveRegion";
import { useSpeech } from "@/hooks/use-speech";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { Volume2, Mic, Send, Eye } from "lucide-react";

/**
 * Banking Page
 *
 * Simulates a simple banking interface:
 * - Check balance (spoken + announced via aria-live)
 * - Transfer simulation between accounts
 * - Voice command support with keyboard fallback
 *
 * All feedback is multi-modal: visual + screen reader + speech synthesis.
 */
const BankingPage = () => {
  const { speak } = useSpeech();
  const { transcript, listening, startListening, supported: speechSupported } = useSpeechRecognition();
  const [balance] = useState(2347.85);
  const [balanceVisible, setBalanceVisible] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferMessage, setTransferMessage] = useState("");

  useEffect(() => {
    document.title = "Banque — Plateforme Accessible";
  }, []);

  // Process voice commands
  useEffect(() => {
    if (!transcript) return;
    const lower = transcript.toLowerCase();
    if (lower.includes("solde") || lower.includes("balance")) {
      handleCheckBalance();
    } else if (lower.includes("virement") || lower.includes("transf")) {
      setAnnouncement("Pour effectuer un virement, utilisez le formulaire ci-dessous.");
      speak("Pour effectuer un virement, utilisez le formulaire ci-dessous.");
    } else {
      setAnnouncement(`Commande non reconnue : "${transcript}". Essayez "solde" ou "virement".`);
      speak(`Commande non reconnue. Essayez solde ou virement.`);
    }
  }, [transcript]);

  const handleCheckBalance = useCallback(() => {
    setBalanceVisible(true);
    const msg = `Votre solde est de ${balance.toFixed(2).replace(".", " euros et ")} centimes.`;
    setAnnouncement(msg);
    speak(msg);
  }, [balance, speak]);

  const handleTransfer = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const amount = parseFloat(transferAmount);
      if (isNaN(amount) || amount <= 0) {
        const err = "Veuillez entrer un montant valide supérieur à zéro.";
        setTransferMessage(err);
        speak(err);
        return;
      }
      if (amount > balance) {
        const err = "Solde insuffisant pour ce virement.";
        setTransferMessage(err);
        speak(err);
        return;
      }
      const msg = `Virement simulé de ${amount.toFixed(2)} euros effectué avec succès.`;
      setTransferMessage(msg);
      speak(msg);
      setTransferAmount("");
    },
    [transferAmount, balance, speak]
  );

  return (
    <PageLayout>
      <Section title="Services bancaires" headingLevel="h1" id="banking">
        <p className="text-foreground mb-6 max-w-2xl">
          Consultez votre solde ou effectuez un virement simulé. Toutes les
          actions sont annoncées vocalement et transmises à votre lecteur d'écran.
        </p>

        {/* Voice command button — only shown if browser supports it */}
        {speechSupported && (
          <div className="mb-6">
            <AccessibleButton
              variant="accent"
              onClick={listening ? undefined : startListening}
              aria-label={listening ? "Écoute en cours" : "Activer la commande vocale"}
            >
              <Mic className="w-5 h-5" aria-hidden="true" />
              {listening ? "Écoute en cours…" : "Commande vocale"}
            </AccessibleButton>
            {listening && (
              <p className="mt-2 text-foreground font-semibold" role="status">
                🎤 Parlez maintenant… Dites « solde » ou « virement ».
              </p>
            )}
          </div>
        )}

        {/* Balance check */}
        <div className="flex flex-wrap gap-4 items-start mb-8">
          <AccessibleButton onClick={handleCheckBalance} variant="primary">
            <Eye className="w-5 h-5" aria-hidden="true" />
            Consulter le solde
          </AccessibleButton>

          {balanceVisible && (
            <div
              className="p-4 rounded-lg bg-card border-2 border-primary"
              role="region"
              aria-label="Solde du compte"
            >
              <p className="text-2xl font-bold text-foreground">
                {balance.toFixed(2)} €
              </p>
            </div>
          )}
        </div>

        {/* aria-live region for announcements */}
        <LiveRegion politeness="assertive" className="mb-8">
          {announcement && (
            <p className="p-3 rounded bg-secondary text-secondary-foreground font-medium">
              {announcement}
            </p>
          )}
        </LiveRegion>
      </Section>

      {/* Transfer simulation */}
      <Section title="Simuler un virement" id="transfer">
        <form onSubmit={handleTransfer} className="max-w-md space-y-4">
          <div>
            <label
              htmlFor="transfer-amount"
              className="block text-foreground font-semibold mb-2"
            >
              Montant du virement (en euros)
            </label>
            <input
              type="number"
              id="transfer-amount"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              min="0.01"
              step="0.01"
              className={[
                "w-full px-4 py-3 rounded-lg border-2 border-input",
                "bg-card text-foreground text-lg",
                "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-ring focus-visible:outline-offset-2",
                "min-h-target",
              ].join(" ")}
              placeholder="Ex : 50.00"
              aria-describedby="transfer-help"
            />
            <p id="transfer-help" className="mt-1 text-muted-foreground">
              Entrez le montant que vous souhaitez transférer.
            </p>
          </div>

          <AccessibleButton type="submit" variant="primary">
            <Send className="w-5 h-5" aria-hidden="true" />
            Effectuer le virement
          </AccessibleButton>
        </form>

        <LiveRegion politeness="assertive" className="mt-4">
          {transferMessage && (
            <p
              className={[
                "p-3 rounded font-medium",
                transferMessage.includes("succès")
                  ? "bg-success text-success-foreground"
                  : "bg-destructive text-destructive-foreground",
              ].join(" ")}
            >
              {transferMessage}
            </p>
          )}
        </LiveRegion>
      </Section>
    </PageLayout>
  );
};

export default BankingPage;
