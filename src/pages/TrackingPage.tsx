import { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Package, Truck, CheckCircle2, ExternalLink, PackageCheck } from 'lucide-react';
import { FULFILMENT_STATUSES } from '../types';

interface TrackedItem {
  name: string;
  size: string;
  quantity: number;
}

interface TrackedOrder {
  referenceId: string;
  status: string;
  trackingNumber: string | null;
  trackingStatus: string | null;
  shippingMethod: string;
  total: number;
  currency: string;
  createdAt: string;
  items: TrackedItem[];
}

const ausPostUrl = (tn: string) => `https://auspost.com.au/mypost/track/#/details/${encodeURIComponent(tn)}`;

function OrderStatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    Paid: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300',
    Pending: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    Failed: 'bg-rose-950/40 border-rose-500/30 text-rose-300',
    Cancelled: 'bg-gray-900 border-gray-700 text-gray-400',
    Refunded: 'bg-sky-950/40 border-sky-500/30 text-sky-300',
  };
  return (
    <span className={`px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider rounded-full border ${map[status] || map.Pending}`}>
      {status}
    </span>
  );
}

/** Australia Post delivery progress bar driven by the admin-set tracking stage. */
function FulfilmentTimeline({ stage }: { stage: string | null }) {
  const currentIndex = stage ? FULFILMENT_STATUSES.indexOf(stage as any) : -1;
  return (
    <div className="flex items-center">
      {FULFILMENT_STATUSES.map((s, i) => {
        const done = currentIndex >= 0 && i <= currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <div key={s} className="flex-1 flex flex-col items-center relative">
            {i > 0 && (
              <span
                className={`absolute top-2 right-1/2 w-full h-0.5 ${i <= currentIndex ? 'bg-[#E6B579]' : 'bg-white/10'}`}
              />
            )}
            <span
              className={`relative z-10 w-4 h-4 rounded-full border-2 ${
                done ? 'bg-[#E6B579] border-[#E6B579]' : 'bg-[#06211E] border-white/20'
              } ${isCurrent ? 'ring-2 ring-[#E6B579]/40' : ''}`}
            />
            <span className={`mt-2 text-[8px] font-mono uppercase tracking-wider text-center leading-tight ${done ? 'text-[#E6B579]' : 'text-gray-500'}`}>
              {s}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function TrackingPage() {
  const [phone, setPhone] = useState('');
  const [orders, setOrders] = useState<TrackedOrder[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (phone.replace(/\D/g, '').length < 6) {
      setError('Please enter the phone number you used at checkout.');
      return;
    }
    setLoading(true);
    setOrders(null);
    try {
      const res = await fetch(`/api/track?phone=${encodeURIComponent(phone)}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setOrders(data.orders);
      } else {
        setError(data.message || 'Could not look up your orders.');
      }
    } catch {
      setError('Could not reach the tracking service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 lg:pt-28 pb-24">
      <div className="text-center space-y-3 mb-10">
        <Package className="w-10 h-10 text-[#E6B579] mx-auto" />
        <h1 className="font-serif text-3xl lg:text-4xl font-light text-white tracking-wide">Track Your Order</h1>
        <p className="text-sm text-gray-400 font-light max-w-md mx-auto">
          Enter the phone number you used at checkout to see every order and its live Australia Post delivery status.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mb-10">
        <div className="flex items-center gap-2 flex-1 bg-[#03100e] border border-[#E6B579]/20 px-4 focus-within:border-[#E6B579] transition-colors">
          <Search className="w-4 h-4 text-gray-500 shrink-0" />
          <input
            id="track-phone-input"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 0491 143 581"
            className="w-full bg-transparent py-3.5 text-sm text-white placeholder-gray-600 focus:outline-none font-sans"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-[#E6B579] hover:brightness-110 text-[#06211E] text-[11px] font-black uppercase tracking-[0.22em] transition-all disabled:opacity-50"
        >
          {loading ? 'Searching…' : 'Track'}
        </button>
      </form>

      {error && (
        <p className="mb-8 px-4 py-3 text-xs font-mono tracking-wide text-rose-300 bg-rose-950/20 border border-rose-500/20 text-center">
          {error}
        </p>
      )}

      {orders !== null && orders.length === 0 && (
        <div className="text-center py-12 space-y-3">
          <PackageCheck className="w-10 h-10 text-gray-600 mx-auto" />
          <p className="text-sm text-gray-400 font-light">No orders found for that phone number.</p>
          <p className="text-[11px] text-gray-500 font-mono">Double-check the number, or contact us at info@tanvirattire.com.au.</p>
        </div>
      )}

      {orders && orders.length > 0 && (
        <div className="space-y-6">
          {orders.map((o) => (
            <motion.div
              key={o.referenceId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#03100e] border border-[#E6B579]/15 p-5 sm:p-6 space-y-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E6B579]/10 pb-4">
                <div>
                  <p className="font-mono text-sm text-white">{o.referenceId}</p>
                  <p className="text-[10px] font-mono text-gray-500 mt-0.5">
                    {new Date(o.createdAt).toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' })} · {o.shippingMethod}
                  </p>
                </div>
                <OrderStatusPill status={o.status} />
              </div>

              {/* Delivery progress */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-gray-400">
                  <Truck className="w-3.5 h-3.5 text-[#E6B579]" />
                  {o.trackingStatus ? `Delivery stage: ${o.trackingStatus}` : 'Awaiting dispatch'}
                </div>
                <FulfilmentTimeline stage={o.trackingStatus} />
                {o.trackingNumber ? (
                  <a
                    href={ausPostUrl(o.trackingNumber)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#E6B579] hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> AusPost tracking: {o.trackingNumber}
                  </a>
                ) : (
                  <p className="text-[11px] font-mono text-gray-500">A tracking number will appear here once your order ships.</p>
                )}
              </div>

              {/* Items */}
              <div className="border-t border-[#E6B579]/10 pt-4 space-y-2">
                {o.items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-gray-300">
                      {it.name} <span className="text-gray-500">· {it.size} × {it.quantity}</span>
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-[#E6B579]/5">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#E6B579]" /> Order total
                  </span>
                  <span className="font-mono text-sm text-[#E6B579] font-bold">${o.total.toFixed(2)} {o.currency}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
