import { useEffect, useState, useCallback } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Section } from "@/components/Section";
import { AccessibleButton } from "@/components/AccessibleButton";
import { LiveRegion } from "@/components/LiveRegion";
import { useSpeech } from "@/hooks/use-speech";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { getBalance, getTransactions, transfer } from "@/lib/omarApi";
import {
  Volume2,
  Mic,
  Send,
  Eye,
  Wallet,
  CreditCard,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface Transaction {
  id: number;
  amount: number;
  description: string;
  date: string;
  category: string;
}

/**
 * Banking Page
 *
 * Shows real balance and transactions from API.
 * - Check balance (spoken + announced via aria-live)
 * - View transaction history
 * - Transfer simulation
 * - Voice command support with keyboard fallback
 *
 * All feedback is multi-modal: visual + screen reader + speech synthesis.
 */
const BankingPage = () => {
  const { speak } = useSpeech();
  const {
    transcript,
    listening,
    startListening,
    supported: speechSupported,
  } = useSpeechRecognition();

  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [balanceVisible, setBalanceVisible] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferMessage, setTransferMessage] = useState("");

  useEffect(() => {
    document.title = "Banque — Plateforme Accessible";
  }, []);

  // Fetch data from API
  const fetchData = async () => {
    try {
      const [balData, txData] = await Promise.all([
        getBalance(),
        getTransactions(),
      ]);
      setBalance(balData.balance);
      setTransactions(txData);
    } catch (error) {
      console.error("Error fetching banking data:", error);
      // Fallback to demo data if API not available
      setBalance(2347.85);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Listen for balance updates from Shopping checkout
    const handleBalanceUpdate = () => fetchData();
    window.addEventListener("balanceUpdated", handleBalanceUpdate);
    return () => window.removeEventListener("balanceUpdated", handleBalanceUpdate);
  }, []);

  // Process voice commands
  useEffect(() => {
    if (!transcript) return;
    const lower = transcript.toLowerCase();
    if (lower.includes("solde") || lower.includes("balance")) {
      handleCheckBalance();
    } else if (lower.includes("virement") || lower.includes("transf")) {
      setAnnouncement(
        "Pour effectuer un virement, utilisez le formulaire ci-dessous."
      );
      speak("Pour effectuer un virement, utilisez le formulaire ci-dessous.");
    } else {
      setAnnouncement(
        `Commande non reconnue : "${transcript}". Essayez "solde" ou "virement".`
      );
      speak(`Commande non reconnue. Essayez solde ou virement.`);
    }
  }, [transcript]);

  const handleCheckBalance = useCallback(() => {
    setBalanceVisible(true);
    const msg = `Votre solde est de ${balance.toFixed(3)} dinars tunisiens.`;
    setAnnouncement(msg);
    speak(msg);
  }, [balance, speak]);

  const [transferring, setTransferring] = useState(false);
  const [recipient, setRecipient] = useState("Mohamed Ben Ali");

  const handleTransfer = useCallback(
    async (e: React.FormEvent) => {
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

      setTransferring(true);
      try {
        const result = await transfer(1, amount, recipient);
        const msg = `${result.message} Nouveau solde: ${result.new_balance.toFixed(3)} TND.`;
        setTransferMessage(msg);
        speak(msg);
        setTransferAmount("");
        setBalance(result.new_balance);
        // Refresh transactions
        fetchData();
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : "Erreur lors du virement";
        setTransferMessage(errMsg);
        speak(errMsg);
      } finally {
        setTransferring(false);
      }
    },
    [transferAmount, balance, recipient, speak]
  );

  if (loading) {
    return (
      <PageLayout>
        <Section title="Chargement..." headingLevel="h1" id="banking">
          <p className="text-foreground">Chargement des données bancaires...</p>
        </Section>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Section title="Espace Banque" headingLevel="h1" id="banking">
        <p className="text-foreground mb-6 max-w-2xl">
          Consultez votre solde, vos transactions et effectuez des virements.
          Toutes les actions sont annoncées vocalement.
        </p>

        {/* Voice command button */}
        {speechSupported && (
          <div className="mb-6">
            <AccessibleButton
              variant="accent"
              onClick={listening ? undefined : startListening}
              aria-label={
                listening ? "Écoute en cours" : "Activer la commande vocale"
              }
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

        {/* Balance Card - Premium Style from Omar */}
        <div
          className="bg-gradient-to-br from-blue-600 to-blue-900 rounded-2xl p-8 shadow-2xl mb-8 max-w-xl"
          role="region"
          aria-label="Solde du compte"
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-blue-200 font-medium mb-1">Solde Total</p>
              <h2 className="text-4xl font-bold text-white">
                {balance.toFixed(3)} TND
              </h2>
            </div>
            <div className="p-3 bg-white/10 rounded-xl">
              <Wallet className="w-10 h-10 text-white" />
            </div>
          </div>
          <div className="flex items-center justify-between text-blue-200">
            <div className="flex items-center gap-2">
              <CreditCard size={20} />
              <span>Compte Principal</span>
            </div>
            <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm font-medium">
              Actif
            </span>
          </div>
        </div>

        {/* Check Balance Button */}
        <div className="mb-6">
          <AccessibleButton onClick={handleCheckBalance} variant="primary">
            <Eye className="w-5 h-5" aria-hidden="true" />
            Annoncer le solde
          </AccessibleButton>
        </div>

        {/* Announcements */}
        <LiveRegion politeness="assertive" className="mb-8">
          {announcement && (
            <p className="p-3 rounded bg-secondary text-secondary-foreground font-medium">
              {announcement}
            </p>
          )}
        </LiveRegion>
      </Section>

      {/* Transaction History - from Omar */}
      <Section title="Historique des transactions" id="transactions">
        {transactions.length === 0 ? (
          <p className="text-muted-foreground">
            Aucune transaction récente. Connectez le backend pour voir les données.
          </p>
        ) : (
          <div className="space-y-4 max-w-2xl">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 rounded-xl bg-card border-2 border-border hover:border-primary/50 transition-colors"
                role="listitem"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-xl ${tx.amount > 0
                      ? "bg-green-500/10 text-green-600"
                      : "bg-red-500/10 text-red-600"
                      }`}
                  >
                    {tx.amount > 0 ? (
                      <TrendingUp size={20} />
                    ) : (
                      <TrendingDown size={20} />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {tx.description}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{new Date(tx.date).toLocaleDateString()}</span>
                      <span>•</span>
                      <span className="bg-muted px-2 py-0.5 rounded text-xs">
                        {tx.category}
                      </span>
                    </div>
                  </div>
                </div>
                <span
                  className={`text-xl font-bold ${tx.amount > 0 ? "text-green-600" : "text-foreground"
                    }`}
                >
                  {tx.amount > 0 ? "+" : ""}
                  {tx.amount.toFixed(3)} TND
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Transfer simulation */}
      <Section title="Simuler un virement" id="transfer">
        <form onSubmit={handleTransfer} className="max-w-md space-y-4">
          <div>
            <label
              htmlFor="transfer-recipient"
              className="block text-foreground font-semibold mb-2"
            >
              Bénéficiaire
            </label>
            <input
              type="text"
              id="transfer-recipient"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className={[
                "w-full px-4 py-3 rounded-lg border-2 border-input",
                "bg-card text-foreground text-lg",
                "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-ring focus-visible:outline-offset-2",
                "min-h-target",
              ].join(" ")}
              placeholder="Nom du bénéficiaire"
              required
            />
          </div>
          <div>
            <label
              htmlFor="transfer-amount"
              className="block text-foreground font-semibold mb-2"
            >
              Montant du virement (en TND)
            </label>
            <input
              type="number"
              id="transfer-amount"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              min="0.001"
              step="0.001"
              className={[
                "w-full px-4 py-3 rounded-lg border-2 border-input",
                "bg-card text-foreground text-lg",
                "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-ring focus-visible:outline-offset-2",
                "min-h-target",
              ].join(" ")}
              placeholder="Ex : 50.000"
              aria-describedby="transfer-help"
              required
            />
            <p id="transfer-help" className="mt-1 text-muted-foreground">
              Entrez le montant que vous souhaitez transférer.
            </p>
          </div>

          <AccessibleButton type="submit" variant="primary" disabled={transferring}>
            <Send className="w-5 h-5" aria-hidden="true" />
            {transferring ? "Virement en cours..." : "Effectuer le virement"}
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
