import { motion } from 'motion/react';
import { ArrowDown, ArrowRight } from 'lucide-react';
import sovereignVideo from '../assets/sovereign-video.mp4';

interface HeroProps {
  onShopNow: () => void;
  onStory?: () => void;
}

export default function Hero({ onShopNow, onStory }: HeroProps) {
  return (
    <section
      id="luxury-hero"
      className="relative w-full min-h-[100svh] lg:h-screen overflow-hidden bg-[#03100e] border-b border-transparent lg:border-[#E6B579]/10"
    >
      {/* Ambient background glows — desktop only */}
      <div className="hidden lg:block absolute top-1/2 left-0 -translate-y-1/2 w-[520px] h-[520px] bg-[#E6B579]/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="hidden lg:block absolute bottom-0 right-1/4 w-[520px] h-[520px] bg-[#0d3d37]/20 rounded-full blur-[160px] pointer-events-none" />

      {/* ================================================================ */}
      {/* MOBILE — Full-viewport 9:16 portrait video + single CTA button  */}
      {/* ================================================================ */}
      <div className="lg:hidden relative w-full h-[100svh] overflow-hidden">
        {/* 9:16 portrait video — fills the entire mobile viewport */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none"
        >
          <source src={sovereignVideo} type="video/mp4" />
        </video>

        {/* Subtle bottom gradient for button readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

        {/* Single full-width "Explore Tanvir Attire" button — pinned to bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-20 p-4 pb-8">
          <motion.button
            id="hero-mobile-explore-btn"
            onClick={onShopNow}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="w-full py-4 bg-[#E6B579] text-[#06211E] text-sm font-bold uppercase tracking-[0.2em] active:scale-[0.98] transition-transform cursor-pointer focus:outline-none"
          >
            Explore Tanvir Attire
          </motion.button>
        </div>
      </div>

      {/* ================================================================ */}
      {/* DESKTOP — Original two-column layout (completely unchanged)      */}
      {/* ================================================================ */}
      <div className="hidden lg:grid relative z-10 h-full grid-cols-2">
        {/* LEFT — Brand manifesto + CTAs */}
        <div className="flex items-center">
          <div className="w-full max-w-xl ml-auto mr-0 px-16 space-y-6 text-left">
            {/* Tagline capsule */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="inline-flex items-center space-x-2 px-3 py-1 border border-[#E6B579]/25 text-[9px] text-[#E6B579] font-mono tracking-[0.3em] uppercase bg-[#E6B579]/5"
            >
              <span className="w-1 h-1 bg-[#E6B579] rounded-full" />
              <span>Atelier Toorak • Melbourne</span>
            </motion.div>

            {/* Headline */}
            <div className="space-y-1">
              <motion.h1
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="font-serif text-6xl xl:text-7xl font-light text-white tracking-[0.02em] leading-[1.05]"
              >
                Where Royal Heritage
              </motion.h1>
              <motion.span
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.1, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="block font-serif italic text-6xl xl:text-7xl font-light text-[#E6B579] tracking-[0.02em] leading-[1.05]"
              >
                Meets Modern Legacy
              </motion.span>
            </div>

            {/* Subheading */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
              className="text-gray-300/90 font-sans font-light text-base max-w-md leading-relaxed"
            >
              Authentic premium kurtas and heavyweight streetwear tees, precision-tailored using
              ancestral Eastern techniques — sovereign style, made for Australia.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.62 }}
              className="flex items-center gap-3 pt-1"
            >
              <button
                id="hero-shop-now-btn"
                onClick={onShopNow}
                className="group px-8 py-4 bg-[#E6B579] text-[#06211E] text-[11px] font-bold uppercase tracking-[0.22em] hover:bg-[#FAF7F2] transition-all duration-300 shadow-lg shadow-amber-950/20 active:scale-[0.98] cursor-pointer focus:outline-none flex items-center justify-center gap-2"
              >
                <span>Explore the Atelier</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                id="hero-story-btn"
                onClick={onStory ?? onShopNow}
                className="px-8 py-4 border border-[#E6B579]/30 text-[#E6B579] text-[11px] font-bold uppercase tracking-[0.22em] hover:bg-[#E6B579]/10 hover:border-[#E6B579] transition-all duration-300 cursor-pointer focus:outline-none"
              >
                Our Craftsmanship
              </button>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.8 }}
              className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-5 border-t border-[#E6B579]/10 max-w-md font-mono text-[9px] uppercase tracking-[0.18em] text-gray-500"
            >
              <span className="text-white/80 font-medium">100% GOTS Organic</span>
              <span className="text-[#E6B579]/30">•</span>
              <span className="text-white/80 font-medium">320 GSM Structural Fit</span>
              <span className="text-[#E6B579]/30">•</span>
              <span className="text-white/80 font-medium">AU Hub Dispatch</span>
            </motion.div>
          </div>
        </div>

        {/* RIGHT — Full-height video */}
        <div className="relative h-full w-full">
          <motion.div
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.3, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 overflow-hidden"
          >
            <video
              autoPlay
              muted
              loop
              playsInline
              poster=""
              className="w-full h-full object-cover object-center select-none pointer-events-none"
            >
              <source src={sovereignVideo} type="video/mp4" />
              Your browser does not support the video tag.
            </video>

            {/* Cinematic grading */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#03100e] via-transparent to-[#03100e]/20 pointer-events-none" />
            {/* Seam fade into the left column */}
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#03100e] to-transparent pointer-events-none" />

            {/* Caption tag */}
            <div className="absolute bottom-5 right-5 z-20 bg-[#03100e]/80 border border-[#E6B579]/20 px-3 py-1 font-mono text-[8px] uppercase tracking-[0.3em] text-[#E6B579] select-none">
              Atelier Preview
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator (desktop only) */}
      <button
        onClick={onShopNow}
        className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 hidden lg:flex flex-col items-center group cursor-pointer"
        aria-label="Scroll to collection"
      >
        <span className="text-[8px] tracking-[0.3em] uppercase text-gray-400 font-mono mb-1.5 group-hover:text-[#E6B579] transition-colors">
          Scroll to Discover
        </span>
        <motion.span
          animate={{ y: [0, 5, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="p-1 border border-[#E6B579]/25 rounded-full"
        >
          <ArrowDown className="w-3 h-3 text-[#E6B579]" />
        </motion.span>
      </button>
    </section>
  );
}
