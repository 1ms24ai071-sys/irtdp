import { useEffect, useRef, useState } from 'react';
import { useLoading } from '../context/LoadingContext';

type Phase = 'idle' | 'growing' | 'completing' | 'fading';

export default function TopLoadingBar() {
  const { isLoading } = useLoading();
  const [phase, setPhase]   = useState<Phase>('idle');
  const [width, setWidth]   = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const schedule = (fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  };

  useEffect(() => {
    if (isLoading) {
      clear();
      setPhase('growing');
      setWidth(12);
      schedule(() => setWidth(72), 80);
    } else if (phase === 'growing') {
      clear();
      setPhase('completing');
      setWidth(100);
      schedule(() => setPhase('fading'), 220);
      schedule(() => { setPhase('idle'); setWidth(0); }, 620);
    }

    return clear;
    // phase intentionally omitted — only trigger on isLoading changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  if (phase === 'idle') return null;

  const transition =
    phase === 'growing'    ? 'width 2.4s cubic-bezier(0.08, 0.6, 0.25, 1)' :
    phase === 'completing' ? 'width 0.18s ease'                             :
                             'width 0.18s ease, opacity 0.38s ease';

  return (
    <div
      role="progressbar"
      aria-label="Loading"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={width}
      className="fixed top-0 left-0 right-0 z-[9999] h-[2px] pointer-events-none"
      style={{ background: 'rgba(111,255,0,0.1)' }}
    >
      <div
        className="h-full"
        style={{
          width:      `${width}%`,
          opacity:     phase === 'fading' ? 0 : 1,
          transition,
          background: 'linear-gradient(90deg, #6FFF00 0%, #aaff66 100%)',
          boxShadow:  '0 0 8px rgba(111,255,0,0.9), 0 0 18px rgba(111,255,0,0.4)',
        }}
      />
    </div>
  );
}
