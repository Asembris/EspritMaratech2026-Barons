import { useEffect, useState, useCallback, useRef } from "react";
import { PageLayout } from "@/components/PageLayout";
import { Section } from "@/components/Section";
import { AccessibleButton } from "@/components/AccessibleButton";
import { LiveRegion } from "@/components/LiveRegion";
import { useSpeech } from "@/hooks/use-speech";
import {
  getProducts,
  getCart,
  addToCart,
  removeFromCart,
} from "@/lib/omarApi";
import {
  Plus,
  Trash2,
  ShoppingCart,
  Package,
  X,
  Mic,
} from "lucide-react";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  category: string;
  description: string;
}

interface CartItem {
  product_name: string;
  price: number;
  quantity: number;
  total: number;
}

/**
 * Shopping Page
 *
 * Manages shopping with real products from API:
 * - Browse product catalog
 * - Add/remove items to cart
 * - View cart summary
 * - Voice commands: "ajoute [produit]", "retire [produit]"
 *
 * All changes announced via aria-live for screen readers.
 */
const ShoppingPage = () => {
  const { speak } = useSpeech();
  const {
    transcript,
    listening,
    startListening,
    supported: speechSupported,
  } = useSpeechRecognition();

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = "Courses — Plateforme Accessible";
  }, []);

  // Fetch products and cart from API
  useEffect(() => {
    async function fetchData() {
      try {
        const [prodData, cartData] = await Promise.all([
          getProducts(),
          getCart(1),
        ]);
        setProducts(prodData);
        setCart(cartData);
      } catch (error) {
        console.error("Error fetching store data:", error);
        // Fallback to empty
        setProducts([]);
        setCart([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();

    // Listen for cart updates from AssistantChat
    const handleCartUpdate = () => fetchData();
    window.addEventListener("cartUpdated", handleCartUpdate);
    return () => window.removeEventListener("cartUpdated", handleCartUpdate);
  }, []);

  // Process voice commands
  useEffect(() => {
    if (!transcript) return;
    const lower = transcript.toLowerCase();

    if (lower.includes("ajoute") || lower.includes("ajout")) {
      // Try to find a product name in the command
      const product = products.find((p) =>
        lower.includes(p.name.toLowerCase())
      );
      if (product) {
        handleAddToCart(product);
      } else {
        setAnnouncement(
          `Produit non trouvé. Essayez "ajoute lait" ou "ajoute pain".`
        );
        speak(`Produit non trouvé. Dites le nom d'un produit du catalogue.`);
      }
    } else if (lower.includes("retire") || lower.includes("enlève")) {
      const item = cart.find((c) =>
        lower.includes(c.product_name.toLowerCase())
      );
      if (item) {
        handleRemoveFromCart(item.product_name);
      } else {
        setAnnouncement("Cet article n'est pas dans votre panier.");
        speak("Cet article n'est pas dans votre panier.");
      }
    } else if (lower.includes("panier") || lower.includes("total")) {
      const total = cart.reduce((acc, item) => acc + item.total, 0);
      const msg = `Votre panier contient ${cart.length} articles pour un total de ${total.toFixed(3)} dinars.`;
      setAnnouncement(msg);
      speak(msg);
    }
  }, [transcript, products, cart]);

  const handleAddToCart = async (product: Product) => {
    try {
      await addToCart(1, product.name, 1);
      const updatedCart = await getCart(1);
      setCart(updatedCart);
      const msg = `${product.name} ajouté au panier.`;
      setAnnouncement(msg);
      speak(msg);
    } catch (error) {
      console.error("Error adding to cart:", error);
      setAnnouncement("Erreur lors de l'ajout. Vérifiez le backend.");
    }
  };

  const handleRemoveFromCart = async (productName: string) => {
    try {
      await removeFromCart(1, productName);
      const updatedCart = await getCart(1);
      setCart(updatedCart);
      const msg = `${productName} retiré du panier.`;
      setAnnouncement(msg);
      speak(msg);
    } catch (error) {
      console.error("Error removing from cart:", error);
    }
  };

  // Manual add (for accessibility - add by typing)
  const handleManualAdd = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (!trimmed) return;

      const product = products.find(
        (p) => p.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (product) {
        handleAddToCart(product);
      } else {
        setAnnouncement(
          `"${trimmed}" n'est pas dans le catalogue. Choisissez un produit ci-dessous.`
        );
        speak(`${trimmed} n'est pas dans le catalogue.`);
      }
      setInputValue("");
      inputRef.current?.focus();
    },
    [inputValue, products, speak]
  );

  const cartTotal = cart.reduce((acc, item) => acc + item.total, 0);

  if (loading) {
    return (
      <PageLayout>
        <Section title="Chargement..." headingLevel="h1" id="shopping">
          <p className="text-foreground">Chargement du catalogue...</p>
        </Section>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Section title="Le Magasin" headingLevel="h1" id="shopping">
        <p className="text-foreground mb-6 max-w-2xl">
          Parcourez le catalogue et ajoutez des produits à votre panier.
          Utilisez la commande vocale : « ajoute lait » ou « retire pain ».
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
                🎤 Dites « ajoute lait », « retire pain », ou « panier ».
              </p>
            )}
          </div>
        )}

        {/* Cart Summary Widget */}
        <div
          className="bg-purple-100 dark:bg-purple-900/30 border-2 border-purple-300 dark:border-purple-500/30 rounded-xl p-4 mb-8 max-w-md"
          role="region"
          aria-label="Résumé du panier"
        >
          <div className="flex items-center gap-4">
            <div className="bg-purple-500/20 p-3 rounded-lg">
              <ShoppingCart className="text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-foreground">Mon Panier</p>
              <p className="text-sm text-muted-foreground">
                {cart.length} article{cart.length !== 1 ? "s" : ""}
              </p>
            </div>
            <span className="text-2xl font-bold text-foreground">
              {cartTotal.toFixed(3)} TND
            </span>
          </div>
        </div>

        {/* Manual add form */}
        <form
          onSubmit={handleManualAdd}
          className="flex flex-wrap gap-3 mb-8 max-w-lg"
        >
          <div className="flex-1 min-w-[200px]">
            <label
              htmlFor="item-input"
              className="block font-semibold text-foreground mb-2"
            >
              Ajouter un produit
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
              placeholder="Ex : Lait, Pain, Thon"
              aria-describedby="item-help"
            />
            <p id="item-help" className="mt-1 text-muted-foreground">
              Tapez le nom exact du produit ou utilisez les boutons ci-dessous.
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
      </Section>

      {/* Product Catalog */}
      <Section title="Catalogue" id="catalog">
        {products.length === 0 ? (
          <p className="text-muted-foreground">
            Aucun produit disponible. Lancez le backend pour voir le catalogue.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-card rounded-xl p-5 border-2 border-border hover:border-purple-500/50 transition-all flex flex-col"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="bg-muted p-2 rounded-lg">
                    <Package className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <span className="bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 text-xs px-2 py-1 rounded-full font-medium">
                    {product.category}
                  </span>
                </div>

                <h3 className="font-bold text-lg text-foreground mb-1">
                  {product.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 flex-1">
                  {product.description}
                </p>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Prix</p>
                    <span className="text-xl font-bold text-foreground">
                      {product.price.toFixed(3)} TND
                    </span>
                  </div>
                  <AccessibleButton
                    onClick={() => handleAddToCart(product)}
                    variant="primary"
                    className="p-3"
                    aria-label={`Ajouter ${product.name} au panier`}
                  >
                    <Plus size={20} />
                  </AccessibleButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Cart Details */}
      <Section title="Détails du panier" id="cart-details">
        {cart.length === 0 ? (
          <div className="p-6 rounded-lg border-2 border-dashed border-border text-center max-w-md">
            <ShoppingCart
              className="w-12 h-12 text-muted-foreground mx-auto mb-3"
              aria-hidden="true"
            />
            <p className="text-muted-foreground text-lg">
              Votre panier est vide. Ajoutez des produits ci-dessus.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-w-lg">
            {cart.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 rounded-xl bg-card border-2 border-border"
              >
                <div>
                  <p className="font-semibold text-foreground">
                    {item.product_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    x{item.quantity} • {item.price.toFixed(3)} TND/u
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-foreground">
                    {item.total.toFixed(3)} TND
                  </span>
                  <AccessibleButton
                    onClick={() => handleRemoveFromCart(item.product_name)}
                    variant="destructive"
                    className="p-2"
                    aria-label={`Retirer ${item.product_name}`}
                  >
                    <X size={16} />
                  </AccessibleButton>
                </div>
              </div>
            ))}
            <div className="pt-4 border-t border-border mt-4">
              <div className="flex justify-between items-center text-lg font-bold">
                <span className="text-foreground">Total</span>
                <span className="text-purple-600 dark:text-purple-400">
                  {cartTotal.toFixed(3)} TND
                </span>
              </div>
              <AccessibleButton
                variant="primary"
                className="w-full mt-4"
                onClick={() => {
                  const msg = `Commande de ${cartTotal.toFixed(3)} dinars confirmée.`;
                  setAnnouncement(msg);
                  speak(msg);
                }}
              >
                Commander
              </AccessibleButton>
            </div>
          </div>
        )}
      </Section>
    </PageLayout>
  );
};

export default ShoppingPage;
