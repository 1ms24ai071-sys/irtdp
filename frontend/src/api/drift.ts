import type { Incident } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

export type DriftLevel = 'STABLE' | 'ELEVATED' | 'HIGH' | 'CRITICAL';

export interface DriftInsight {
  level: DriftLevel;
  score: number;          // 0–100
  topInsight: string;
  detail: string;
  trend: 'up' | 'down' | 'stable';
  breakdown: {
    criticalWeight: number;
    velocityWeight: number;
    clusterWeight: number;
    resolutionWeight: number;
  };
}

export interface Snapshot {
  id: string;
  capturedAt: string;
  incidentCount: number;
  criticalCount: number;
  resolvedCount: number;
  avgSeverity: number;
  drift: DriftInsight;
  label?: string;
}

// ── Drift derivation ──────────────────────────────────────────────────────────

export function computeDrift(incidents: Incident[]): DriftInsight {
  if (incidents.length === 0) {
    return {
      level: 'STABLE', score: 0, trend: 'stable',
      topInsight: 'No incidents detected',
      detail: 'System is operating normally with no active incidents.',
      breakdown: { criticalWeight: 0, velocityWeight: 0, clusterWeight: 0, resolutionWeight: 0 },
    };
  }

  const criticals  = incidents.filter(i => i.status === 'CRITICAL');
  const unresolved = incidents.filter(i => i.status !== 'RESOLVED');
  const resolved   = incidents.filter(i => i.status === 'RESOLVED');

  // Recent velocity: incidents in last 30 min
  const recentCutoff = Date.now() - 30 * 60 * 1000;
  const recent = incidents.filter(i => new Date(i.createdAt).getTime() > recentCutoff);

  // Geographic clustering: incidents within same ~50km region
  const clusters = computeGeoClusters(unresolved);
  const maxCluster = Math.max(...clusters, 0);

  // Weighted score (0–100)
  const criticalWeight   = Math.min((criticals.length / Math.max(incidents.length, 1)) * 40, 40);
  const velocityWeight   = Math.min(recent.length * 5, 25);
  const clusterWeight    = Math.min((maxCluster / Math.max(unresolved.length, 1)) * 20, 20);
  const resolutionWeight = Math.max(0, 15 - (resolved.length / Math.max(incidents.length, 1)) * 15);

  const score = Math.round(criticalWeight + velocityWeight + clusterWeight + resolutionWeight);

  const level: DriftLevel =
    score >= 70 ? 'CRITICAL' :
    score >= 45 ? 'HIGH'     :
    score >= 20 ? 'ELEVATED' : 'STABLE';

  // Top insight — most impactful driver
  const drivers = [
    { weight: criticalWeight,   text: `${criticals.length} critical incident${criticals.length !== 1 ? 's' : ''} driving system pressure` },
    { weight: velocityWeight,   text: `${recent.length} new incident${recent.length !== 1 ? 's' : ''} in the last 30 minutes` },
    { weight: clusterWeight,    text: `Geographic cluster of ${maxCluster} incidents in one zone` },
    { weight: resolutionWeight, text: 'Low resolution rate increasing backlog pressure' },
  ].sort((a, b) => b.weight - a.weight);

  const topInsight = drivers[0].text;

  const avgSev = incidents.reduce((s, i) => s + i.severityScore, 0) / incidents.length;

  const detail =
    level === 'CRITICAL' ? `System drift is critical. Avg severity ${avgSev.toFixed(1)}/10 across ${incidents.length} active incidents. Immediate coordinated response required.` :
    level === 'HIGH'     ? `Elevated drift detected. ${unresolved.length} unresolved incidents with avg severity ${avgSev.toFixed(1)}/10. Prioritise critical queue.` :
    level === 'ELEVATED' ? `Drift is above baseline. Monitor closely — ${recent.length} incidents reported recently. Response teams on standby.` :
                           `System is operating within normal parameters. ${resolved.length} incident${resolved.length !== 1 ? 's' : ''} resolved today.`;

  // Trend: compare to a synthetic "previous" window (2× the recent window)
  const olderCutoff = Date.now() - 60 * 60 * 1000;
  const older = incidents.filter(i => {
    const t = new Date(i.createdAt).getTime();
    return t > olderCutoff && t <= recentCutoff;
  });
  const trend: 'up' | 'down' | 'stable' =
    recent.length > older.length + 1 ? 'up' :
    recent.length < older.length - 1 ? 'down' : 'stable';

  return {
    level, score, topInsight, detail, trend,
    breakdown: {
      criticalWeight:   Math.round(criticalWeight),
      velocityWeight:   Math.round(velocityWeight),
      clusterWeight:    Math.round(clusterWeight),
      resolutionWeight: Math.round(resolutionWeight),
    },
  };
}

function computeGeoClusters(incidents: Incident[]): number[] {
  if (incidents.length === 0) return [0];
  const RADIUS_DEG = 0.5; // ~55km
  const visited = new Set<string>();
  const sizes: number[] = [];

  for (const inc of incidents) {
    if (visited.has(inc.id)) continue;
    const cluster = incidents.filter(other => {
      const dlat = Math.abs(inc.latitude - other.latitude);
      const dlng = Math.abs(inc.longitude - other.longitude);
      return dlat < RADIUS_DEG && dlng < RADIUS_DEG;
    });
    cluster.forEach(c => visited.add(c.id));
    sizes.push(cluster.length);
  }

  return sizes;
}

// ── Snapshot store (localStorage) ────────────────────────────────────────────

const STORAGE_KEY = 'irtdp:snapshots';
const MAX_SNAPSHOTS = 20;

export function saveSnapshot(incidents: Incident[], label?: string): Snapshot {
  const drift     = computeDrift(incidents);
  const criticals = incidents.filter(i => i.status === 'CRITICAL').length;
  const resolved  = incidents.filter(i => i.status === 'RESOLVED').length;
  const avgSev    = incidents.length
    ? incidents.reduce((s, i) => s + i.severityScore, 0) / incidents.length
    : 0;

  const snap: Snapshot = {
    id:            crypto.randomUUID(),
    capturedAt:    new Date().toISOString(),
    incidentCount: incidents.length,
    criticalCount: criticals,
    resolvedCount: resolved,
    avgSeverity:   parseFloat(avgSev.toFixed(2)),
    drift,
    label,
  };

  const existing = loadSnapshots();
  const updated  = [snap, ...existing].slice(0, MAX_SNAPSHOTS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return snap;
}

export function loadSnapshots(): Snapshot[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Snapshot[]) : [];
  } catch {
    return [];
  }
}

export function clearSnapshots(): void {
  localStorage.removeItem(STORAGE_KEY);
}
