'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { productsAPI } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import toast from 'react-hot-toast';

const ProductCard = ({ product, index }) => {
  const { addToCart } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const hasSalePrice =
    typeof product.salePrice === 'number' && product.salePrice > 0 && product.salePrice < product.price;
  const finalPrice = hasSalePrice ? product.salePrice : product.price;

  const handleAddToCart = async () => {
    setIsAdding(true);
    const result = await addToCart(product._id);
    setIsAdding(false);
    if (result.success) {
      toast.success('Added to cart!');
    } else {
      toast.error(result.message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="card group overflow-hidden"
    >
      <Link href={`/product/${product._id}`}>
        <div className="relative aspect-[3/4] overflow-hidden bg-luxury-charcoal">
          <img
            src={product.images[0] || '/images/placeholder.jpg'}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <span className="text-white text-sm uppercase tracking-wider border border-white px-4 py-2">
              View Details
            </span>
          </div>
          {product.stock === 0 && (
            <div className="absolute top-4 right-4 bg-red-500 text-white text-xs px-3 py-1 uppercase">
              Out of Stock
            </div>
          )}
        </div>
      </Link>
      <div className="p-4">
        <p className="text-gold-500 text-xs uppercase tracking-wider mb-1">
          {product.category}
        </p>
        <Link href={`/product/${product._id}`}>
          <h3 className="font-serif text-lg text-white mb-2 group-hover:text-gold-500 transition-colors">
            {product.name}
          </h3>
        </Link>
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-white font-semibold">₹{finalPrice.toLocaleString()}</span>
            {hasSalePrice && (
              <span className="text-gray-500 line-through text-sm">₹{product.price.toLocaleString()}</span>
            )}
          </div>
          <div className="flex items-center space-x-1">
            <svg className="w-4 h-4 text-gold-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-gray-400 text-sm">{product.rating.toFixed(1)}</span>
          </div>
        </div>
        <button
          onClick={handleAddToCart}
          disabled={isAdding || product.stock === 0}
          className="w-full mt-4 bg-gold-500 text-luxury-black py-2 text-sm uppercase tracking-wider hover:bg-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAdding ? 'Adding...' : product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </motion.div>
  );
};

const ShopPage = () => {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(categoryParam || 'all');
  const [sort, setSort] = useState('newest');
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ totalPages: 1, currentPage: 1 });
  const [showFilters, setShowFilters] = useState(false);

  const categories = [
    { name: 'All', slug: 'all' },
    { name: 'Handbags', slug: 'handbags' },
    { name: 'Trolley Luggage', slug: 'trolley-luggage' },
    { name: 'Travel Bags', slug: 'travel-bags' },
    { name: 'Backpacks', slug: 'backpacks' },
  ];

  useEffect(() => {
    fetchProducts();
  }, [category, sort, pagination.currentPage]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {
        category: category === 'all' ? '' : category,
        sort,
        page: pagination.currentPage,
        limit: 12,
      };
      const res = await productsAPI.getAll(params);
      setProducts(res.data.products);
      setPagination({
        totalPages: res.data.totalPages,
        currentPage: res.data.currentPage,
      });
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Implement search
  };

  return (
    <div className="pt-24 pb-20 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="font-serif text-4xl lg:text-5xl text-white mb-4">Our Collection</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Discover our premium range of bags, each crafted with precision and designed for the discerning buyer
          </p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <div className={`lg:w-64 ${showFilters ? 'block' : 'hidden'} lg:block`}>
            <div className="bg-luxury-dark border border-gray-800 p-6 sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-serif text-xl text-white">Filters</h3>
                <button
                  onClick={() => setShowFilters(false)}
                  className="lg:hidden text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Categories */}
              <div className="mb-8">
                <h4 className="text-white text-sm uppercase tracking-wider mb-4">Category</h4>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.slug}
                      onClick={() => { setCategory(cat.slug); setPagination(p => ({ ...p, currentPage: 1 })); }}
                      className={`block w-full text-left px-3 py-2 text-sm transition-colors ${
                        category === cat.slug
                          ? 'text-gold-500 bg-luxury-charcoal'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range (placeholder) */}
              <div>
                <h4 className="text-white text-sm uppercase tracking-wider mb-4">Price Range</h4>
                <div className="space-y-2">
                  <button className="block w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white">
                    Under ₹1,000
                  </button>
                  <button className="block w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white">
                    ₹1,000 - ₹5,000
                  </button>
                  <button className="block w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white">
                    ₹5,000 - ₹10,000
                  </button>
                  <button className="block w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white">
                    Above ₹10,000
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <button
                onClick={() => setShowFilters(true)}
                className="lg:hidden flex items-center space-x-2 text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                <span>Filters</span>
              </button>

              <p className="text-gray-400 text-sm">
                Showing {products.length} products
              </p>

              <div className="flex items-center space-x-4">
                <form onSubmit={handleSearch} className="hidden sm:flex">
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input-field w-48 text-sm py-2"
                  />
                </form>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  className="bg-luxury-charcoal border border-gray-700 text-white px-4 py-2 text-sm focus:outline-none focus:border-gold-500"
                >
                  <option value="newest">Newest</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Top Rated</option>
                </select>
              </div>
            </div>

            {/* Products */}
            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="card animate-pulse">
                    <div className="aspect-[3/4] bg-luxury-charcoal"></div>
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-luxury-charcoal rounded w-1/3"></div>
                      <div className="h-5 bg-luxury-charcoal rounded w-2/3"></div>
                      <div className="h-4 bg-luxury-charcoal rounded w-1/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-400 text-lg">No products found</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product, index) => (
                  <ProductCard key={product._id} product={product} index={index} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center mt-12 space-x-2">
                <button
                  onClick={() => setPagination(p => ({ ...p, currentPage: p.currentPage - 1 }))}
                  disabled={pagination.currentPage === 1}
                  className="px-4 py-2 border border-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:border-gold-500 transition-colors"
                >
                  Previous
                </button>
                {[...Array(pagination.totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPagination(p => ({ ...p, currentPage: i + 1 }))}
                    className={`px-4 py-2 border transition-colors ${
                      pagination.currentPage === i + 1
                        ? 'border-gold-500 bg-gold-500 text-luxury-black'
                        : 'border-gray-700 text-white hover:border-gold-500'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setPagination(p => ({ ...p, currentPage: p.currentPage + 1 }))}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="px-4 py-2 border border-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:border-gold-500 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShopPage;
