import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Settings, Menu, X } from 'lucide-react';
import { StoreConfig } from '../types';
import logo from '../assets/logo.png';

interface NavbarProps {
  config: StoreConfig;
  cartCount: number;
  onOpenCart: () => void;
  onOpenAdmin: () => void;
}

export default function Navbar({ config, cartCount, onOpenCart, onOpenAdmin }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isLegacy = location.pathname === '/legacy';
  const go = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <header id="luxury-header" className="absolute lg:sticky top-0 left-0 right-0 z-50 bg-transparent lg:bg-[#06211E]/90 lg:backdrop-blur-md border-b border-transparent lg:border-[#E6B579]/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo Brand Representation - Brand logo image */}
          <div className="flex-1 lg:flex-none flex items-center">
            <button
              id="brand-logo-btn"
              onClick={() => go('/')}
              className="group flex flex-col justify-start items-start text-left cursor-pointer focus:outline-none"
            >
              <img 
                src={logo} 
                alt="Tanvir Attire Logo" 
                className="h-10 w-auto md:h-12 object-contain" 
              />
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav id="desktop-nav" className="hidden lg:flex space-x-8">
            <button
              id="nav-home"
              onClick={() => go('/')}
              className={`relative px-3 py-2 text-xs uppercase tracking-widest font-sans font-medium transition-colors ${
                isHome ? 'text-[#E6B579]' : 'text-gray-300 hover:text-white'
              }`}
            >
              Home
              {isHome && (
                <motion.div
                  layoutId="activeNavLine"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E6B579]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
 
            <button
              id="nav-legacy"
              onClick={() => go('/legacy')}
              className={`relative px-3 py-2 text-xs uppercase tracking-widest font-sans font-medium transition-colors ${
                isLegacy ? 'text-[#E6B579]' : 'text-gray-300 hover:text-white'
              }`}
            >
              The Legacy
              {isLegacy && (
                <motion.div
                  layoutId="activeNavLine"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E6B579]"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          </nav>

          {/* System Control Options */}
          <div className="flex items-center space-x-6">
            
            {/* Australian Operations Badge */}
            <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 bg-emerald-950/40 border border-emerald-500/20 rounded-full text-[10px] text-emerald-400 font-mono tracking-wider uppercase">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse-slow"></span>
              <span>AU Hub (GST Incl.)</span>
            </div>

            {/* Admin Dashboard Quick Action Button */}
            <button
              id="admin-portal-trigger"
              onClick={onOpenAdmin}
              className="hidden lg:inline-flex p-2.5 text-gray-400 hover:text-[#E6B579] hover:bg-[#E6B579]/5 rounded-full transition-all focus:outline-none border border-transparent hover:border-[#E6B579]/10"
              title="Tanvir Management Portal"
            >
              <Settings className="w-5 h-5 animate-spin-hover" />
            </button>

            {/* Shopping Cart Trigger */}
            <button
              id="shopping-bag-trigger"
              onClick={onOpenCart}
              className="relative p-2.5 text-[#E6B579] hover:bg-[#E6B579]/10 rounded-full transition-all focus:outline-none border border-[#E6B579]/20 hover:border-[#E6B579]/50"
              title="Shopping Bag"
            >
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  key={cartCount}
                  className="absolute -top-1 -right-1 bg-amber-500 text-[#06211E] text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border border-[#06211E] shadow-sm font-mono"
                >
                  {cartCount}
                </motion.span>
              )}
            </button>

            {/* Mobile Navigation Menu Toggle */}
            <button
              id="mobile-menu-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-gray-300 hover:text-white focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Navigation Grid */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-[#06211E] border-t border-[#E6B579]/10"
          >
            <div className="px-4 pt-3 pb-6 space-y-3">
              <button
                id="mobile-nav-home"
                onClick={() => go('/')}
                className={`w-full text-left px-4 py-3 text-sm uppercase tracking-widest font-medium rounded-lg ${
                  isHome ? 'bg-[#E6B579]/10 text-[#E6B579]' : 'text-gray-300 hover:bg-[#E6B579]/5'
                }`}
              >
                Home
              </button>
              <button
                id="mobile-nav-legacy"
                onClick={() => go('/legacy')}
                className={`w-full text-left px-4 py-3 text-sm uppercase tracking-widest font-medium rounded-lg ${
                  isLegacy ? 'bg-[#E6B579]/10 text-[#E6B579]' : 'text-gray-300 hover:bg-[#E6B579]/5'
                }`}
              >
                The Legacy
              </button>

              <div className="h-px bg-[#E6B579]/10 my-4" />
              
              <div className="flex items-center justify-between px-4">
                <span className="text-xs text-gray-400 font-mono">Australian Operations</span>
                <span className="text-xs text-[#E6B579] font-mono font-bold">GST Standard (AUD $)</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
