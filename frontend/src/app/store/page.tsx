'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    getCart,
    addToCart,
    getVectorProducts,
    searchVectorProducts,
    searchProductsByImage,
    getVectorProductImageUrl,
    VectorProduct
} from '@/lib/api';
import { ShoppingCart, Plus, Search, Package, X, Loader2, Image as ImageIcon, ChevronLeft, ChevronRight, Camera, Upload } from 'lucide-react';
import { useHoverSpeech } from '@/hooks/useHoverSpeech';
import { useUser } from '@/context/UserContext';
import { useRouter } from 'next/navigation';

interface CartItem {
    product_name: string;
    price: number;
    quantity: number;
    total: number;
}

const ITEMS_PER_PAGE = 24;

export default function StorePage() {
    const [vectorProducts, setVectorProducts] = useState<VectorProduct[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);

    // Image Search State
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Pagination state
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const { onHover } = useHoverSpeech();
    const { user, isLoading: isUserLoading } = useUser();
    const router = useRouter();

    const fetchOnlyCart = async () => {
        if (!user) return;
        try {
            const cartData = await getCart(user.id);
            setCart(cartData);
        } catch (error) {
            console.error("Error refreshing cart:", error);
        }
    };

    // Initial load
    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/login');
            return;
        }

        async function fetchData() {
            if (!user) return;
            try {
                const [cartData, vectorData] = await Promise.all([
                    getCart(user.id),
                    getVectorProducts(ITEMS_PER_PAGE, 0)
                ]);
                setCart(cartData);
                setVectorProducts(vectorData);
                setHasMore(vectorData.length === ITEMS_PER_PAGE);
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

    // Handle pagination change
    const handlePageChange = async (newPage: number) => {
        setLoading(true);
        try {
            const offset = (newPage - 1) * ITEMS_PER_PAGE;
            const data = await getVectorProducts(ITEMS_PER_PAGE, offset);
            setVectorProducts(data);
            setPage(newPage);
            setHasMore(data.length === ITEMS_PER_PAGE);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (error) {
            console.error("Error changing page:", error);
        } finally {
            setLoading(false);
        }
    };

    // Vector search handler (Text)
    const handleSearch = useCallback(async (query: string) => {
        // If image is selected, ignore text search clearing (or handle mixed search if desired)
        if (selectedImage) return;

        if (!query.trim()) {
            // Reset to first page of default products
            setLoading(true);
            try {
                const data = await getVectorProducts(ITEMS_PER_PAGE, 0);
                setVectorProducts(data);
                setPage(1);
                setHasMore(data.length === ITEMS_PER_PAGE);
            } finally {
                setLoading(false);
            }
            return;
        }

        setSearching(true);
        try {
            // For search, we currently get top 50 matches (no pagination for search yet)
            const results = await searchVectorProducts(query, 50);
            setVectorProducts(results);
            setPage(1);
            setHasMore(false); // Disable pagination for search results for now
        } catch (err) {
            console.error(err);
        } finally {
            setSearching(false);
        }
    }, [selectedImage]);

    useEffect(() => {
        const timer = setTimeout(() => {
            handleSearch(searchQuery);
        }, 500); // 500ms debounce
        return () => clearTimeout(timer);
    }, [searchQuery, handleSearch]);

    // Image Search Handlers
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset text search
        setSearchQuery("");
        setSelectedImage(file);

        // Create preview
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);

        setSearching(true);
        try {
            const results = await searchProductsByImage(file, 10); // Search top 10 as requested
            setVectorProducts(results);
            setPage(1);
            setHasMore(false);
        } catch (error) {
            console.error("Image search error:", error);
        } finally {
            setSearching(false);
        }
    };

    const clearImageSearch = async () => {
        setSelectedImage(null);
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }

        // Reset to default view
        setLoading(true);
        try {
            const data = await getVectorProducts(ITEMS_PER_PAGE, 0);
            setVectorProducts(data);
            setPage(1);
            setHasMore(data.length === ITEMS_PER_PAGE);
        } finally {
            setLoading(false);
        }
    };

    const handleAddToCart = async (product: VectorProduct) => {
        if (!user || !product.name) return;
        try {
            await addToCart(user.id, product.name, 1);
            const updatedCart = await getCart(user.id);
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

    // Format price string
    const formatPrice = (price: string | null) => {
        if (!price) return 'N/A';
        return price.replace('DT', 'TND').replace(',', '.').replace('Â', '').trim();
    };

    const cartTotal = cart.reduce((acc, item) => acc + item.total, 0);

    if (loading && page === 1 && !vectorProducts.length) return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">Chargement...</div>;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6 pb-24">
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-purple-400 mb-2">Le Magasin</h1>
                    <p className="text-gray-400">Découvrez nos produits et faites votre shopping.</p>
                </div>

                {/* Cart Summary Widget */}
                <div
                    className="bg-purple-900/30 border border-purple-500/30 rounded-xl p-4 flex items-center gap-6 focus-visible-ring cursor-pointer"
                    onMouseEnter={() => onHover(`Panier : ${cart.length} articles, total ${cartTotal.toFixed(3)} dinars`)}
                    tabIndex={0}
                    role="button"
                    aria-label={`Résumé du panier : ${cart.length} articles, total ${cartTotal.toFixed(3)} dinars`}
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

            {/* Search & Image Upload Area */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1 max-w-2xl">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="🔍 Recherche IA... (ex: chocolat, pâtes, harissa)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        disabled={!!selectedImage}
                        className={`w-full bg-gray-800 border border-gray-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors ${selectedImage ? 'opacity-50 cursor-not-allowed' : ''}`}
                    />
                    {searching && (
                        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-400 animate-spin" size={20} />
                    )}
                </div>

                {/* Image Upload Button */}
                <div className="flex items-center gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 px-4 py-3 rounded-xl transition-colors"
                        title="Recherche par image"
                    >
                        <Camera className="text-purple-400" size={20} />
                        <span className="hidden sm:inline">Recherche par photo</span>
                    </button>
                </div>
            </div>

            {/* Image Preview (if active) */}
            {previewUrl && (
                <div className="mb-8 p-4 bg-gray-800/50 rounded-xl border border-purple-500/30 inline-flex items-start gap-4 animate-in fade-in slide-in-from-top-4">
                    <div className="relative group">
                        <img
                            src={previewUrl}
                            alt="Recherche"
                            className="w-32 h-32 object-cover rounded-lg border-2 border-purple-500 shadow-lg shadow-purple-900/20"
                        />
                        <button
                            onClick={clearImageSearch}
                            className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full shadow-md transition-transform hover:scale-110"
                            title="Supprimer la photo"
                        >
                            <X size={16} />
                        </button>
                    </div>
                    <div className="py-2">
                        <h3 className="font-bold text-lg text-purple-300">Recherche visuelle active</h3>
                        <p className="text-gray-400 text-sm">Voici les produits similaires à votre photo.</p>
                        {searching && <p className="text-purple-400 text-xs mt-2 flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Analyse...</p>}
                    </div>
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Products Grid */}
                <div className="flex-1">
                    {/* Results Header */}
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-purple-300">
                            {searchQuery ? `Résultats pour "${searchQuery}"` : selectedImage ? 'Résultats visuels' : 'Catalogue Produits'}
                            {!searchQuery && !selectedImage && <span className="text-sm font-normal text-gray-500 ml-2">(Page {page})</span>}
                        </h2>
                    </div>

                    {loading && searching ? (
                        <div className="text-center py-12">
                            <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-2" />
                            <p className="text-gray-400">Recherche en cours...</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 mb-8">
                                {vectorProducts.map((product, index) => (
                                    <div
                                        key={product.product_id || index}
                                        className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-purple-500/50 transition-all group"
                                    >
                                        {/* Product Image */}
                                        <div className="aspect-square bg-gray-700 relative overflow-hidden">
                                            {product.image_file && product.category_folder ? (
                                                <img
                                                    src={getVectorProductImageUrl(product.category_folder, product.image_file) || ''}
                                                    alt={product.name || 'Product'}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <ImageIcon className="w-12 h-12 text-gray-600" />
                                                </div>
                                            )}

                                            {/* Score badge */}
                                            {product.score !== undefined && product.score !== null && (
                                                <div className="absolute top-2 right-2 bg-purple-600/90 text-white text-xs px-2 py-1 rounded-full">
                                                    {(product.score * 100).toFixed(0)}%
                                                </div>
                                            )}

                                            {/* Add Button Overlay */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleAddToCart(product);
                                                }}
                                                className="absolute bottom-2 right-2 p-2 bg-purple-600 hover:bg-purple-500 rounded-full text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-110"
                                                aria-label={`Ajouter ${product.name} au panier`}
                                            >
                                                <Plus size={20} />
                                            </button>
                                        </div>

                                        {/* Product Info */}
                                        <div className="p-3">
                                            <p className="text-xs text-purple-400 font-medium mb-1 truncate">
                                                {product.brand || 'Sans marque'}
                                            </p>
                                            <h3 className="font-medium text-sm mb-2 line-clamp-2 h-10" title={product.name || ''}>
                                                {product.name || 'Produit'}
                                            </h3>
                                            <span className="text-lg font-bold text-green-400">
                                                {formatPrice(product.price)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination Controls */}
                            {!searchQuery && !selectedImage && (
                                <div className="flex justify-center items-center gap-4 mt-8 pt-4 border-t border-gray-800">
                                    <button
                                        onClick={() => handlePageChange(page - 1)}
                                        disabled={page === 1 || loading}
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors border border-gray-700"
                                    >
                                        <ChevronLeft size={20} />
                                        Précédent
                                    </button>

                                    <span className="text-gray-400">Page {page}</span>

                                    <button
                                        onClick={() => handlePageChange(page + 1)}
                                        disabled={!hasMore || loading}
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors border border-gray-700"
                                    >
                                        Suivant
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
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
