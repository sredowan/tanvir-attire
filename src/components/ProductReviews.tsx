import { useState, useEffect, useCallback } from 'react';
import { Star, BadgeCheck, Upload, RefreshCw, X, Image as ImageIcon, PenLine } from 'lucide-react';
import type { Review, ReviewSummary } from '../types';
import ImageLightbox from './ImageLightbox';

interface ProductReviewsProps {
  productId: string;
}

/** Read-only row of stars for displaying a rating. */
function Stars({ value, size = 'w-4 h-4' }: { value: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${size} ${n <= Math.round(value) ? 'text-[#E6B579] fill-[#E6B579]' : 'text-gray-600'}`}
        />
      ))}
    </div>
  );
}

/** Interactive star picker for the submission form. */
function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
          className="p-0.5 focus:outline-none"
        >
          <Star className={`w-6 h-6 transition-colors ${n <= (hover || value) ? 'text-[#E6B579] fill-[#E6B579]' : 'text-gray-600'}`} />
        </button>
      ))}
    </div>
  );
}

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const [enabled, setEnabled] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [summary, setSummary] = useState<ReviewSummary>({ count: 0, average: 0 });
  const [loading, setLoading] = useState(true);

  // Submission form state
  const [showForm, setShowForm] = useState(false);
  const [author, setAuthor] = useState('');
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Lightbox for review photos
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reviews?productId=${encodeURIComponent(productId)}`);
      const data = await res.json();
      if (data.success) {
        setEnabled(data.enabled !== false);
        setReviews(data.reviews || []);
        setSummary(data.summary || { count: 0, average: 0 });
      }
    } catch {
      /* keep empty state */
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpload = async (file: File) => {
    if (images.length >= 5) {
      setFormMsg({ type: 'error', text: 'Up to 5 photos per review.' });
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/reviews/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Upload failed.');
      setImages((prev) => [...prev, data.url]);
    } catch (e: any) {
      setFormMsg({ type: 'error', text: e.message || 'Upload failed.' });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg(null);
    if (!author.trim() || !body.trim()) {
      setFormMsg({ type: 'error', text: 'Please add your name and a few words.' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, author, rating, title, body, images }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFormMsg({ type: 'success', text: data.message || 'Thank you! Your review will appear once approved.' });
        setAuthor(''); setRating(5); setTitle(''); setBody(''); setImages([]);
        setShowForm(false);
      } else {
        setFormMsg({ type: 'error', text: data.message || 'Could not submit your review.' });
      }
    } catch {
      setFormMsg({ type: 'error', text: 'Could not reach the review service.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Admin has switched reviews off site-wide — render nothing.
  if (!enabled) return null;

  return (
    <section className="mt-16 lg:mt-24 border-t border-[#E6B579]/10 pt-12" id="reviews">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="font-serif text-2xl lg:text-3xl font-light text-white tracking-wide">Client Reviews</h2>
          <div className="flex items-center gap-3 mt-3">
            <Stars value={summary.average} size="w-5 h-5" />
            <span className="font-mono text-sm text-[#E6B579]">
              {summary.average ? summary.average.toFixed(1) : '—'}
            </span>
            <span className="text-[11px] font-mono uppercase tracking-widest text-gray-400">
              {summary.count} {summary.count === 1 ? 'review' : 'reviews'}
            </span>
          </div>
        </div>
        <button
          id="write-review-btn"
          onClick={() => { setShowForm((s) => !s); setFormMsg(null); }}
          className="inline-flex items-center gap-2 px-6 py-3 border border-[#E6B579]/40 hover:border-[#E6B579] hover:bg-white/5 text-white text-[11px] font-bold uppercase tracking-[0.2em] transition-all self-start"
        >
          <PenLine className="w-4 h-4 text-[#E6B579]" />
          {showForm ? 'Close' : 'Write a Review'}
        </button>
      </div>

      {/* Success banner (shown even after form closes) */}
      {formMsg && !showForm && (
        <p className={`mb-6 px-4 py-3 text-xs font-mono tracking-wide ${formMsg.type === 'success' ? 'text-emerald-300 bg-emerald-950/20 border border-emerald-500/20' : 'text-rose-300 bg-rose-950/20 border border-rose-500/20'}`}>
          {formMsg.text}
        </p>
      )}

      {/* Submission form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-10 p-5 sm:p-6 bg-[#03100e] border border-[#E6B579]/15 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Your Name</label>
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g. Aamir H."
                className="w-full bg-[#06211E] border border-[#E6B579]/20 p-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E6B579]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Your Rating</label>
              <StarPicker value={rating} onChange={setRating} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Headline (optional)</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sum it up in a line"
              className="w-full bg-[#06211E] border border-[#E6B579]/20 p-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E6B579]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono uppercase tracking-widest text-gray-400">Your Review</label>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Tell other clients about the fit, fabric and feel…"
              className="w-full bg-[#06211E] border border-[#E6B579]/20 p-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#E6B579] resize-none"
            />
          </div>

          {/* Photo upload */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-mono uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" /> Add Photos (optional)
              </label>
              <label className={`text-[10px] font-mono uppercase tracking-widest cursor-pointer flex items-center gap-1.5 ${uploading ? 'text-gray-500' : 'text-[#E6B579] hover:text-white'}`}>
                {uploading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {uploading ? 'Uploading…' : 'Upload'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading || images.length >= 5}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.currentTarget.value = ''; }}
                />
              </label>
            </div>
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative w-16 h-20 border border-[#E6B579]/20 overflow-hidden group">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-0 right-0 bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {formMsg && (
            <p className={`text-xs font-mono tracking-wide ${formMsg.type === 'success' ? 'text-emerald-300' : 'text-rose-300'}`}>
              {formMsg.text}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 bg-gradient-to-r from-amber-500 to-[#E6B579] hover:brightness-110 text-[#06211E] text-[11px] font-black uppercase tracking-[0.22em] transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
              Submit Review
            </button>
          </div>
          <p className="text-[10px] font-mono text-gray-500">Reviews are published after a quick moderation check.</p>
        </form>
      )}

      {/* Review list */}
      {loading ? (
        <p className="text-xs font-mono text-gray-400">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-gray-400 font-light">No reviews yet — be the first to share your experience.</p>
      ) : (
        <div className="space-y-6">
          {reviews.map((r) => (
            <div key={r.id} className="border-b border-[#E6B579]/10 pb-6 last:border-0">
              <div className="flex items-center gap-3 flex-wrap">
                <Stars value={r.rating} />
                <span className="text-sm font-medium text-white">{r.author}</span>
                {r.verified && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest text-emerald-300 bg-emerald-950/30 border border-emerald-500/25 px-2 py-0.5">
                    <BadgeCheck className="w-3 h-3" /> Verified Purchase
                  </span>
                )}
                <span className="text-[10px] font-mono text-gray-500 ml-auto">
                  {new Date(r.createdAt).toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
              {r.title && <h4 className="font-serif text-base text-white mt-2">{r.title}</h4>}
              <p className="text-sm text-gray-300 leading-relaxed font-light mt-1.5 whitespace-pre-line">{r.body}</p>
              {r.images.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {r.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setLightbox({ images: r.images, index: idx })}
                      className="w-16 h-20 border border-[#E6B579]/15 overflow-hidden hover:border-[#E6B579]/50 transition-colors"
                    >
                      <img src={img} alt="" loading="lazy" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <ImageLightbox
          open
          images={lightbox.images}
          index={lightbox.index}
          alt="Customer photo"
          onClose={() => setLightbox(null)}
          onIndexChange={(i) => setLightbox((prev) => (prev ? { ...prev, index: i } : prev))}
        />
      )}
    </section>
  );
}
