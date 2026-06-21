import { motion, AnimatePresence } from 'motion/react';
import { X, Ruler } from 'lucide-react';
import { getSizeGuide } from '../lib/sizeGuides';

interface SizeGuideModalProps {
  open: boolean;
  onClose: () => void;
  guideKey?: string;
}

export default function SizeGuideModal({ open, onClose, guideKey }: SizeGuideModalProps) {
  const guide = getSizeGuide(guideKey);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#03100e]/90 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
            className="relative w-full max-w-lg bg-[#06211E] border border-[#E6B579]/25 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6B579]/15">
              <div className="flex items-center gap-2.5">
                <Ruler className="w-4 h-4 text-[#E6B579]" />
                <div>
                  <h3 className="font-serif text-lg text-white tracking-wide leading-none">{guide.title}</h3>
                  {guide.subtitle && (
                    <span className="text-[10px] font-mono text-[#E6B579] uppercase tracking-[0.25em]">{guide.subtitle}</span>
                  )}
                </div>
              </div>
              <button
                id="size-guide-close"
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-white hover:bg-[#E6B579]/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chart */}
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-gray-400">
                <span>Available sizes:</span>
                <span className="text-[#E6B579] font-bold">{guide.rows.map((r) => r.size).join(', ')}</span>
              </div>

              <div className="overflow-hidden border border-[#E6B579]/15">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#03100e] text-[#E6B579] font-mono uppercase tracking-wider text-[10px]">
                      {guide.columns.map((c) => (
                        <th key={c.key} className="px-4 py-3">{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6B579]/10">
                    {guide.rows.map((row) => (
                      <tr key={row.size} className="hover:bg-[#E6B579]/5 transition-colors">
                        {guide.columns.map((c) => (
                          <td
                            key={c.key}
                            className={`px-4 py-3 font-mono text-sm ${
                              c.key === 'size' ? 'text-[#E6B579] font-bold' : 'text-gray-200'
                            }`}
                          >
                            {row[c.key]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {guide.note && (
                <p className="text-[11px] text-gray-400 leading-relaxed font-light">{guide.note}</p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
