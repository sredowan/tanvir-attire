import { Shield, CreditCard, MapPin, Phone, Mail, Truck, RefreshCw } from 'lucide-react';
import logo from '../assets/logo.png';

interface FooterProps {
  onOpenAdmin: () => void;
}

export default function Footer({ onOpenAdmin }: FooterProps) {
  return (
    <footer id="boutique-footer" className="bg-[#03100e] border-t border-[#E6B579]/10 text-gray-400 font-sans">
      
      {/* Upper ticker tape element */}
      <div className="bg-[#06211E] py-3 border-b border-[#E6B579]/5 overflow-hidden select-none">
        <div className="flex animate-scroll-marquee whitespace-nowrap text-[9px] font-mono uppercase tracking-[0.4em] text-[#E6B579]/60">
          <span className="inline-block px-12">• TANVIR ATTIRE AUSTRALIA</span>
          <span className="inline-block px-12">• WEAR THE LEGACY</span>
          <span className="inline-block px-12">• 100% SECURE STRIPE GATEWAY</span>
          <span className="inline-block px-12">• GOTS ORGANIC LUXURY LINEN</span>
          <span className="inline-block px-12">• OVERNIGHT AIRFREIGHT TO SYDNEY</span>
          <span className="inline-block px-12">• TANVIR ATTIRE AUSTRALIA</span>
          <span className="inline-block px-12">• WEAR THE LEGACY</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          
          {/* Brand & Contacts */}
          <div className="space-y-4">
            <img src={logo} alt="Tanvir Logo" className="h-9 w-auto object-contain" />
            <div className="space-y-2 text-xs font-light text-gray-400">
              <p className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#E6B579] shrink-0" />
                <span>32 Truro Crescents, Keilor Lodge, VIC 3038</span>
              </p>
              <p className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#E6B579] shrink-0" />
                <a href="tel:+61491143581" className="hover:text-white transition-colors">+61 491 143 581</a>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#E6B579] shrink-0" />
                <a href="mailto:info@tanvirattire.com.au" className="hover:text-white transition-colors">info@tanvirattire.com.au</a>
              </p>
            </div>
          </div>

          {/* Sourcing & Management Links */}
          <div className="space-y-4 md:pl-6">
            <h4 className="font-serif text-xs tracking-widest text-[#E6B579] uppercase">The Boutique</h4>
            <ul className="space-y-2.5 text-xs font-light text-gray-400">
              <li><span className="hover:text-white cursor-pointer transition-colors">The Legacy Story</span></li>
              <li><span className="hover:text-white cursor-pointer transition-colors">Australia Post Tracking</span></li>
              <li><button onClick={onOpenAdmin} className="hover:text-white text-[#E6B579] underline transition-colors cursor-pointer font-bold uppercase text-[9px] tracking-widest font-mono">Management Dashboard</button></li>
            </ul>
          </div>

          {/* Client Safeguards */}
          <div className="space-y-4">
            <h4 className="font-serif text-xs tracking-widest text-[#E6B579] uppercase">Client Assurances</h4>
            <div className="space-y-3.5 text-xs text-gray-400">
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-[#E6B579] shrink-0" />
                <span className="text-[11px] text-gray-300">Stripe Secure billing Core</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Truck className="w-4 h-4 text-[#E6B579] shrink-0" />
                <span className="text-[11px] text-gray-300">AusPost Express Air Dispatch</span>
              </div>
              <div className="flex items-center gap-2.5">
                <RefreshCw className="w-4 h-4 text-[#E6B579] shrink-0" />
                <span className="text-[11px] text-gray-300">14-Day Physical Fitting Exchange</span>
              </div>
            </div>
          </div>

        </div>

        {/* Lower copy and payment details */}
        <div className="border-t border-white/5 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between text-[10px] text-gray-500 gap-4">
          <p>© {new Date().getFullYear()} Tanvir Attire Australia. ABN 66 355 065 231. Built for Royal Comfort.</p>
          <div className="flex items-center gap-2 font-mono text-[9px] text-[#E6B579]/40 select-none">
            <CreditCard className="w-3.5 h-3.5 shrink-0" />
            <span>Stripe Certified • Visa • Mastercard • AMEX • Apple Pay • GPay</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
