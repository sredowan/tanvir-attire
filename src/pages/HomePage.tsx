import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, StoreConfig } from '../types';
import { isVisible } from '../lib/products';
import { getCategories } from '../lib/categories';
import Hero from '../components/Hero';
import ProductCard from '../components/ProductCard';

interface HomePageProps {
  products: Product[];
  config: StoreConfig;
  isReady: boolean;
  dataError: string | null;
  onAddToCart: (product: Product, size: string) => void;
}

export default function HomePage({ products, config, isReady, dataError, onAddToCart }: HomePageProps) {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const openDetails = (p: Product) => navigate(`/products/${p.slug}`);

  // Only show category tabs that actually have visible products.
  const visibleProducts = products.filter(isVisible);
  const categories = getCategories(config).filter((c) => visibleProducts.some((p) => p.category === c.value));

  const filteredProducts = visibleProducts.filter((p) => {
    if (selectedCategory === 'all') return true;
    return p.category === selectedCategory;
  });

  const filterBtn = (key: string, label: string) => (
    <button
      key={key}
      id={`filter-${key}`}
      onClick={() => setSelectedCategory(key)}
      className={`px-5 py-2.5 transition-all text-[11px] uppercase tracking-widest ${
        selectedCategory === key
          ? 'bg-[#E6B579] text-[#06211E] font-bold shadow-md shadow-amber-950/20'
          : 'border border-[#E6B579]/20 hover:border-[#E6B579]/70 text-gray-300'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-16">
      <Hero
        onShopNow={() => document.getElementById('catalog-section')?.scrollIntoView({ behavior: 'smooth' })}
        onStory={() => navigate('/legacy')}
      />

      <div id="catalog-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-4">
          <span className="text-[10px] font-mono text-[#E6B579] tracking-[0.4em] block uppercase">
            Atelier Collection Vault
          </span>
          <h2 className="font-serif text-3xl sm:text-[44px] font-light text-white tracking-widest leading-none">
            THE SOVEREIGN WEAVES
          </h2>
          <p className="text-xs text-gray-400 max-w-lg mx-auto font-sans leading-relaxed pt-2">
            Handcrafted with traditional raw brocade and ultra-heavy organic materials tailored to withstand the
            Australian climate with elegant structure.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-center border-b border-[#E6B579]/10 pb-6 gap-4">
          <div className="flex flex-wrap gap-2">
            {filterBtn('all', 'All Styles')}
            {categories.map((c) => filterBtn(c.value, c.label))}
          </div>
        </div>

        {dataError && (
          <div className="flex items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-widest text-amber-300/80 bg-amber-500/5 border border-amber-400/15 py-2.5 px-4">
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
            <span>{dataError}</span>
          </div>
        )}

        {!isReady ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-[#03100e] border border-[#E6B579]/10 flex flex-col">
                <div className="aspect-[3/4] shimmer-bg" />
                <div className="p-4 space-y-3">
                  <div className="h-2.5 w-1/3 shimmer-bg" />
                  <div className="h-4 w-3/4 shimmer-bg" />
                  <div className="h-3 w-1/4 shimmer-bg" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center">
            <p className="font-serif text-lg text-gray-400">No styles in this filter just yet.</p>
            <button
              onClick={() => setSelectedCategory('all')}
              className="mt-4 px-5 py-2.5 bg-[#E6B579] text-[#06211E] text-xs font-mono font-bold uppercase tracking-wider hover:bg-white transition-colors"
            >
              Reset Filtering
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {filteredProducts.map((p) => (
              <ProductCard key={p.id} product={p} config={config} onViewDetails={openDetails} onQuickAdd={onAddToCart} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
