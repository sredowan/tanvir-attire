import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ShoppingBag, ArrowRight, ArrowLeft, Ruler, Truck, RefreshCw, ShieldCheck } from 'lucide-react';
import { Product, StoreConfig } from '../types';
import {
  productSizes,
  sizeInStock,
  variantForSize,
  effectivePrice,
  comparePrice,
  discountPercent,
  isPurchasable,
  defaultSize,
} from '../lib/products';
import { categoryTagline } from '../lib/categories';
import SizeGuideModal from '../components/SizeGuideModal';
import ImageLightbox from '../components/ImageLightbox';

interface ProductDetailPageProps {
  products: Product[];
  config?: StoreConfig;
  isReady: boolean;
  onAddToCart: (product: Product, size: string) => void;
  onBuyNow: (product: Product, size: string) => void;
}

export default function ProductDetailPage({ products, config, isReady, onAddToCart, onBuyNow }: ProductDetailPageProps) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const product = useMemo(
    () => products.find((p) => p.slug === slug || p.id === slug),
    [products, slug]
  );

  // Loading skeleton while the catalogue is still arriving.
  if (!isReady && !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 lg:pt-28 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="aspect-[3/4] shimmer-bg" />
          <div className="space-y-5 pt-4">
            <div className="h-3 w-1/4 shimmer-bg" />
            <div className="h-8 w-3/4 shimmer-bg" />
            <div className="h-5 w-1/3 shimmer-bg" />
            <div className="h-24 w-full shimmer-bg" />
            <div className="h-12 w-full shimmer-bg" />
          </div>
        </div>
      </div>
    );
  }

  // Not found.
  if (!product) {
    return (
      <div className="max-w-3xl mx-auto px-6 pt-32 pb-32 text-center space-y-6">
        <h1 className="font-serif text-3xl text-white">This piece could not be found</h1>
        <p className="text-sm text-gray-400">It may have sold out or been retired from the atelier vault.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-8 py-4 bg-[#E6B579] text-[#06211E] text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Collection
        </Link>
      </div>
    );
  }

  return <ProductDetail product={product} config={config} navigate={navigate} onAddToCart={onAddToCart} onBuyNow={onBuyNow} />;
}

function ProductDetail({
  product,
  config,
  navigate,
  onAddToCart,
  onBuyNow,
}: {
  product: Product;
  config?: StoreConfig;
  navigate: ReturnType<typeof useNavigate>;
  onAddToCart: (p: Product, s: string) => void;
  onBuyNow: (p: Product, s: string) => void;
}) {
  const sizes = productSizes(product);
  const [selectedSize, setSelectedSize] = useState(defaultSize(product));
  const [activeImage, setActiveImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  const price = effectivePrice(product);
  const compare = comparePrice(product);
  const discount = discountPercent(product);
  const purchasable = isPurchasable(product);
  const selectedInStock = sizeInStock(product, selectedSize);
  const selectedVariant = variantForSize(product, selectedSize);
  const canBuy = purchasable && selectedInStock;

  const categoryLabel = categoryTagline(config, product.category);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 lg:pt-24 pb-28 lg:pb-20">
      {/* Breadcrumb / back */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 mb-6 text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400 hover:text-[#E6B579] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Collection
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14">
        {/* ----------------------------------------------------------------- */}
        {/* LEFT — Gallery                                                    */}
        {/* ----------------------------------------------------------------- */}
        <div className="space-y-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="relative aspect-[3/4] bg-[#03100e] border border-[#E6B579]/15 overflow-hidden cursor-zoom-in group"
            onClick={() => setLightboxOpen(true)}
          >
            <img
              src={product.images[activeImage] || product.images[0]}
              alt={product.name}
              referrerPolicy="no-referrer"
              decoding="async"
              fetchPriority="high"
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
            />
            {discount > 0 && (
              <span className="absolute top-4 left-4 px-3 py-1 bg-[#E6B579] text-[#06211E] text-[10px] font-mono font-bold uppercase tracking-widest">
                {discount}% Off
              </span>
            )}
            {!purchasable && (
              <div className="absolute inset-0 flex items-center justify-center bg-[#03100e]/55">
                <span className="px-4 py-2 border border-[#E6B579]/40 bg-[#03100e]/80 text-[#E6B579] text-[11px] font-mono uppercase tracking-[0.25em]">
                  {product.status === 'draft' ? 'Coming Soon' : 'Sold Out'}
                </span>
              </div>
            )}
          </motion.div>

          {/* Thumbnails */}
          {product.images.length > 1 && (
            <div className="flex gap-3">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`w-20 h-24 overflow-hidden border transition-all ${
                    activeImage === i ? 'border-[#E6B579]' : 'border-[#E6B579]/15 hover:border-[#E6B579]/50'
                  }`}
                >
                  <img src={img} alt="" referrerPolicy="no-referrer" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* RIGHT — Info (sticky on desktop)                                  */}
        {/* ----------------------------------------------------------------- */}
        <div className="lg:sticky lg:top-24 lg:self-start space-y-6">
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase font-mono tracking-[0.2em] text-[#E6B579]/80 px-2.5 py-1 bg-[#E6B579]/10 border border-[#E6B579]/20">
              {categoryLabel}
            </span>
            {product.badge && (
              <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-[#06211E] px-2 py-1 bg-amber-500">
                {product.badge}
              </span>
            )}
          </div>

          <div>
            <h1 className="font-serif text-3xl lg:text-4xl font-light text-white tracking-wide leading-tight">
              {product.name}
            </h1>
            <div className="flex items-baseline gap-3 mt-3">
              <span className="text-2xl font-mono font-medium text-[#E6B579]">${price.toFixed(2)} AUD</span>
              {compare && (
                <span className="text-base font-mono text-gray-500 line-through">${compare.toFixed(2)}</span>
              )}
            </div>
          </div>

          {/* Materials */}
          <div className="flex flex-wrap gap-2">
            {product.materials.map((m, i) => (
              <span key={i} className="text-[9px] font-mono tracking-widest text-gray-300 bg-white/5 border border-white/5 px-2.5 py-1">
                {m}
              </span>
            ))}
          </div>

          <p className="text-sm text-gray-300 leading-relaxed font-light">{product.description}</p>

          {/* Sizes */}
          <div className="space-y-3">
            <div className="flex justify-between items-center text-[10px] font-mono tracking-widest uppercase text-gray-400">
              <span>Select Size</span>
              <button
                id="open-size-guide"
                onClick={() => setSizeGuideOpen(true)}
                className="flex items-center gap-1.5 text-[#E6B579] hover:text-white transition-colors"
              >
                <Ruler className="w-3.5 h-3.5" /> Size Guide
              </button>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {sizes.map((size) => {
                const inStock = sizeInStock(product, size);
                return (
                  <button
                    key={size}
                    id={`size-${size}`}
                    disabled={!inStock}
                    onClick={() => inStock && setSelectedSize(size)}
                    className={`min-w-[3rem] px-4 py-2.5 text-xs font-mono tracking-widest border transition-all ${
                      !inStock
                        ? 'border-white/5 text-gray-600 line-through cursor-not-allowed'
                        : selectedSize === size
                        ? 'border-[#E6B579] bg-[#E6B579]/15 text-[#E6B579] font-bold'
                        : 'border-[#E6B579]/20 text-gray-200 hover:border-[#E6B579]/60 hover:text-white'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
            {selectedVariant && selectedInStock && selectedVariant.stock <= 5 && (
              <p className="text-[10px] font-mono uppercase tracking-widest text-rose-300">
                Only {selectedVariant.stock} left in {selectedSize}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              id="add-to-bag-btn"
              disabled={!canBuy}
              onClick={() => onAddToCart(product, selectedSize)}
              className="flex-1 py-4 bg-transparent border border-[#E6B579]/40 hover:border-[#E6B579] hover:bg-white/5 text-white text-xs font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ShoppingBag className="w-4 h-4 text-[#E6B579]" />
              <span>Add to Bag</span>
            </button>
            <button
              id="buy-now-btn"
              disabled={!canBuy}
              onClick={() => onBuyNow(product, selectedSize)}
              className="flex-1 py-4 bg-gradient-to-r from-amber-500 to-[#E6B579] hover:brightness-110 text-[#06211E] text-xs font-black uppercase tracking-[0.22em] transition-all flex items-center justify-center gap-2 shadow-xl shadow-amber-950/30 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <ArrowRight className="w-4 h-4" />
              <span>Buy Now</span>
            </button>
          </div>
          {!canBuy && (
            <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 text-center sm:text-left">
              {purchasable ? 'Selected size is sold out — choose another size.' : 'This piece is currently unavailable.'}
            </p>
          )}

          {/* Care */}
          <div className="p-4 bg-[#03100e] border border-[#E6B579]/10 space-y-2">
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block">
              Preservation &amp; Care
            </span>
            <p className="text-[11px] text-gray-400 leading-relaxed font-serif italic">{product.careInstructions}</p>
          </div>

          {/* Trust row */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { icon: ShieldCheck, label: 'Secure Checkout' },
              { icon: Truck, label: 'AU Express Dispatch' },
              { icon: RefreshCw, label: '14-Day Exchange' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center text-center gap-1.5 p-3 border border-white/5">
                <Icon className="w-4 h-4 text-[#E6B579]" />
                <span className="text-[8px] font-mono uppercase tracking-widest text-gray-400 leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SizeGuideModal open={sizeGuideOpen} onClose={() => setSizeGuideOpen(false)} guideKey={product.sizeGuide} />
      <ImageLightbox
        open={lightboxOpen}
        images={product.images}
        index={activeImage}
        alt={product.name}
        onClose={() => setLightboxOpen(false)}
        onIndexChange={setActiveImage}
      />
    </div>
  );
}
