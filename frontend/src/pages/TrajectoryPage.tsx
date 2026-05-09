import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadSnapshots, clearSnapshots, type Snapshot, type DriftLevel } from '../api/drift';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleString([], {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const LEVEL_COLOR: Record<DriftLevel, string> = {
  STABLE:   '#6FFF00',
  ELEVATED: '#FFC800',
  HIGH:     '#FF8C00',
  CRITICAL: '#FF3C3C',
};

const LEVEL_BG: Record<DriftLevel, string> = {
  STABLE:   'rgba(111,255,0,0.08)',
  ELEVATED: 'rgba(255,200,0,0.08)',
  HIGH:     'rgba(255,140,0,0.08)',
  CRITICAL: 'rgba(255,60,60,0.08)',
};

// ── Mini spark-line using SVG ─────────────────────────────────────────────────

function ScoreSparkline({ snapshots }: { snapshots: Snapshot[] }) {
  if (snapshots.length < 2) return null;

  const scores  = snapshots.map(s => s.drift.score).reverse(); // oldest first
  const W = 120, H = 32, pad = 4;
  const minS = Math.min(...scores), maxS = Math.max(...scores);
  const range = Math.max(maxS - minS, 10);

  const pts = scores.map((s, i) => {
    const x = pad + (i / (scores.length - 1)) * (W - pad * 2);
    const y = H - pad - ((s - minS) / range) * (H - pad * 2);
    return `${x},${y}`;
  }).join(' ');

  // Color gradient: latest score drives color
  const latest = scores[scores.length - 1];
  const color  =
    latest >= 70 ? '#FF3C3C' :
    latest >= 45 ? '#FF8C00' :
    latest >= 20 ? '#FFC800' : '#6FFF00';

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-label="Score trend sparkline">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Fill area */}
      <polyline
        points={`${pad},${H} ${pts} ${W - pad},${H}`}
        fill="url(#spark-fill)"
        stroke="none"
      />
      {/* Line */}
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 3px ${color}80)` }}
      />
      {/* Latest dot */}
      <circle
        cx={W - pad}
        cy={H - pad - ((scores[scores.length - 1] - minS) / range) * (H - pad * 2)}
        r="2.5"
        fill={color}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  );
}

// ── Snapshot card ─────────────────────────────────────────────────────────────

function SnapshotCard({ snap, index }: { snap: Snapshot; index: number }) {
  const color = LEVEL_COLOR[snap.drift.level];
  const bg    = LEVEL_BG[snap.drift.level];

  return (
    <div
      className="glass flex flex-col gap-4 p-5"
      style={{
        borderColor: `${color}30`,
        background: bg,
        animation: `cardIn 0.45s cubic-bezier(0.16,1,0.3,1) both`,
        animationDelay: `${index * 50}ms`,
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-mono text-cream/30 text-[10px] tracking-widest mb-1">
            {fmt(snap.capturedAt)}
          </div>
          {snap.label && (
            <div className="font-mono text-cream/60 text-xs truncate">{snap.label}</div>
          )}
        </div>
        <span
          className="font-grotesk text-sm uppercase shrink-0 px-2.5 py-1 rounded-full"
          style={{ background: `${color}18`, border: `1px solid ${color}40`, color }}
        >
          {snap.drift.level}
        </span>
      </div>

      {/* Score + stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Score',    value: snap.drift.score,    unit: '',   color },
          { label: 'Total',    value: snap.incidentCount,  unit: '',   color: '#EFF4FF99' },
          { label: 'Critical', value: snap.criticalCount,  unit: '',   color: snap.criticalCount > 0 ? '#FF3C3C' : '#EFF4FF30' },
          { label: 'Avg Sev',  value: snap.avgSeverity.toFixed(1), unit: '', color: '#EFF4FF60' },
        ].map(stat => (
          <div key={stat.label} className="text-center">
            <div className="font-grotesk text-base leading-none" style={{ color: stat.color }}>
              {stat.value}{stat.unit}
            </div>
            <div className="font-mono text-cream/25 text-[9px] mt-1 tracking-wider uppercase">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Top insight */}
      <p className="font-mono text-cream/35 text-[11px] leading-relaxed border-t border-white/5 pt-3">
        <span className="text-cream/20">↳ </span>
        {snap.drift.topInsight}
      </p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TrajectoryPage() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    setSnapshots(loadSnapshots());
  }, []);

  const handleClear = () => {
    clearSnapshots();
    setSnapshots([]);
  };

  // Summary stats across snapshots
  const avgScore    = snapshots.length ? Math.round(snapshots.reduce((s, n) => s + n.drift.score, 0) / snapshots.length) : 0;
  const peakScore   = snapshots.length ? Math.max(...snapshots.map(s => s.drift.score)) : 0;
  const critSnaps   = snapshots.filter(s => s.drift.level === 'CRITICAL').length;
  const stableSnaps = snapshots.filter(s => s.drift.level === 'STABLE').length;

  return (
    <div className="relative min-h-screen grid-bg overflow-hidden pt-28 pb-20">
      {/* Blobs */}
      <div className="blob w-96 h-96 top-0 -left-32" style={{ background: '#6FFF00' }} aria-hidden />
      <div className="blob w-72 h-72 bottom-0 right-0" style={{ background: '#1a3aff' }} aria-hidden />
      <div className="scan-line" aria-hidden />

      <div className="relative z-10 max-w-5xl mx-auto px-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 mb-12">
          <div>
            <div className="font-condiment text-neon text-2xl tracking-widest mb-1">Identity progression</div>
            <h1 className="font-grotesk text-cream text-5xl uppercase leading-none">
              System<br /><span className="text-neon">Trajectory</span>
            </h1>
            <p className="font-mono text-cream/35 text-xs mt-3 max-w-sm leading-relaxed">
              Historical drift snapshots captured from the live dashboard.
              Each snapshot records system state at the moment of export.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-outline text-xs py-2 px-4 flex items-center gap-2"
            >
              ← Dashboard
            </button>
            {snapshots.length > 0 && (
              <button
                onClick={handleClear}
                className="font-mono text-xs text-cream/25 hover:text-red-400 transition-colors tracking-widest uppercase px-3 py-2 rounded-xl hover:bg-red-400/5 border border-transparent hover:border-red-400/20"
              >
                Clear all
              </button>
            )}
          </div>
        </div>

        {/* ── Summary strip ── */}
        {snapshots.length > 0 && (
          <div className="glass p-5 mb-8 flex flex-wrap gap-6 items-center justify-between">
            <div className="flex flex-wrap gap-6">
              {[
                { label: 'Snapshots',    value: snapshots.length, color: '#EFF4FF' },
                { label: 'Avg Drift',    value: avgScore,          color: avgScore >= 45 ? '#FF8C00' : '#6FFF00' },
                { label: 'Peak Drift',   value: peakScore,         color: peakScore >= 70 ? '#FF3C3C' : '#FFC800' },
                { label: 'Critical',     value: critSnaps,         color: critSnaps > 0 ? '#FF3C3C' : '#EFF4FF30' },
                { label: 'Stable',       value: stableSnaps,       color: '#6FFF00' },
              ].map(s => (
                <div key={s.label}>
                  <div className="font-grotesk text-2xl leading-none" style={{ color: s.color }}>{s.value}</div>
                  <div className="font-mono text-cream/25 text-[10px] mt-0.5 tracking-widest uppercase">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Sparkline */}
            <div className="flex flex-col items-end gap-1">
              <ScoreSparkline snapshots={snapshots} />
              <span className="font-mono text-cream/20 text-[9px] tracking-widest">DRIFT TREND</span>
            </div>
          </div>
        )}

        {/* ── Snapshot grid / empty ── */}
        {snapshots.length === 0 ? (
          <div className="glass p-20 flex flex-col items-center gap-5 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
              style={{ background: 'rgba(111,255,0,0.06)', border: '1px solid rgba(111,255,0,0.12)' }}
            >
              📸
            </div>
            <div>
              <p className="font-grotesk text-cream/40 text-xl uppercase tracking-widest mb-2">
                No snapshots yet
              </p>
              <p className="font-mono text-cream/22 text-sm leading-relaxed max-w-xs">
                Export a snapshot from the dashboard using the{' '}
                <span className="text-neon/60">Export Snapshot</span> button.
                Each export is saved here automatically.
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn-neon mt-2"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" role="list" aria-label="Snapshot history">
            {snapshots.map((snap, i) => (
              <div key={snap.id} role="listitem">
                <SnapshotCard snap={snap} index={i} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
