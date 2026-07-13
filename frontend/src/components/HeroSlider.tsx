import React, { useEffect, useState, useMemo } from 'react';
import { settingsService } from '../services/settingsService';

const SLIDE_DURATION_MS = 5000;

// Simple, original inline illustrations — no external/copyrighted imagery,
// just abstract civic/voting-themed vector shapes so the panel looks good
// out of the box before a school uploads their own photos.
const DefaultSlide: React.FC<{ variant: number }> = ({ variant }) => {
  const illustrations = [
    // Ballot box
    <svg key="ballot" viewBox="0 0 200 200" className="w-64 h-64 opacity-90">
      <rect x="40" y="90" width="120" height="80" rx="8" fill="currentColor" fillOpacity="0.15" />
      <rect x="40" y="90" width="120" height="80" rx="8" stroke="currentColor" strokeWidth="3" fill="none" />
      <path d="M55 90 L70 60 H130 L145 90" stroke="currentColor" strokeWidth="3" fill="none" strokeLinejoin="round" />
      <rect x="85" y="75" width="30" height="8" rx="2" fill="currentColor" />
      <path d="M100 40 L100 100 M85 55 L115 85 M115 55 L85 85" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>,
    // Checkmark / verified vote
    <svg key="check" viewBox="0 0 200 200" className="w-64 h-64 opacity-90">
      <circle cx="100" cy="100" r="70" fill="currentColor" fillOpacity="0.15" />
      <circle cx="100" cy="100" r="70" stroke="currentColor" strokeWidth="3" fill="none" />
      <path d="M70 100 L90 122 L132 78" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>,
    // People / community
    <svg key="people" viewBox="0 0 200 200" className="w-64 h-64 opacity-90">
      <circle cx="70" cy="70" r="22" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="3" />
      <circle cx="130" cy="70" r="22" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="3" />
      <path d="M35 145 Q35 105 70 105 Q105 105 105 145" stroke="currentColor" strokeWidth="3" fill="currentColor" fillOpacity="0.15" />
      <path d="M95 145 Q95 105 130 105 Q165 105 165 145" stroke="currentColor" strokeWidth="3" fill="currentColor" fillOpacity="0.15" />
    </svg>,
  ];
  return <div className="text-white flex items-center justify-center h-full">{illustrations[variant % illustrations.length]}</div>;
};

export const HeroSlider: React.FC = () => {
  const [heroImages, setHeroImages] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const prefersReducedMotion = useMemo(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    []
  );

  useEffect(() => {
    settingsService.getPublic().then((s) => setHeroImages(s.heroImages || [])).catch(() => {});
  }, []);

  const usingUploaded = heroImages.length > 0;
  const slideCount = usingUploaded ? heroImages.length : 3;

  useEffect(() => {
    if (prefersReducedMotion || slideCount <= 1) return;
    const interval = setInterval(() => setIndex((i) => (i + 1) % slideCount), SLIDE_DURATION_MS);
    return () => clearInterval(interval);
  }, [prefersReducedMotion, slideCount]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {Array.from({ length: slideCount }).map((_, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
          style={{ opacity: i === index ? 1 : 0 }}
        >
          {usingUploaded ? (
            <img src={heroImages[i]} alt="" className="w-full h-full object-cover" />
          ) : (
            <DefaultSlide variant={i} />
          )}
        </div>
      ))}

      {slideCount > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {Array.from({ length: slideCount }).map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-white' : 'bg-white/40'}`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
