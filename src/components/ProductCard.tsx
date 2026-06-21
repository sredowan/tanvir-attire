import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, Plus, Percent } from 'lucide-react';
import { Product, StoreConfig } from '../types';
import {
  productSizes,
  sizeInStock,
  totalStock,
  effectivePrice,
  comparePrice,
  discountPercent,
  isPurchasable,
} from '../lib/products';
import { categoryTagline } from '../lib/categories';

interface ProductCardProps {
  product: Product;
  config?: StoreConfig;
  onViewDetails: (product: Product) => void;
  onQuickAdd: (product: Product, size: string) => void;
}

export default function ProductCard({ product, config, onViewDetails, onQuickAdd }: ProductCardProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showQuickSizes, setShowQuickSizes] = useState(false);

  const discount = discountPercent(product);
  const compare = comparePrice(product);
  const price = effectivePrice(product);
  const stock = totalStock(product);
  const purchasable = isPurchasable(product);
  const sizes = productSizes(product);

  return (
    <motion.div
      id={`product-card-${product.id}`}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.55 }}
      onMouseEnter={() => {
        if (product.images.length > 1) setActiveImageIndex(1);
      }}
      onMouseLeave={() => {
        setActiveImageIndex(0);
        setShowQuickSizes(false);
      }}
      className="group relative flex flex-col bg-[#03100e] border border-[#E6B579]/10 hover:border-[#E6B579]/35 hover:shadow-[0_10px_40px_-12px_rgba(230,181,121,0.25)] transition-all duration-500"
    >
      {/* Media */}
      <div
        className="relative overflow-hidden aspect-[3/4] bg-[#06211E] cursor-pointer"
        onClick={() => onViewDetails(product)}
      >
        {product.images[0] ? (
          <img
            src={product.images[activeImageIndex] || product.images[0]}
            alt={product.name}
            referrerPolicy="no-referrer"
            loading="lazy"
            className={`w-full h-full object-cover transition-transform duration-[1100ms] ease-out group-hover:scale-105 ${
              purchasable ? '' : 'grayscale-[0.4] opacity-80'
            }`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#E6B579]/30 font-mono text-[10px] uppercase tracking-widest">
            No Image
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
          {product.badge && (
            <span className="px-3 py-1 bg-amber-500 text-[#06211E] text-[9px] font-mono font-bold uppercase tracking-widest shadow-sm">
              {product.badge}
            </span>
          )}
          {discount > 0 && (
            <span className="px-3 py-1 bg-[#E6B579] text-[#06211E] text-[9px] font-mono font-bold uppercase tracking-widest flex items-center gap-1 shadow-sm">
              <Percent className="w-2.5 h-2.5" />
              <span>{discount}% Off</span>
            </span>
          )}
        </div>

        {/* Stock signal */}
        {purchasable && stock <= 5 && stock > 0 && (
          <div className="absolute top-3 right-3 z-10 px-2 py-1 bg-rose-950/80 border border-rose-500/30 backdrop-blur-sm text-[8px] text-rose-300 font-mono tracking-widest uppercase">
            Only {stock} left
          </div>
        )}

        {/* Sold-out overlay */}
        {!purchasable && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#03100e]/55">
            <span className="px-4 py-2 border border-[#E6B579]/40 bg-[#03100e]/80 text-[#E6B579] text-[10px] font-mono uppercase tracking-[0.25em]">
              {product.status === 'draft' ? 'Coming Soon' : 'Sold Out'}
            </span>
          </div>
        )}

        {/* Hover quick-view */}
        {purchasable && (
          <div className="absolute inset-0 bg-[#06211E]/35 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <button
              id={`view-details-${product.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails(product);
              }}
              className="p-3 bg-white/10 hover:bg-[#E6B579] text-white hover:text-[#06211E] backdrop-blur-md rounded-full transition-all transform scale-90 group-hover:scale-100 duration-300 focus:outline-none"
              title="View details"
            >
              <Eye className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Quick-add size tray */}
        <AnimatePresence>
          {showQuickSizes && purchasable && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="absolute bottom-0 left-0 right-0 bg-[#03100e]/95 backdrop-blur-md border-t border-[#E6B579]/20 p-4 z-30 text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-[10px] text-gray-400 font-mono tracking-wider uppercase mb-2.5">Select size</p>
              <div className="flex flex-wrap justify-center gap-2">
                {sizes.map((size) => {
                  const inStock = sizeInStock(product, size);
                  return (
                    <button
                      key={size}
                      id={`quick-size-${product.id}-${size}`}
                      disabled={!inStock}
                      onClick={() => {
                        if (!inStock) return;
                        onQuickAdd(product, size);
                        setShowQuickSizes(false);
                      }}
                      className={`px-3 py-1.5 border text-xs font-mono font-medium tracking-widest transition-all ${
                        inStock
                          ? 'border-[#E6B579]/30 hover:border-[#E6B579] hover:bg-[#E6B579]/10 text-white'
                          : 'border-white/5 text-gray-600 line-through cursor-not-allowed'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setShowQuickSizes(false)}
                className="mt-3 text-[9px] text-[#E6B579] font-mono tracking-widest uppercase hover:underline"
              >
                Cancel
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div className="cursor-pointer" onClick={() => onViewDetails(product)}>
          <span className="text-[10px] font-mono text-[#E6B579]/70 tracking-widest uppercase">
            {categoryTagline(config, product.category)}
          </span>
          <h3 className="font-serif text-lg font-light text-white tracking-[0.03em] mt-1 group-hover:text-[#E6B579] transition-colors leading-snug line-clamp-2">
            {product.name}
          </h3>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm font-mono font-medium text-[#E6B579]">${price.toFixed(2)} AUD</span>
            {compare && (
              <span className="text-[11px] font-mono text-gray-500 line-through">${compare.toFixed(2)}</span>
            )}
          </div>
        </div>

        {/* Action bar */}
        <div className="mt-4 pt-3 border-t border-[#E6B579]/5 flex items-center justify-between">
          <button
            id={`inspect-details-btn-${product.id}`}
            onClick={() => onViewDetails(product)}
            className="text-[10px] uppercase tracking-widest text-gray-400 hover:text-white transition-all font-sans font-medium hover:underline"
          >
            View Details
          </button>

          {purchasable ? (
            !showQuickSizes && (
              <button
                id={`quick-add-btn-${product.id}`}
                onClick={() => setShowQuickSizes(true)}
                className="px-3 py-2 bg-[#E6B579]/10 hover:bg-[#E6B579] text-[#E6B579] hover:text-[#06211E] text-[10px] font-bold uppercase tracking-widest transition-all duration-300 flex items-center gap-1.5 focus:outline-none"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            )
          ) : (
            <span className="px-3 py-2 text-[10px] font-mono uppercase tracking-widest text-gray-600">
              Unavailable
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
