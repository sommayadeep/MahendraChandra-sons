'use client';
import { motion } from 'framer-motion';

const AboutPage = () => {
  const yearsInBusiness = new Date().getFullYear() - 2014;

  return (
    <div className="pt-24 pb-20 min-h-screen">
      {/* Hero */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-luxury-black via-luxury-dark to-luxury-black"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <p className="text-gold-500 uppercase tracking-[0.3em] mb-4">Est. 2014</p>
            <h1 className="font-serif text-4xl lg:text-6xl text-white mb-6">
              Our <span className="text-gold-500">Story</span>
            </h1>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              From curated third-party products to our own in-house designs
            </p>
          </motion.div>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 bg-luxury-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
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
                <div className="absolute -top-8 -left-8 w-32 h-32 bg-gold-500/10 rounded-full blur-2xl"></div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
            >
              <h2 className="font-serif text-3xl text-white mb-6">
                Building Our <span className="text-gold-500">Own Designs</span>
              </h2>
              <div className="space-y-4 text-gray-400 leading-relaxed">
                <p>
                  Since 2014, Mahendra Chandra & Sons has served customers with carefully selected third-party bags and luggage.
                </p>
                <p>
                  We are now starting a new phase of business: building our own products with original designs under our own label.
                </p>
                <p>
                  Our plan is to launch many new in-house designs step by step, with a major expansion target by 2030.
                </p>
                <p>
                  During this journey, we will continue offering third-party products while growing our own collection responsibly.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-8">
                <div className="text-center">
                  <p className="text-3xl font-serif text-gold-500">{yearsInBusiness}+</p>
                  <p className="text-gray-400 text-sm">Years</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-serif text-gold-500">50K+</p>
                  <p className="text-gray-400 text-sm">Customers</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-serif text-gold-500">0</p>
                  <p className="text-gray-400 text-sm">Own Designs Yet</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-luxury-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h2 className="font-serif text-3xl text-white mb-4">Our Values</h2>
            <div className="w-24 h-1 bg-gold-500 mx-auto"></div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: 'Transparency', desc: 'Clear communication about what is third-party and what is in-house' },
              { title: 'Design Growth', desc: 'Continuous work on original products and new collections up to 2030' },
              { title: 'Customer Trust', desc: 'Reliable quality and service while we scale our own label' },
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="card p-8 text-center"
              >
                <h3 className="font-serif text-xl text-gold-500 mb-4">{item.title}</h3>
                <p className="text-gray-400">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
