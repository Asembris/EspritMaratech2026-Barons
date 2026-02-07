'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    getVectorProducts,
    searchVectorProducts,
    getVectorCollectionInfo,
    getVectorProductImageUrl,
    VectorProduct,
    VectorCollectionInfo
} from '@/lib/api';
import { Search, Package, Database, Loader2, Image as ImageIcon } from 'lucide-react';

export default function ProductsPage() {
    const [products, setProducts] = useState<VectorProduct[]>([]);
    const [collectionInfo, setCollectionInfo] = useState<VectorCollectionInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Load initial products
    useEffect(() => {
        async function fetchData() {
            try {
                const [productsData, info] = await Promise.all([
                    getVectorProducts(50, 0),
                    getVectorCollectionInfo()
                ]);
                setProducts(productsData);
                setCollectionInfo(info);
            } catch (err) {
                setError('Erreur de connexion à Qdrant');
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    // Debounced search
    const handleSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            // Reset to all products
            setLoading(true);
            const data = await getVectorProducts(50, 0);
            setProducts(data);
            setLoading(false);
            return;
        }

        setSearching(true);
        try {
            const results = await searchVectorProducts(query, 20);
            setProducts(results);
        } catch (err) {
            console.error(err);
        } finally {
            setSearching(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            handleSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, handleSearch]);

    // Parse price string to show properly
    const formatPrice = (price: string | null) => {
        if (!price) return 'N/A';
        // Remove "DT" and format
        return price.replace('DT', 'TND').replace(',', '.');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Chargement des produits...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center text-red-400">
                    <Database className="w-12 h-12 mx-auto mb-4" />
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            {/* Header with Collection Info */}
            <header className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-purple-400 mb-2">
                            🛒 Catalogue Produits
                        </h1>
                        <p className="text-gray-400">
                            Recherche sémantique alimentée par IA (Qdrant + SigLIP)
                        </p>
                    </div>

                    {collectionInfo && (
                        <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 flex items-center gap-3">
                            <Database className="text-green-400" size={20} />
                            <div className="text-sm">
                                <span className="text-gray-400">Collection: </span>
                                <span className="font-medium text-white">{collectionInfo.name}</span>
                                <span className="text-gray-500 ml-2">
                                    ({collectionInfo.points_count?.toLocaleString()} produits)
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Search Bar */}
                <div className="relative max-w-2xl">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Rechercher un produit... (ex: chocolat, pâtes, harissa)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none transition-colors"
                    />
                    {searching && (
                        <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-400 animate-spin" size={20} />
                    )}
                </div>

                {searchQuery && (
                    <p className="text-sm text-gray-500 mt-2">
                        {products.length} résultats pour "{searchQuery}"
                    </p>
                )}
            </header>

            {/* Products Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {products.map((product, index) => (
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
                                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                    }}
                                />
                            ) : null}
                            <div className={`absolute inset-0 flex items-center justify-center ${product.image_file ? 'hidden' : ''}`}>
                                <ImageIcon className="w-12 h-12 text-gray-600" />
                            </div>

                            {/* Score badge for search results */}
                            {product.score !== undefined && product.score !== null && (
                                <div className="absolute top-2 right-2 bg-purple-600/90 text-white text-xs px-2 py-1 rounded-full">
                                    {(product.score * 100).toFixed(0)}%
                                </div>
                            )}
                        </div>

                        {/* Product Info */}
                        <div className="p-3">
                            <p className="text-xs text-purple-400 font-medium mb-1 truncate">
                                {product.brand || 'Sans marque'}
                            </p>
                            <h3 className="font-medium text-sm mb-2 line-clamp-2 h-10">
                                {product.name || 'Produit'}
                            </h3>
                            <div className="flex items-center justify-between">
                                <span className="text-lg font-bold text-green-400">
                                    {formatPrice(product.price)}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {products.length === 0 && !loading && (
                <div className="text-center py-16">
                    <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">Aucun produit trouvé</p>
                </div>
            )}
        </div>
    );
}
