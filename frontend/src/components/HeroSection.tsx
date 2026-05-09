import { useEffect, useState, useRef } from 'react';
import { fetchIncidents } from '../api/incidents';

interface HeroSectionProps {
  onReport: () => void;
}

// Smoothly animates a number from 0 → target
function useCountUp(target: number, duration = 900): number {
  const [display, setDisplay] = useState(0);
  const rafRef  = useRef<number>(0);
  const startTs = useRef<number | null>(null);
  const from    = useRef(0);

  useEffect(() => {
    if (target === 0) { setDisplay(0); return; }
    from.current = display;
    startTs.current = null;

    const tick = (now: number) => {
      if (!startTs.current) startTs.current = now;
      const t = Math.min((now - startTs.current) / duration, 1);
      // ease-out quart
      const eased = 1 - Math.pow(1 - t, 4);
      setDisplay(Math.round(from.current + (target - from.current) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return display;
}

const STATIC_STATS = [
  { value: '12.4K', label: 'Active Nodes' },
  { value: '99.97%', label: 'Uptime' },
  { value: '<80ms', label: 'Avg Latency' },
  { value: '3.2M', label: 'Events/Day' },
];

export default function HeroSection({ onReport }: HeroSectionProps) {
  const [totalIncidents,  setTotalIncidents]  = useState(0);
  const [criticalCount,   setCriticalCount]   = useState(0);
  const [resolvedToday,   setResolvedToday]   = useState(0);
  const [statsLoaded,     setStatsLoaded]     = useState(false);

  const animTotal    = useCountUp(totalIncidents, 800);
  const animCritical = useCountUp(criticalCount,  700);
  const animResolved = useCountUp(resolvedToday,  900);

  useEffect(() => {
    fetchIncidents()
      .then(data => {
        setTotalIncidents(data.length);
        setCriticalCount(data.filter(i => i.status === 'CRITICAL').length);
        setResolvedToday(data.filter(i => i.status === 'RESOLVED').length);
        setStatsLoaded(true);
      })
      .catch(() => setStatsLoaded(true));
  }, []);

  return (
    <section
      id="dashboard"
      className="relative min-h-screen flex flex-col justify-center grid-bg overflow-hidden"
    >
      {/* Background video */}
      <video
        autoPlay muted loop playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-10 mix-blend-screen"
        aria-hidden
      >
        <source src="https://d3phaj0sisr2ct.cloudfront.net/site/videos/claude-web-background.mp4" type="video/mp4" />
      </video>

      <div className="blob w-96 h-96 top-20 -left-32" style={{ background: '#6FFF00' }} />
      <div className="blob w-80 h-80 bottom-32 right-0"  style={{ background: '#1a3aff' }} />
      <div className="scan-line" aria-hidden />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-20">
        <div className="grid md:grid-cols-2 gap-16 items-center">

          {/* ── Left: headline ── */}
          <div>
            <div className="flex items-center gap-3 mb-6 animate-fade-in-up">
              <span className="w-2 h-2 rounded-full bg-neon animate-pulse" aria-hidden />
              <span className="font-condiment text-neon text-2xl tracking-widest">Live detection</span>
            </div>

            <h1
              className="font-grotesk text-cream text-6xl md:text-7xl leading-none uppercase tracking-tight mb-6 animate-fade-in-up"
              style={{ animationDelay: '0.1s' }}
            >
              Real-time
              <br /><span className="text-neon">incident</span>
              <br />monitoring
              <br />system
            </h1>

            <p
              className="font-mono text-cream/50 text-sm leading-relaxed max-w-md mb-10 animate-fade-in-up"
              style={{ animationDelay: '0.2s' }}
            >
              IRTDP connects distributed sensor networks, AI pipelines, and response teams
              into one unified real-time view. Zero latency. Full coverage.
            </p>

            <div className="flex flex-wrap gap-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <button className="btn-neon" onClick={onReport}>Report Incident</button>
              <a className="btn-outline" href="#incidents">View Dashboard</a>
            </div>
          </div>

          {/* ── Right: stats panel ── */}
          <div className="animate-float">
            <div className="glass p-8">
              <div className="flex items-center justify-between mb-6">
                <span className="font-grotesk text-cream/70 text-sm uppercase tracking-widest">System Status</span>
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full bg-neon animate-pulse"
                    style={{ boxShadow: '0 0 6px rgba(111,255,0,0.9)' }}
                    aria-hidden
                  />
                  <span className="font-mono text-neon text-xs">ONLINE</span>
                </div>
              </div>

              {/* Live incident stats */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <LiveStat
                  value={statsLoaded ? String(animTotal) : '—'}
                  label="Total"
                  color="#EFF4FF"
                  loaded={statsLoaded}
                />
                <LiveStat
                  value={statsLoaded ? String(animCritical) : '—'}
                  label="Critical"
                  color="#FF3C3C"
                  loaded={statsLoaded}
                  pulse={criticalCount > 0}
                />
                <LiveStat
                  value={statsLoaded ? String(animResolved) : '—'}
                  label="Resolved"
                  color="#6FFF00"
                  loaded={statsLoaded}
                />
              </div>

              {/* Static system stats */}
              <div className="grid grid-cols-2 gap-3 mb-7">
                {STATIC_STATS.map(s => (
                  <div key={s.label} className="glass p-3.5">
                    <div className="font-grotesk text-neon text-2xl leading-none">{s.value}</div>
                    <div className="font-mono text-cream/40 text-xs mt-1 tracking-wider">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Activity feed */}
              <div className="space-y-2.5">
                <div className="font-mono text-cream/25 text-[10px] tracking-widest uppercase mb-2">Recent Activity</div>
                {[
                  { time: '00:12', msg: 'Sensor cluster 7-B elevated thermal signature', color: 'text-yellow-400' },
                  { time: '00:34', msg: 'AI pipeline flagged anomaly — Chennai sector 4', color: 'text-neon' },
                  { time: '01:02', msg: 'Incident #7821 escalated to CRITICAL', color: 'text-red-400' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="font-mono text-cream/25 text-[10px] mt-0.5 shrink-0 tabular-nums">{item.time}</span>
                    <span className={`font-mono text-xs ${item.color} leading-relaxed`}>{item.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tags row */}
        <div
          className="flex flex-wrap gap-8 mt-20 pt-8 animate-fade-in-up"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)', animationDelay: '0.4s' }}
        >
          {['Distributed Detection', 'AI-Powered Pipeline', 'Real-time Alerts', 'Multi-agency Response'].map(tag => (
            <div key={tag} className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-neon" aria-hidden />
              <span className="font-mono text-cream/30 text-xs tracking-widest uppercase">{tag}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LiveStat({ value, label, color, loaded, pulse = false }: {
  value: string; label: string; color: string; loaded: boolean; pulse?: boolean;
}) {
  return (
    <div className="glass p-3 text-center">
      <div
        className={`font-grotesk text-2xl leading-none tabular-nums transition-all duration-500 ${!loaded ? 'opacity-30' : 'opacity-100'}`}
        style={{ color, textShadow: pulse ? `0 0 12px ${color}80` : undefined }}
      >
        {value}
      </div>
      <div className="font-mono text-cream/35 text-[10px] mt-1 tracking-wider flex items-center justify-center gap-1.5">
        {pulse && loaded && (
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: color }} aria-hidden />
        )}
        {label}
      </div>
    </div>
  );
}
