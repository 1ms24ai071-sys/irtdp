import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Wraps page content in a lightweight CSS transition.
 * On route change: fade out → swap content → fade in.
 * Respects prefers-reduced-motion automatically via CSS.
 */
export default function PageTransition({ children }: PageTransitionProps) {
  const location                  = useLocation();
  const [displayed, setDisplayed] = useState(children);
  const [phase,     setPhase]     = useState<'in' | 'out'>('in');
  const prevPath                  = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname === prevPath.current) {
      // Same route (e.g. search param change) — just update content
      setDisplayed(children);
      return;
    }

    prevPath.current = location.pathname;

    // 1. Fade out
    setPhase('out');

    const swapTimer = setTimeout(() => {
      // 2. Swap content while invisible
      setDisplayed(children);
      // 3. Fade in
      setPhase('in');
    }, 160); // matches transition duration below

    return () => clearTimeout(swapTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Keep displayed content current when children change on same route
  useEffect(() => {
    if (phase === 'in') setDisplayed(children);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children]);

  return (
    <div
      style={{
        opacity:   phase === 'out' ? 0 : 1,
        transform: phase === 'out' ? 'translateY(6px)' : 'translateY(0)',
        transition: 'opacity 0.18s ease, transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        willChange: 'opacity, transform',
      }}
    >
      {displayed}
    </div>
  );
}
