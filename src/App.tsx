import { useState, useEffect, type ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Printer, CheckCircle2, X } from 'lucide-react';
import { Product, StoreConfig, CartItem } from './types';
import { INITIAL_PRODUCTS, INITIAL_STORE_CONFIG } from './data';
import { normalizeProduct } from './lib/products';
import Navbar from './components/Navbar';
import CartDrawer from './components/CartDrawer';
import AdminPanel from './components/AdminPanel';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import LegacyPage from './pages/LegacyPage';
import ProductDetailPage from './pages/ProductDetailPage';

/** Opens the admin overlay when the /admin route mounts, rendering the given page behind it. */
function AdminEntry({ onOpen, children }: { onOpen: () => void; children: ReactNode }) {
  useEffect(() => {
    onOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <>{children}</>;
}

export default function App() {
  const location = useLocation();

  // Scroll to top on page transition
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Dynamic business data from the backend
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(INITIAL_STORE_CONFIG);
  const [isAppDataReady, setIsAppDataReady] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // Overlay flags
  const [cartOpen, setCartOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  // Checkout & notifications
  const [simulatedReceipt, setSimulatedReceipt] = useState<any | null>(null);
  const [userNotification, setUserNotification] = useState<string | null>(null);

  // Cart with local persistence
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('tanvir_cart_legacy');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('tanvir_cart_legacy', JSON.stringify(cartItems));
  }, [cartItems]);

  const fetchStoreData = async () => {
    try {
      const response = await fetch('/api/ecommerce-config');
      if (response.ok) {
        const payload = await response.json();
        if (payload.success && Array.isArray(payload.products)) {
          setProducts(payload.products.map(normalizeProduct));
          if (payload.config) setStoreConfig(payload.config);
          setDataError(null);
        } else {
          throw new Error('Malformed catalogue payload.');
        }
      } else {
        throw new Error(`Server responded ${response.status}`);
      }
    } catch (error) {
      console.warn('Backend API unavailable — using local static catalogue.', error);
      setDataError('Live catalogue is offline — showing the latest saved collection.');
    } finally {
      setIsAppDataReady(true);
    }
  };

  useEffect(() => {
    fetchStoreData();
  }, []);

  const handleSaveConfigsFromServer = async (
    updatedProducts: Product[],
    updatedConfig: StoreConfig
  ): Promise<boolean> => {
    try {
      const token = localStorage.getItem('ta_admin_token') || '';
      const response = await fetch('/api/ecommerce-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ products: updatedProducts, config: updatedConfig }),
      });
      if (response.ok) {
        const payload = await response.json();
        if (payload.success) {
          setProducts((payload.products as any[]).map(normalizeProduct));
          setStoreConfig(payload.config);
          triggerToast('Atelier Inventory & Shipping Matrices Synchronized.');
          return true;
        }
      }
    } catch (err) {
      console.error('Error saving updated e-commerce configurations:', err);
    }
    return false;
  };

  const triggerToast = (msg: string) => {
    setUserNotification(msg);
    setTimeout(() => setUserNotification(null), 4500);
  };

  // Cart operations
  const handleAddToCart = (product: Product, size: string) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id && item.size === size);
      if (existing) {
        triggerToast(`Added another ${product.name} (${size}) to your bag.`);
        return prev.map((item) =>
          item.product.id === product.id && item.size === size ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      triggerToast(`Added ${product.name} (${size}) to your bag.`);
      return [...prev, { product, size, quantity: 1 }];
    });
  };

  const handleUpdateQty = (productId: string, size: string, change: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId && item.size === size) {
            const nextQty = item.quantity + change;
            return nextQty <= 0 ? null : { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const handleRemoveItem = (productId: string, size: string) => {
    setCartItems((prev) => prev.filter((item) => !(item.product.id === productId && item.size === size)));
    triggerToast('Item removed from basket.');
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#06211E] text-white flex flex-col justify-between select-sans selection:bg-[#E6B579]/30">
      {/* Toast */}
      <AnimatePresence>
        {userNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] bg-amber-500 text-[#06211E] font-medium font-mono text-xs px-6 py-3 shadow-2xl border border-amber-300/30 flex items-center space-x-2.5"
          >
            <Sparkles className="w-4 h-4 fill-[#06211E]" />
            <span>{userNotification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <Navbar
        config={storeConfig}
        cartCount={cartCount}
        onOpenCart={() => setCartOpen(true)}
        onOpenAdmin={() => setAdminOpen(true)}
      />

      <main className="flex-1 pb-12">
        <Routes>
          <Route
            path="/"
            element={
              <HomePage
                products={products}
                config={storeConfig}
                isReady={isAppDataReady}
                dataError={dataError}
                onAddToCart={handleAddToCart}
              />
            }
          />
          <Route path="/legacy" element={<LegacyPage />} />
          <Route
            path="/products/:slug"
            element={
              <ProductDetailPage
                products={products}
                config={storeConfig}
                isReady={isAppDataReady}
                onAddToCart={handleAddToCart}
                onBuyNow={(product, size) => {
                  handleAddToCart(product, size);
                  setCartOpen(true);
                }}
              />
            }
          />
          <Route
            path="/admin"
            element={
              <AdminEntry onOpen={() => setAdminOpen(true)}>
                <HomePage
                  products={products}
                  config={storeConfig}
                  isReady={isAppDataReady}
                  dataError={dataError}
                  onAddToCart={handleAddToCart}
                />
              </AdminEntry>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <Footer onOpenAdmin={() => setAdminOpen(true)} />

      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cartItems={cartItems}
        shippingOptions={storeConfig.shippingChargeOptions}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        config={storeConfig}
        onReceiptSimulation={(receipt) => {
          setCartItems([]);
          setSimulatedReceipt(receipt);
        }}
      />

      <AnimatePresence>
        {adminOpen && (
          <AdminPanel
            isOpen={adminOpen}
            onClose={() => setAdminOpen(false)}
            products={products}
            config={storeConfig}
            onSaveConfig={handleSaveConfigsFromServer}
          />
        )}
      </AnimatePresence>

      {/* Order confirmation receipt */}
      <AnimatePresence>
        {simulatedReceipt && (
          <div className="fixed inset-0 z-[110] overflow-y-auto bg-[#03100e]/95 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#06211E] border-2 border-[#E6B579] w-full max-w-lg p-6 sm:p-8 space-y-6 relative rounded-none shadow-2xl"
            >
              <button
                id="close-receipt-btn"
                onClick={() => setSimulatedReceipt(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-2 border-b border-[#E6B579]/20 pb-6">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <span className="font-display text-xl tracking-[0.2em] text-[#E6B579] font-bold block">TANVIR ATTIRE</span>
                <p className="text-[10px] tracking-widest text-[#E6B579]/70 uppercase font-mono">Order Confirmation</p>
                <p className="text-xs text-gray-400 font-mono">
                  Booking Ref: <code className="text-white font-bold">{simulatedReceipt.referenceId}</code>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono border-b border-[#E6B579]/10 pb-4">
                <div>
                  <span className="text-[9px] text-gray-400 uppercase tracking-widest block mb-1">Customer Details</span>
                  <p className="text-white font-medium">{simulatedReceipt.customerName}</p>
                  <p className="text-gray-300 mt-0.5">{simulatedReceipt.customerPhone}</p>
                </div>
                <div>
                  <span className="text-[9px] text-gray-400 uppercase tracking-widest block mb-1">Delivery Address</span>
                  <p className="text-gray-300 leading-tight whitespace-pre-line">{simulatedReceipt.customerAddress}</p>
                </div>
              </div>

              <div className="space-y-4">
                <span className="text-[9px] font-mono text-gray-400 tracking-widest uppercase block">Acquired Legacy Styles</span>
                <div className="divide-y divide-[#E6B579]/10 border-y border-[#E6B579]/10 py-2 space-y-2 max-h-36 overflow-y-auto">
                  {simulatedReceipt.items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs py-1">
                      <div>
                        <span className="text-white font-semibold">{item.name}</span>
                        <span className="text-[10px] text-gray-400 ml-2">({item.size}) x{item.quantity}</span>
                      </div>
                      <span className="font-mono text-[#E6B579]">${(item.price * item.quantity).toFixed(2)} AUD</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 border-b border-[#E6B579]/10 pb-4 text-xs font-mono">
                <div className="flex justify-between text-gray-400">
                  <span>Vault Subtotal:</span>
                  <span className="text-white">${simulatedReceipt.subtotal.toFixed(2)} AUD</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Shipping ({simulatedReceipt.shippingMethod}):</span>
                  <span className="text-white">
                    {simulatedReceipt.shippingFee === 0 ? 'FREE' : `$${simulatedReceipt.shippingFee.toFixed(2)} AUD`}
                  </span>
                </div>
                <div className="flex justify-between text-gray-500 text-[10px]">
                  <span>Included AU GST (10% standard):</span>
                  <span>${simulatedReceipt.gstIncluded.toFixed(2)} AUD</span>
                </div>
                <div className="flex justify-between text-sm text-[#E6B579] font-serif pt-2 border-t border-[#E6B579]/5">
                  <span className="uppercase tracking-widest">Total Transaction:</span>
                  <span className="font-mono font-bold">${simulatedReceipt.total.toFixed(2)} AUD</span>
                </div>
              </div>

              <div className="p-4 bg-[#03100e] border border-amber-500/10 space-y-2 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                  <span className="font-bold text-white font-mono uppercase text-[9px] tracking-wider">
                    AusPost Logistics Status: Pending Pickup
                  </span>
                </div>
                <p className="text-[9.5px] text-gray-400 leading-normal">
                  A confirmation was routed to{' '}
                  <span className="text-amber-300">{simulatedReceipt.customerEmail || 'your email'}</span> with standard
                  SMS tracking alerts configured for Sydney, Melbourne &amp; Australian hubs.
                </p>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-3 border border-gray-700 hover:border-[#E6B579] hover:bg-white/5 text-gray-300 text-xs font-mono tracking-widest uppercase transition-all flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => setSimulatedReceipt(null)}
                  className="flex-1 py-3 bg-[#E6B579] text-[#06211E] text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                >
                  Return to Store
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
