import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trash2, ShieldCheck, Truck, ShoppingCart, HelpCircle, Receipt } from 'lucide-react';
import { CartItem, ShippingOption, StoreConfig } from '../types';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  shippingOptions: ShippingOption[];
  onUpdateQty: (productId: string, size: string, change: number) => void;
  onRemoveItem: (productId: string, size: string) => void;
  config: StoreConfig;
  onReceiptSimulation: (receipt: any) => void;
}

export default function CartDrawer({
  isOpen,
  onClose,
  cartItems,
  shippingOptions,
  onUpdateQty,
  onRemoveItem,
  config,
  onReceiptSimulation
}: CartDrawerProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPostcode, setCustomerPostcode] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // Step wizard checkout states
  const [step, setStep] = useState<'delivery' | 'payment'>('delivery');
  const [clientSecret, setClientSecret] = useState('');
  const [pubKey, setPubKey] = useState('');
  const [stripeInstance, setStripeInstance] = useState<any>(null);
  const [cardInstance, setCardInstance] = useState<any>(null);
  const [pendingReceipt, setPendingReceipt] = useState<any>(null);

  // Calculations
  const subtotal = cartItems.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);
  const finalShippingFee = 10.00; // Flat Rate Delivery fee
  
  // 10% Australian GST details (included in price)
  const gstAmount = Math.round((subtotal / 11) * 100) / 100;
  
  const totalAmount = subtotal + finalShippingFee;

  // Reset checkout states on drawer toggle
  useEffect(() => {
    if (!isOpen) {
      setStep('delivery');
      setClientSecret('');
      setPubKey('');
      setPendingReceipt(null);
      setCheckoutError('');
      setCheckoutLoading(false);
    }
  }, [isOpen]);

  // Handle mounting card elements inline
  useEffect(() => {
    if (step !== 'payment') return;

    const timer = setTimeout(() => {
      const el = document.getElementById('stripe-card-element');
      if (!el) return;

      el.innerHTML = ''; // prevent duplicate element creations

      if (!(window as any).Stripe) {
        setCheckoutError('Stripe secure client API library not loaded. Please reload.');
        return;
      }
      if (!pubKey) {
        setCheckoutError('Payment gateway key unavailable. Please retry checkout.');
        return;
      }

      const stripe = (window as any).Stripe(pubKey);
      const elements = stripe.elements();
      const card = elements.create('card', {
        hidePostalCode: true,
        style: {
          base: {
            color: '#ffffff',
            fontFamily: 'Montserrat, sans-serif',
            fontSize: '13px',
            lineHeight: '20px',
            '::placeholder': {
              color: '#6b7280',
            },
          },
          invalid: {
            color: '#f87171',
            iconColor: '#f87171',
          },
        },
      });

      card.mount('#stripe-card-element');
      setCardInstance(card);
      setStripeInstance(stripe);
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, [step, pubKey]);

  // Destroy card instance on unmount
  useEffect(() => {
    return () => {
      if (cardInstance) {
        cardInstance.destroy();
      }
    };
  }, [cardInstance]);

  // Handle Checkout dispatch to generate intent
  const handleSecurityCheckout = async () => {
    if (cartItems.length === 0) return;

    if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim() || !customerPostcode.trim()) {
      setCheckoutError('Please provide Name, Phone, Street Address, and Postcode.');
      return;
    }

    if (!/^\d{4}$/.test(customerPostcode.trim())) {
      setCheckoutError('Please enter a valid 4-digit Australian postcode.');
      return;
    }

    setCheckoutError('');
    setCheckoutLoading(true);

    try {
      const fullAddress = `${customerAddress.trim()}, ${customerPostcode.trim()}`;
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartItems,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerAddress: fullAddress,
          customerEmail: customerEmail.trim() || undefined
        })
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Checkout could not be started.');
      }
      if (!result.clientSecret) {
        throw new Error('Payment gateway is unavailable. Please try again shortly.');
      }

      // Real Stripe payment only — transition to the inline card step.
      setClientSecret(result.clientSecret);
      setPubKey(result.publishableKey || '');
      setPendingReceipt(result.receipt);
      setStep('payment');
    } catch (err: any) {
      setCheckoutError(err.message || 'Security server was unresponsive. Please retry.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Handle confirming direct inline payment via Stripe Elements
  const handleCardPayment = async () => {
    if (!stripeInstance || !cardInstance || !clientSecret) {
      setCheckoutError('Payment gateway elements not initialized. Retry.');
      return;
    }

    setCheckoutError('');
    setCheckoutLoading(true);

    try {
      const payload = await stripeInstance.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardInstance,
          billing_details: {
            name: customerName.trim(),
            phone: customerPhone.trim(),
            email: customerEmail.trim() || undefined,
            address: {
              line1: customerAddress.trim(),
              postal_code: customerPostcode.trim()
            }
          }
        }
      });

      if (payload.error) {
        throw new Error(payload.error.message || 'Payment authentication failed.');
      }

      if (payload.paymentIntent && payload.paymentIntent.status === 'succeeded') {
        // Clean up cart and return receipt
        onReceiptSimulation(pendingReceipt);
        onClose();
        setStep('delivery');
        setClientSecret('');
        setPendingReceipt(null);
      } else {
        throw new Error('Transaction pending. Please verify funds.');
      }
    } catch (err: any) {
      setCheckoutError(err.message || 'Direct charge failed. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-[#03100e] backdrop-blur-sm"
          />

          {/* Slider Drawer Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50 bg-[#06211E] border-l border-[#E6B579]/20 shadow-2xl flex flex-col justify-between"
          >
            {/* Header section */}
            <div className="p-6 border-b border-[#E6B579]/10 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <ShoppingCart className="w-5 h-5 text-[#E6B579]" />
                <span className="font-serif text-xl font-light text-white tracking-widest">
                  YOUR BAG
                </span>
                <span className="text-xs font-mono font-medium px-2 py-0.5 bg-[#E6B579]/10 text-[#E6B579] rounded">
                  {cartItems.length} styles
                </span>
              </div>
              <button
                id="close-cart-btn"
                onClick={onClose}
                className="p-1 hover:bg-[#E6B579]/10 rounded-full text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Middle Scrollable Section */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {cartItems.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center">
                  <ShoppingCart className="w-12 h-12 text-[#E6B579]/30 mb-4 animate-bounce" />
                  <p className="font-serif text-lg font-light text-white tracking-widest">Atelier Bag is Empty</p>
                  <p className="text-xs text-gray-400 max-w-xs mt-2 leading-relaxed">
                    Explore the legacy products of Tanvir Attire and add selection here.
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-6 px-6 py-3 border border-[#E6B579]/30 hover:border-[#E6B579] hover:bg-[#E6B579]/5 text-xs font-mono tracking-widest text-[#E6B579] transition-all uppercase"
                  >
                    Browse Collections
                  </button>
                </div>
              ) : (
                <>
                  {step === 'delivery' ? (
                    <>
                      {/* Cart Items List */}
                      <div className="divide-y divide-[#E6B579]/10">
                        {cartItems.map((item, idx) => (
                          <div key={`${item.product.id}-${item.size}`} className="py-4 flex gap-4">
                            <img
                              src={item.product.images[0]}
                              alt={item.product.name}
                              loading="lazy"
                              decoding="async"
                              className="w-16 h-20 object-cover bg-teal-950 border border-[#E6B579]/10"
                            />
                            <div className="flex-1 flex flex-col justify-between">
                              <div>
                                <h4 className="font-serif text-sm font-light text-white tracking-wide leading-tight line-clamp-1">
                                  {item.product.name}
                                </h4>
                                <div className="flex items-center gap-3 mt-1">
                                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                                    Size: <span className="text-white font-bold">{item.size}</span>
                                  </span>
                                  <span className="text-[12px] font-mono text-[#E6B579] font-medium">
                                    ${item.product.price.toFixed(2)} AUD
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between mt-2.5">
                                {/* Quantity selection buttons */}
                                <div className="flex items-center border border-[#E6B579]/20 font-mono">
                                  <button
                                    id={`dec-qty-${item.product.id}`}
                                    onClick={() => onUpdateQty(item.product.id, item.size, -1)}
                                    className="px-2.5 py-1 text-gray-400 hover:text-white hover:bg-[#E6B579]/10 transition-all text-xs"
                                  >
                                    -
                                  </button>
                                  <span className="px-3 text-xs font-medium text-white select-none">
                                    {item.quantity}
                                  </span>
                                  <button
                                    id={`inc-qty-${item.product.id}`}
                                    onClick={() => onUpdateQty(item.product.id, item.size, 1)}
                                    className="px-2.5 py-1 text-gray-400 hover:text-white hover:bg-[#E6B579]/10 transition-all text-xs"
                                  >
                                    +
                                  </button>
                                </div>

                                {/* Remove Trigger */}
                                <button
                                  id={`remove-item-${item.product.id}-${item.size}`}
                                  onClick={() => onRemoveItem(item.product.id, item.size)}
                                  className="p-1.5 text-gray-500 hover:text-rose-400 rounded-full hover:bg-rose-950/15 transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Delivery Information Form */}
                      <div className="p-4 bg-[#03100e] border border-[#E6B579]/10 rounded-none space-y-3">
                        <span className="block text-[10px] font-mono text-[#E6B579] uppercase tracking-widest border-b border-[#E6B579]/10 pb-1.5">
                          Delivery Information
                        </span>
                        
                        <div className="space-y-2.5">
                          <div>
                            <label className="block text-[9px] font-mono text-gray-400 uppercase tracking-wider mb-1">
                              Full Name *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Alexander Melb"
                              value={customerName}
                              onChange={(e) => setCustomerName(e.target.value)}
                              className="w-full bg-[#06211E] border border-[#E6B579]/20 text-xs px-3 py-1.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#E6B579] rounded-none font-sans"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-mono text-gray-400 uppercase tracking-wider mb-1">
                              Phone Number *
                            </label>
                            <input
                              type="tel"
                              required
                              placeholder="e.g. +61 400 000 000"
                              value={customerPhone}
                              onChange={(e) => setCustomerPhone(e.target.value)}
                              className="w-full bg-[#06211E] border border-[#E6B579]/20 text-xs px-3 py-1.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#E6B579] rounded-none font-sans"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-mono text-gray-400 uppercase tracking-wider mb-1">
                              Street Address *
                            </label>
                            <textarea
                              required
                              rows={2}
                              placeholder="e.g. Suite 10, 100 Collins St, Melbourne VIC"
                              value={customerAddress}
                              onChange={(e) => setCustomerAddress(e.target.value)}
                              className="w-full bg-[#06211E] border border-[#E6B579]/20 text-xs px-3 py-1.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#E6B579] rounded-none font-sans resize-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-mono text-gray-400 uppercase tracking-wider mb-1">
                              Postcode (4-digit AU) *
                            </label>
                            <input
                              type="text"
                              required
                              maxLength={4}
                              placeholder="e.g. 3000"
                              value={customerPostcode}
                              onChange={(e) => {
                                // Only allow numeric inputs up to 4 digits
                                const val = e.target.value.replace(/\D/g, '');
                                setCustomerPostcode(val);
                              }}
                              className="w-full bg-[#06211E] border border-[#E6B579]/20 text-xs px-3 py-1.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#E6B579] rounded-none font-sans"
                            />
                          </div>

                          <div>
                            <label className="block text-[9px] font-mono text-gray-400 uppercase tracking-wider mb-1">
                              Email Address (Optional)
                            </label>
                            <input
                              type="email"
                              placeholder="e.g. shopper@domain.com.au"
                              value={customerEmail}
                              onChange={(e) => setCustomerEmail(e.target.value)}
                              className="w-full bg-[#06211E] border border-[#E6B579]/20 text-xs px-3 py-1.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#E6B579] rounded-none font-sans"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Static Flat Rate Delivery Display */}
                      <div className="p-3 bg-[#03100e]/40 border border-[#E6B579]/10 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-gray-300">
                          <Truck className="w-4 h-4 text-[#E6B579]" />
                          <div>
                            <span className="text-[10px] font-mono tracking-widest uppercase block text-white">Flat Rate Delivery</span>
                            <span className="text-[9px] text-gray-400 block font-sans">Australia Post Express Logistics</span>
                          </div>
                        </div>
                        <span className="text-xs font-mono text-[#E6B579] font-bold">$10.00 AUD</span>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Step 2: Payment Details Form (Low Noise, focused on payment info) */}
                      <div className="p-4 bg-[#03100e] border border-[#E6B579]/15 rounded-none space-y-4 text-left">
                        <span className="block text-[10px] font-mono text-[#E6B579] uppercase tracking-widest border-b border-[#E6B579]/10 pb-1.5">
                          Sovereign Payment Gateway
                        </span>

                        {/* Order info summary */}
                        <div className="space-y-1.5 font-mono text-[9px] text-gray-400">
                          <div className="flex justify-between">
                            <span>Client Name:</span>
                            <span className="text-white font-bold">{customerName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Contact Phone:</span>
                            <span className="text-white font-bold">{customerPhone}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Delivery Destination:</span>
                            <span className="text-white font-bold text-right max-w-[200px] truncate">
                              {customerAddress}, {customerPostcode}
                            </span>
                          </div>
                        </div>

                        {/* Total amount summary card */}
                        <div className="p-3.5 border border-[#E6B579]/10 bg-[#06211E]/40 font-mono text-center">
                          <span className="text-[8px] uppercase tracking-widest text-gray-400 block mb-0.5">Total Amount Due</span>
                          <span className="text-lg text-[#E6B579] font-bold">${totalAmount.toFixed(2)} AUD</span>
                        </div>

                        {/* Secure Stripe Card Element Container */}
                        <div className="space-y-2">
                          <label className="block text-[9px] font-mono text-gray-400 uppercase tracking-wider">
                            Card Information *
                          </label>
                          <div
                            id="stripe-card-element"
                            className="bg-[#06211E] border border-[#E6B579]/20 p-3.5 rounded-none"
                          >
                            {/* Stripe Card Element injected here */}
                          </div>
                        </div>

                        {/* Back navigation */}
                        <button
                          onClick={() => setStep('delivery')}
                          className="text-[9px] font-mono text-amber-400 hover:text-white underline uppercase tracking-widest block text-center w-full mt-2 cursor-pointer bg-transparent border-0"
                        >
                          Modify Delivery details
                        </button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Bottom Checkout Controls */}
            {cartItems.length > 0 && (
              <div className="p-6 bg-[#03100e] border-t border-[#E6B579]/20 space-y-4">
                {/* Ledger Breakdown */}
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-gray-400">
                    <span>Atelier Subtotal:</span>
                    <span className="text-white">${subtotal.toFixed(2)} AUD</span>
                  </div>
                  
                  <div className="flex justify-between text-gray-400">
                    <span>Flat Rate Delivery:</span>
                    <span className="text-white">
                      ${finalShippingFee.toFixed(2)} AUD
                    </span>
                  </div>

                  <div className="flex justify-between text-gray-500 text-[10px] border-b border-[#E6B579]/10 pb-2">
                    <span>Included AU GST (10%):</span>
                    <span>${gstAmount.toFixed(2)} AUD</span>
                  </div>

                  <div className="flex justify-between text-base font-serif text-[#E6B579] pt-2">
                    <span className="uppercase tracking-widest font-normal">Total Sovereign due:</span>
                    <span className="font-mono font-bold">${totalAmount.toFixed(2)} AUD</span>
                  </div>
                </div>

                {checkoutError && (
                  <p className="text-rose-400 text-[10px] font-mono bg-rose-950/20 border border-rose-500/20 p-2 text-center uppercase tracking-wider">
                    {checkoutError}
                  </p>
                )}

                {/* Secure Gateway Pay Trigger */}
                {step === 'delivery' ? (
                  <button
                    id="checkout-secure-btn"
                    onClick={handleSecurityCheckout}
                    disabled={checkoutLoading}
                    className="w-full py-4 bg-[#E6B579] hover:bg-white text-[#06211E] text-xs font-bold uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 rounded-none disabled:opacity-50 cursor-pointer"
                  >
                    {checkoutLoading ? (
                      <span className="animate-pulse">Authorizing Gateway...</span>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Proceed to Payment..</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    id="checkout-pay-btn"
                    onClick={handleCardPayment}
                    disabled={checkoutLoading}
                    className="w-full py-4 bg-[#E6B579] hover:bg-white text-[#06211E] text-xs font-black uppercase tracking-[0.22em] transition-all duration-300 flex items-center justify-center gap-2 rounded-none disabled:opacity-50 cursor-pointer"
                  >
                    {checkoutLoading ? (
                      <span className="animate-pulse">Confirming Sovereign Funds...</span>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Confirm Sovereign Payment</span>
                      </>
                    )}
                  </button>
                )}

              </div>
            )}

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
