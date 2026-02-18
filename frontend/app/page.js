'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { productsAPI } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import toast from 'react-hot-toast';

const ProductCard = ({ product, index }) => {
  const { addToCart } = useCart();
  const [isAdding, setIsAdding] = useState(false);
  const productImage = product?.images?.[0] || product?.image || '/images/placeholder.jpg';
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
      transition={{ delay: index * 0.1 }}
      className="card group overflow-hidden"
    >
      <Link href={`/product/${product._id}`}>
        <div className="relative aspect-[3/4] overflow-hidden bg-luxury-charcoal">
          <img
            src={productImage}
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

const HomePage = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await productsAPI.getFeatured();
        const featured = res.data.products || [];
        if (featured.length > 0) {
          setFeaturedProducts(featured);
          return;
        }

        // Fallback for stores that haven't manually marked featured products yet.
        const fallbackRes = await productsAPI.getAll({ limit: 8, sort: 'newest' });
        setFeaturedProducts(fallbackRes.data.products || []);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const categories = [
    { name: 'Handbags', slug: 'handbags', image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400' },
    { name: 'Trolley Luggage', slug: 'trolley-luggage', image: 'https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=400' },
    { name: 'Travel Bags', slug: 'travel-bags', image: 'https://images.unsplash.com/photo-1501554728187-ce583db33af7?w=400&auto=format&fit=crop' },
    { name: 'Backpacks', slug: 'backpacks', image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&auto=format&fit=crop' },
  ];

  const features = [
    { icon: '🏆', title: 'Quality Focus', desc: 'Carefully selected products with reliable build quality' },
    { icon: '🚚', title: 'Free Shipping', desc: 'On orders above ₹5000' },
    { icon: '↩️', title: '7-Day Exchange', desc: 'Exchange only within 7 days' },
    { icon: '💎', title: 'Design Vision', desc: 'Strong focus on original in-house design direction' },
  ];

  const testimonials = featuredProducts
    .flatMap((product) =>
      (product.reviews || []).map((review) => ({
        id: `${product._id}-${review.createdAt}-${review.user || review.name}`,
        name: review.name,
        text: review.comment,
        rating: Number(review.rating) || 0,
      }))
    )
    .filter((review) => review.name && review.text && review.rating > 0)
    .slice(0, 6);

  return (
    <div className="pt-20">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-luxury-black via-luxury-dark to-luxury-black">
          <div className="absolute inset-0 bg-[url('/images/hero-pattern.png')] opacity-5"></div>
        </div>
        <div className="absolute top-20 right-0 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-0 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <p className="text-gold-500 uppercase tracking-[0.3em] mb-4">Est. 2014</p>
              <h1 className="font-serif text-5xl lg:text-7xl text-white mb-6 leading-tight">
                Elegance in
                <span className="block text-gold-500">Every Stitch</span>
              </h1>
              <p className="text-gray-400 text-lg mb-8 max-w-lg">
                Discover our premium collection of handbags, trolley luggage, travel bags, and backpacks. Crafted for those who appreciate the finer things in life.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/shop" className="btn-primary">
                  Explore Collection
                </Link>
                <Link href="/about" className="btn-secondary">
                  Our Story
                </Link>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="relative w-full aspect-square">
                <div className="absolute inset-0 border border-gold-500/30 rounded-full"></div>
                <div className="absolute inset-8 border border-gold-500/20 rounded-full"></div>
                <img
                  src="https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600"
                  alt="Premium Bag"
                  className="w-full h-full object-cover rounded-full shadow-2xl shadow-gold-500/20"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Bar */}
      <section className="bg-luxury-charcoal border-y border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl mb-2">{feature.icon}</div>
                <h4 className="text-white font-medium mb-1">{feature.title}</h4>
                <p className="text-gray-500 text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 bg-luxury-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h2 className="font-serif text-4xl text-white mb-4">Shop by Category</h2>
            <div className="w-24 h-1 bg-gold-500 mx-auto"></div>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category, index) => (
              <motion.div
                key={category.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={`/shop?category=${category.slug}`}>
                  <div className="group relative aspect-[4/5] overflow-hidden">
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h3 className="font-serif text-2xl text-white mb-2 group-hover:text-gold-500 transition-colors">
                        {category.name}
                      </h3>
                      <span className="text-gold-500 text-sm uppercase tracking-wider group-hover:translate-x-2 inline-block transition-transform">
                        Shop Now →
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 bg-luxury-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h2 className="font-serif text-4xl text-white mb-4">Featured Collection</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Explore our handpicked selection of premium bags, each crafted with meticulous attention to detail
            </p>
            <div className="w-24 h-1 bg-gold-500 mx-auto mt-4"></div>
          </motion.div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
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
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product, index) => (
                <ProductCard key={product._id} product={product} index={index} />
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Link href="/shop" className="btn-secondary inline-block">
              View All Products
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 bg-luxury-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="relative"
            >
              <div className="relative w-full aspect-square">
                <img
                  src="/images/about-bag.png"
                  alt="Mahendra Chandra and Sons bag"
                  className="w-full h-full object-cover"
                />
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
            >
              <p className="text-gold-500 uppercase tracking-[0.3em] mb-4">Our Journey</p>
              <h2 className="font-serif text-4xl text-white mb-6">
                Building Our <span className="text-gold-500">Own Designs</span>
              </h2>
              <p className="text-gray-400 mb-6 leading-relaxed">
                Since 2014, we have served customers through curated third-party bags and luggage. Now we are starting to build our own products and original designs.
              </p>
              <p className="text-gray-400 mb-8 leading-relaxed">
                Our goal is to launch many more in-house designs by 2030 while continuing to provide trusted options during this transition.
              </p>
              <Link href="/about" className="btn-primary">
                Read More
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-luxury-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h2 className="font-serif text-4xl text-white mb-4">Why Choose Us</h2>
            <div className="w-24 h-1 bg-gold-500 mx-auto"></div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: '📦', title: 'Curated Selection', desc: 'Trusted third-party products chosen for quality and value' },
              { icon: '🎨', title: 'Own Designs in Progress', desc: 'We are actively developing original in-house collections' },
              { icon: '🛡️', title: 'Customer First', desc: 'Consistent service and support as we scale toward 2030' },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="card p-8 text-center"
              >
                <div className="text-5xl mb-4">{item.icon}</div>
                <h3 className="font-serif text-xl text-white mb-3">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-luxury-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h2 className="font-serif text-4xl text-white mb-4">What Our Clients Say</h2>
            <div className="w-24 h-1 bg-gold-500 mx-auto"></div>
          </motion.div>

          {testimonials.length > 0 ? (
            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={testimonial.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="card p-8"
                >
                  <div className="flex mb-4">
                    {[...Array(Math.max(1, Math.min(5, Math.round(testimonial.rating))))].map((_, i) => (
                      <svg key={i} className="w-5 h-5 text-gold-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-400 mb-6 italic">"{testimonial.text}"</p>
                  <p className="text-white font-medium">{testimonial.name}</p>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center text-gray-400">
              No customer reviews yet. Be the first to review a product.
            </div>
          )}
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-20 bg-luxury-dark border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto text-center"
          >
            <h2 className="font-serif text-3xl text-white mb-4">Stay Updated</h2>
            <p className="text-gray-400 mb-8">
              Subscribe to our newsletter for exclusive offers and new arrivals
            </p>
            <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="input-field flex-1"
              />
              <button type="submit" className="btn-primary whitespace-nowrap">
                Subscribe
              </button>
            </form>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
