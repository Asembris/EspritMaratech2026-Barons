'use client';

import { useState, useEffect } from 'react';
import { getProducts, getCart, addToCart } from '@/lib/api';
import { ShoppingBag, ShoppingCart, Plus, Search, Tag, Package, X } from 'lucide-react';
import { useHoverSpeech } from '@/hooks/useHoverSpeech';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';

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

export default function StorePage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { onHover } = useHoverSpeech();
    const { user, isLoading: isUserLoading } = useUser();
    const router = useRouter();

    const fetchOnlyCart = async () => {
        if (!user) return;
        try {
            const cartData = await getCart();
            setCart(cartData);
        } catch (error) {
            console.error("Error refreshing cart:", error);
        }
    };

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/login');
            return;
        }

        async function fetchData() {
            if (!user) return;
            try {
                const [prodData, cartData] = await Promise.all([
                    getProducts(),
                    getCart()
                ]);
                setProducts(prodData);
                setCart(cartData);
            } catch (error) {
                console.error("Error fetching store data:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();

        // Listen for cart updates from Assistant
        window.addEventListener('cartUpdated', fetchOnlyCart);
        return () => window.removeEventListener('cartUpdated', fetchOnlyCart);
    }, [user, isUserLoading, router]);

    const handleAddToCart = async (product: Product) => {
        if (!user) return;
        try {
            await addToCart(user.id, product.name, 1);
            // Refresh cart
            const updatedCart = await getCart();
            setCart(updatedCart);
            onHover(`${product.name} ajouté au panier`);
        } catch (error) {
            console.error("Error adding to cart:", error);
        }
    };

    const handleRemoveFromCart = async (productName: string) => {
        if (!user) return;
        try {
            await import('@/lib/api').then(m => m.removeFromCart(user.id, productName));
            fetchOnlyCart();
            onHover(`${productName} retiré du panier`);
        } catch (error) {
            console.error("Error removing from cart:", error);
        }
    };

    const cartTotal = cart.reduce((acc, item) => acc + item.total, 0);

    if (loading || isUserLoading) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Chargement...</div>;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6 pb-24">
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-purple-400 mb-2">Le Magasin</h1>
                    <p className="text-gray-400">Découvrez nos produits et faites votre shopping.</p>
                </div>

                {/* Cart Summary Widget */}
                <div
                    className="bg-purple-900/30 border border-purple-500/30 rounded-xl p-4 flex items-center gap-6"
                    onMouseEnter={() => onHover(`Panier : ${cart.length} articles, total ${cartTotal.toFixed(3)} dinars`)}
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-purple-500/20 p-2 rounded-lg">
                            <ShoppingCart className="text-purple-400" />
                        </div>
                        <div>
                            <p className="font-medium text-purple-200">Mon Panier</p>
                            <p className="text-sm text-gray-400">{cart.length} articles</p>
                        </div>
                    </div>
                    <div className="h-8 w-[1px] bg-purple-500/30"></div>
                    <span className="text-2xl font-bold text-white">{cartTotal.toFixed(3)} TND</span>
                </div>
            </header>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Products Grid */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {products.map((product) => (
                        <div
                            key={product.id}
                            className="bg-gray-800 rounded-2xl p-5 border border-gray-700 shadow-xl hover:border-purple-500/50 transition-all group flex flex-col"
                            onMouseEnter={() => onHover(`Produit : ${product.name}, ${product.price} dinars. ${product.description}`)}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-gray-700/50 p-2 rounded-lg">
                                    <Package className="w-6 h-6 text-gray-400" />
                                </div>
                                <span className="bg-purple-500/10 text-purple-300 text-xs px-2 py-1 rounded-full font-medium border border-purple-500/20">
                                    {product.category}
                                </span>
                            </div>

                            <h3 className="font-bold text-lg mb-1">{product.name}</h3>
                            <p className="text-sm text-gray-400 mb-4 line-clamp-2 flex-1">{product.description}</p>

                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-700">
                                <div>
                                    <p className="text-xs text-gray-500 mb-0.5">Prix</p>
                                    <span className="text-xl font-bold text-white">{product.price.toFixed(3)} TND</span>
                                </div>
                                <button
                                    onClick={() => handleAddToCart(product)}
                                    className="p-3 bg-purple-600 hover:bg-purple-500 rounded-xl text-white transition-all shadow-lg shadow-purple-900/20 active:scale-95"
                                    aria-label={`Ajouter ${product.name} au panier`}
                                    onMouseEnter={() => onHover("Ajouter au panier")}
                                >
                                    <Plus size={20} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Cart Details Sidebar */}
                <div className="lg:w-96">
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sticky top-8">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <ShoppingCart className="text-purple-400" />
                            Détails du Panier
                        </h2>
                        {cart.length === 0 ? (
                            <p className="text-gray-500 text-center py-8">Votre panier est vide</p>
                        ) : (
                            <div className="space-y-3">
                                {cart.map((item, i) => (
                                    <div key={i} className="flex justify-between items-center bg-gray-800/50 p-3 rounded-xl border border-gray-700/50">
                                        <div>
                                            <p className="font-medium text-sm">{item.product_name}</p>
                                            <p className="text-xs text-gray-500">x{item.quantity} • {item.price.toFixed(3)} TND/u</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-sm">{item.total.toFixed(3)} TND</span>
                                            <button
                                                onClick={() => handleRemoveFromCart(item.product_name)}
                                                className="text-red-400 hover:text-red-300 p-1 rounded-lg hover:bg-red-900/20"
                                                aria-label={`Retirer ${item.product_name}`}
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <div className="pt-4 border-t border-gray-700 mt-4">
                                    <div className="flex justify-between items-center text-lg font-bold">
                                        <span>Total</span>
                                        <span className="text-purple-400">{cartTotal.toFixed(3)} TND</span>
                                    </div>
                                    <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl mt-4 transition-colors">
                                        Commander
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

