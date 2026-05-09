import type { DriftInsight, DriftLevel } from '../api/drift';

interface DriftInsightCardProps {
  drift: DriftInsight;
  loading?: boolean;
  id?: string;
}

const LEVEL_CONFIG: Record<DriftLevel, {
  label: string;
  color: string;
  bg: string;
  border: string;
  glow: string;
  icon: string;
}> = {
  STABLE:   { label: 'STABLE',   color: '#6FFF00', bg: 'rgba(111,255,0,0.08)',   border: 'rgba(111,255,0,0.25)',   glow: 'rgba(111,255,0,0.2)',   icon: '✓' },
  ELEVATED: { label: 'ELEVATED', color: '#FFC800', bg: 'rgba(255,200,0,0.08)',   border: 'rgba(255,200,0,0.28)',   glow: 'rgba(255,200,0,0.2)',   icon: '↑' },
  HIGH:     { label: 'HIGH',     color: '#FF8C00', bg: 'rgba(255,140,0,0.08)',   border: 'rgba(255,140,0,0.32)',   glow: 'rgba(255,140,0,0.2)',   icon: '⚡' },
  CRITICAL: { label: 'CRITICAL', color: '#FF3C3C', bg: 'rgba(255,60,60,0.08)',   border: 'rgba(255,60,60,0.35)',   glow: 'rgba(255,60,60,0.25)',  icon: '⚠' },
};

const TREND_ICON: Record<string, string> = {
  up: '↑', down: '↓', stable: '→',
};
const TREND_COLOR: Record<string, string> = {
  up: '#FF3C3C', down: '#6FFF00', stable: '#EFF4FF66',
};

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;

  return (
    <svg width="90" height="90" viewBox="0 0 90 90" className="shrink-0" aria-hidden>
      {/* Track */}
      <circle cx="45" cy="45" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
      {/* Progress */}
      <circle
        cx="45" cy="45" r={r} fill="none"
        stroke={color} strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circ}`}
        strokeDashoffset={circ * 0.25}
        style={{
          transition: 'stroke-dasharray 1s cubic-bezier(0.16, 1, 0.3, 1)',
          filter: `drop-shadow(0 0 6px ${color}80)`,
        }}
      />
      {/* Score text */}
      <text x="45" y="49" textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize="15" fontFamily="Anton, sans-serif" letterSpacing="1">
        {score}
      </text>
      <text x="45" y="61" textAnchor="middle" dominantBaseline="middle"
        fill="rgba(239,244,255,0.3)" fontSize="7" fontFamily="Share Tech Mono, monospace" letterSpacing="1">
        SCORE
      </text>
    </svg>
  );
}

function BreakdownBar({
  label, value, max = 40, color,
}: { label: string; value: number; max?: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="font-mono text-cream/35 text-[10px] tracking-wider uppercase">{label}</span>
        <span className="font-mono text-[10px] tabular-nums" style={{ color }}>{value}</span>
      </div>
      <div className="h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            background: color,
            boxShadow: `0 0 6px ${color}80`,
            transition: 'width 0.9s cubic-bezier(0.16,1,0.3,1)',
          }}
        />
      </div>
    </div>
  );
}

export default function DriftInsightCard({ drift, loading, id }: DriftInsightCardProps) {
  const cfg = LEVEL_CONFIG[drift.level];

  if (loading) {
    return (
      <div className="glass p-6 flex flex-col gap-4" id={id} aria-busy>
        <div className="skeleton h-4 w-32" />
        <div className="flex gap-5">
          <div className="skeleton w-[90px] h-[90px] rounded-full shrink-0" />
          <div className="flex-1 flex flex-col gap-3 pt-2">
            <div className="skeleton h-5 w-28" />
            <div className="skeleton h-3 w-full" />
            <div className="skeleton h-3 w-4/5" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id={id}
      className="glass p-6 flex flex-col gap-5"
      style={{ borderColor: cfg.border, background: cfg.bg }}
      role="region"
      aria-label={`Drift insight: ${cfg.label}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              background: cfg.color,
              boxShadow: `0 0 8px ${cfg.glow}`,
              animation: drift.level !== 'STABLE' ? 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' : undefined,
            }}
            aria-hidden
          />
          <span className="font-mono text-cream/40 text-xs tracking-widest uppercase">Drift Analysis</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] tracking-wider" style={{ color: TREND_COLOR[drift.trend] }}>
            {TREND_ICON[drift.trend]} {drift.trend.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex items-start gap-5">
        <ScoreRing score={drift.score} color={cfg.color} />

        <div className="flex-1 min-w-0">
          {/* Level badge */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className="font-grotesk text-2xl leading-none"
              style={{ color: cfg.color, textShadow: `0 0 16px ${cfg.glow}` }}
            >
              {cfg.label}
            </span>
            <span
              className="font-mono text-xs px-2 py-0.5 rounded-full"
              style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}
            >
              {cfg.icon}
            </span>
          </div>

          {/* Top insight */}
          <p className="font-mono text-cream/70 text-xs leading-relaxed mb-1">
            <span className="text-cream/35">↳ </span>
            {drift.topInsight}
          </p>

          {/* Detail */}
          <p className="font-mono text-cream/35 text-[11px] leading-relaxed">
            {drift.detail}
          </p>
        </div>
      </div>

      {/* Breakdown bars */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <BreakdownBar label="Critical"   value={drift.breakdown.criticalWeight}   max={40} color={cfg.color} />
        <BreakdownBar label="Velocity"   value={drift.breakdown.velocityWeight}   max={25} color={cfg.color} />
        <BreakdownBar label="Clustering" value={drift.breakdown.clusterWeight}    max={20} color={cfg.color} />
        <BreakdownBar label="Backlog"    value={drift.breakdown.resolutionWeight} max={15} color={cfg.color} />
      </div>
    </div>
  );
}
