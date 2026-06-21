import { Shield, CreditCard, HelpCircle, MapPin, Truck, RefreshCw } from 'lucide-react';
import logo from '../assets/logo.png';

interface FooterProps {
  onOpenAdmin: () => void;
}

export default function Footer({ onOpenAdmin }: FooterProps) {
  return (
    <footer id="boutique-footer" className="bg-[#03100e] border-t border-[#E6B579]/10 text-gray-400 font-sans">
      
      {/* Upper ticker tape element */}
      <div className="bg-[#06211E] py-3.5 border-b border-[#E6B579]/5 overflow-hidden select-none">
        <div className="flex animate-scroll-marquee whitespace-nowrap text-[9px] font-mono uppercase tracking-[0.4em] text-[#E6B579]/60">
          <span className="inline-block px-12">• TANVIR ATTIRE MELBOURNE</span>
          <span className="inline-block px-12">• WEAR THE LEGACY</span>
          <span className="inline-block px-12">• 100% SECURE STRIPE GATEWAY</span>
          <span className="inline-block px-12">• GOTS ORGANIC LUXURY LINEN</span>
          <span className="inline-block px-12">• OVERNIGHT AIRFREIGHT TO SYDNEY</span>
          <span className="inline-block px-12">• TANVIR ATTIRE MELBOURNE</span>
          <span className="inline-block px-12">• WEAR THE LEGACY</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand Manifesto */}
          <div className="space-y-4">
            <img src={logo} alt="Tanvir Logo" className="h-10 w-auto object-contain" />
            <p className="text-xs text-gray-400 font-light leading-relaxed">
              We design and craft sovereign luxury garments using ancestral Eastern techniques, refined for contemporary Australian tastes. Every thread is an investment in legacy.
            </p>
            <div className="flex items-center space-x-3 text-[10px] text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
              <span>ABN 88 124 951 812 (Victoria, AU)</span>
            </div>
          </div>

          {/* Sourcing Links */}
          <div className="space-y-4">
            <h4 className="font-serif text-sm tracking-widest text-[#E6B579] uppercase">The Atelier Collections</h4>
            <ul className="space-y-2 text-xs font-light">
              <li><span className="hover:text-white cursor-pointer transition-colors">The Royal Legacy Kurtas</span></li>
              <li><span className="hover:text-white cursor-pointer transition-colors">Sultan Brocade Silks</span></li>
              <li><span className="hover:text-white cursor-pointer transition-colors">Signature Heavyweight Tees</span></li>
              <li><span className="hover:text-white cursor-pointer transition-colors font-semibold text-amber-400">View Sovereign Exclusives</span></li>
            </ul>
          </div>

          {/* Boutique Policies */}
          <div className="space-y-4">
            <h4 className="font-serif text-sm tracking-widest text-[#E6B579] uppercase">Bespoke Inquiries</h4>
            <ul className="space-y-2 text-xs font-light">
              <li><span className="hover:text-white cursor-pointer transition-colors">Toorak Showroom Appointments</span></li>
              <li><span className="hover:text-white cursor-pointer transition-colors">Australia Post Tracking Center</span></li>
              <li><span className="hover:text-white cursor-pointer transition-colors">Compositions & Materials Certs</span></li>
              <li><button onClick={onOpenAdmin} className="hover:text-white text-[#E6B579] underline transition-colors cursor-pointer font-bold uppercase text-[9px] tracking-widest font-mono">Management Dashboard</button></li>
            </ul>
          </div>

          {/* Melbourne Showroom location */}
          <div className="space-y-4 bg-[#06211E]/40 border border-[#E6B579]/10 p-5 rounded-none">
            <div className="flex items-center space-x-2 text-[#E6B579]">
              <MapPin className="w-4 h-4 shrink-0" />
              <h4 className="font-serif text-sm tracking-widest uppercase">Toorak Showroom</h4>
            </div>
            <p className="text-[11px] text-gray-300 leading-relaxed font-light">
              Suite 404, 521 Toorak Road <br />
              Toorak, Melbourne Victoria 3142
            </p>
            <div className="text-[10px] text-gray-500 font-mono">
              <span>Open Monday – Saturday <br />By Atelier Booking Only</span>
            </div>
          </div>

        </div>

        {/* Brand quality safeguards */}
        <div className="border-t border-[#E6B579]/5 mt-16 pt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 items-center text-center sm:text-left">
          
          <div className="flex items-center justify-center sm:justify-start gap-3">
            <Shield className="w-5 h-5 text-[#E6B579] shrink-0" />
            <div>
              <h5 className="text-[11px] font-bold text-white uppercase tracking-wider">Stripe Secure Core</h5>
              <p className="text-[9px] text-gray-400">Fully insulated 256-bit secure billing channel</p>
            </div>
          </div>

          <div className="flex items-center justify-center sm:justify-start gap-3 border-y sm:border-y-0 sm:border-x border-white/5 py-4 sm:py-0">
            <Truck className="w-5 h-5 text-[#E6B579] shrink-0" />
            <div>
              <h5 className="text-[11px] font-bold text-white uppercase tracking-wider">AusPost Air Dispatch</h5>
              <p className="text-[9px] text-gray-400">Express next-day transit to metropolitan areas</p>
            </div>
          </div>

          <div className="flex items-center justify-center sm:justify-start gap-3">
            <RefreshCw className="w-5 h-5 text-[#E6B579] shrink-0" />
            <div>
              <h5 className="text-[11px] font-bold text-white uppercase tracking-wider">Tanvir Exchange policy</h5>
              <p className="text-[9px] text-gray-400">14-day hassle-free physical returns and fittings</p>
            </div>
          </div>

        </div>

        {/* Lower copy and payment details */}
        <div className="border-t border-white/5 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-500">
          <p>© {new Date().getFullYear()} Tanvir Attire Australia Ltd. Built for Royal Comfort. All rights reserved.</p>
          <div className="flex items-center gap-2 mt-4 sm:mt-0 font-mono text-[10px] text-[#E6B579]/50 select-none">
            <CreditCard className="w-4 h-4 shrink-0" />
            <span>Stripe Certified • Visa • Mastercard • AMEX • Apple Pay • GPay</span>
          </div>
        </div>

      </div>

    </footer>
  );
}
