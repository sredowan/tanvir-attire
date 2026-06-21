import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageLightboxProps {
  open: boolean;
  images: string[];
  index: number;
  alt: string;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}

export default function ImageLightbox({ open, images, index, alt, onClose, onIndexChange }: ImageLightboxProps) {
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });

  // Reset zoom whenever the image or open-state changes.
  useEffect(() => {
    setZoomed(false);
  }, [index, open]);

  // Keyboard navigation.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onIndexChange((index + 1) % images.length);
      if (e.key === 'ArrowLeft') onIndexChange((index - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, index, images.length, onClose, onIndexChange]);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!zoomed) return;
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    setOrigin({ x: ((e.clientX - left) / width) * 100, y: ((e.clientY - top) / height) * 100 });
  };

  const multiple = images.length > 1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[130] bg-[#03100e]/97 backdrop-blur-md flex items-center justify-center"
        >
          {/* Close */}
          <button
            id="lightbox-close"
            onClick={onClose}
            className="absolute top-5 right-5 z-20 p-2.5 bg-[#06211E]/70 border border-[#E6B579]/20 text-gray-200 hover:text-[#06211E] hover:bg-[#E6B579] rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Zoom toggle hint icon (icon only, no text label) */}
          <div className="absolute top-5 left-5 z-20 p-2.5 bg-[#06211E]/70 border border-[#E6B579]/20 text-[#E6B579] rounded-full pointer-events-none">
            {zoomed ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
          </div>

          {/* Image stage */}
          <div
            className={`relative w-full h-full flex items-center justify-center overflow-hidden select-none ${
              zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
            }`}
            onClick={() => setZoomed((z) => !z)}
            onMouseMove={handleMove}
            onMouseLeave={() => setZoomed(false)}
          >
            <img
              src={images[index]}
              alt={alt}
              referrerPolicy="no-referrer"
              className="max-w-[92vw] max-h-[88vh] object-contain pointer-events-none"
              style={{
                transform: zoomed ? 'scale(2.4)' : 'scale(1)',
                transformOrigin: `${origin.x}% ${origin.y}%`,
                transition: zoomed ? 'none' : 'transform 0.4s cubic-bezier(0.25,0.46,0.45,0.94)',
              }}
            />
          </div>

          {/* Prev / Next */}
          {multiple && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); onIndexChange((index - 1 + images.length) % images.length); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-[#06211E]/70 border border-[#E6B579]/20 text-gray-200 hover:text-[#06211E] hover:bg-[#E6B579] rounded-full transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onIndexChange((index + 1) % images.length); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-[#06211E]/70 border border-[#E6B579]/20 text-gray-200 hover:text-[#06211E] hover:bg-[#E6B579] rounded-full transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Dots */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); onIndexChange(i); }}
                    className={`w-2 h-2 rounded-full transition-all ${i === index ? 'bg-[#E6B579] w-5' : 'bg-white/30'}`}
                  />
                ))}
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
