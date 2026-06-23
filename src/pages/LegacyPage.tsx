import { useNavigate } from 'react-router-dom';

export default function LegacyPage() {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto px-4 pt-24 lg:pt-28 space-y-12">
      <div className="text-center space-y-3">
        <span className="text-[10px] font-mono text-[#E6B579] tracking-[0.5em] block uppercase">An Ancestral Voyage</span>
        <h1 className="font-serif text-3xl sm:text-5xl font-light tracking-widest text-white uppercase">
          WEAR THE LEGACY
        </h1>
        <div className="w-12 h-px bg-[#E6B579] mx-auto mt-6" />
      </div>

      <div className="aspect-video bg-[#03100e] border border-[#E6B579]/10 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=1200&q=80"
          alt="Bespoke Design Studio"
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#06211E] via-transparent to-[#06211E]/30" />
        <div className="absolute inset-x-6 bottom-6 flex justify-between items-end border-t border-[#E6B579]/15 pt-4">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#E6B579]">Atelier Toorak Showroom</span>
          <span className="text-[10px] font-mono text-gray-400">EST. IN AUSTRALIA</span>
        </div>
      </div>

      <div className="prose prose-invert max-w-none text-gray-300 space-y-6 text-sm font-light leading-relaxed font-sans text-justify">
        <p>
          The foundations of <strong>Tanvir Attire</strong> were built upon a singular philosophy: that clothing should
          not be transient. A garment is a legacy carrying memories, centuries of skilled lineage, and the proud
          signature of fine raw weaves. Traditional South Asian Kurtas have long carried some of the grandest tactile
          heritages in tailoring, with specialized weavers dedicating months to perfecting single thread lines.
        </p>
        <h3 className="font-serif text-[#E6B579] text-xl font-light tracking-wide pt-4">
          Imperial Weaving &amp; Premium Heavyweight Knits
        </h3>
        <p>
          In constructing our luxury Kurtas, we recruit only master artisans trained in authentic brocade, linen, and
          silk thread work. By weaving dynamic gold threading directly through our primary dark teal, we celebrate the
          sovereign dignity of ancient monarchs.
        </p>
        <p>
          Concurrently, we reimagined modern urban comfort through our streetwear heavy T-Shirts. Unlike thin,
          off-the-rack tees, our signature legacy knits utilize a proprietary{' '}
          <strong>320GSM organic ring-spun cotton</strong> that yields an incredible structured drape, retaining its
          crisp silhouette indefinitely.
        </p>
        <blockquote className="border-l-2 border-[#E6B579] pl-6 py-2 my-6 font-serif italic text-gray-400 text-sm">
          "Our designs respect the slow beauty of South Asian heritage while catering specifically to the fast-paced,
          multi-cultural metropolitan hubs of Australia. Melding raw sands and lush forest palettes, we weave modern
          elegance."
        </blockquote>
        <p>
          We invite you to experience the fabrics physically. Book a private visual fitting session at our showroom in
          Toorak, Melbourne, or browse the dynamic presentations online with fully integrated, standard-setting secure
          Australian checkout channels.
        </p>
      </div>

      <div className="text-center pt-8">
        <button
          id="legacy-back-catalog"
          onClick={() => navigate('/')}
          className="px-12 py-5 bg-[#E6B579] text-[#06211E] text-xs font-bold uppercase tracking-[0.25em] hover:bg-white hover:text-black transition-all"
        >
          Browse the Current Vault
        </button>
      </div>
    </div>
  );
}
