import { useCallback, useEffect, useState } from 'react';
import HeroSection from '../components/HeroSection';
import AboutSection from '../components/AboutSection';
import IncidentGrid from '../components/IncidentGrid';
import IncidentMap from '../components/IncidentMap';
import DriftInsightCard from '../components/DriftInsightCard';
import ExportButton from '../components/ExportButton';
import { fetchIncidents } from '../api/incidents';
import { computeDrift, type DriftInsight } from '../api/drift';
import { useSocket } from '../context/SocketContext';
import type { Incident } from '../types';

interface DashboardPageProps {
  onReport: () => void;
}

const EXPORT_TARGET = 'drift-export-target';

export default function DashboardPage({ onReport }: DashboardPageProps) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [drift,     setDrift]     = useState<DriftInsight | null>(null);
  const [loading,   setLoading]   = useState(true);
  const { socket } = useSocket();

  const loadDrift = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchIncidents();
      setIncidents(data);
      setDrift(computeDrift(data));
    } catch {
      // Non-fatal — grid handles its own error state
      setDrift(computeDrift([]));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDrift(); }, [loadDrift]);

  useEffect(() => {
    if (!socket) return;

    const handleIncidentCreated = (newIncident: Incident) => {
      setIncidents(prev => [newIncident, ...prev]);
      // Recalculate drift with new incident
      setDrift(computeDrift([newIncident, ...incidents]));
    };

    socket.on('incident:created', handleIncidentCreated);

    return () => {
      socket.off('incident:created', handleIncidentCreated);
    };
  }, [socket, incidents]);

  return (
    <>
      <HeroSection onReport={onReport} />
      <AboutSection />

      {/* ── Drift Insight strip ── */}
      <section className="relative py-16 overflow-hidden" aria-label="Drift analysis">
        <div className="blob w-72 h-72 top-0 right-0" style={{ background: '#6FFF00' }} aria-hidden />

        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="font-condiment text-neon text-xl tracking-widest mb-1">AI-derived</div>
              <h2 className="font-grotesk text-cream text-3xl uppercase leading-none">
                Drift <span className="text-neon">Insight</span>
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {/* Refresh drift */}
              <button
                onClick={loadDrift}
                disabled={loading}
                className="font-mono text-xs text-cream/35 hover:text-cream/70 transition-colors tracking-widest uppercase flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/[0.04] disabled:opacity-40"
                aria-label="Refresh drift analysis"
              >
                <svg
                  className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {loading ? 'Analysing…' : 'Refresh'}
              </button>

              {/* Export snapshot */}
              <ExportButton
                targetId={EXPORT_TARGET}
                incidents={incidents}
                label={`Dashboard ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
              />
            </div>
          </div>

          {/* Exportable card wrapper */}
          <div id={EXPORT_TARGET} style={{ background: '#010828', borderRadius: '16px', padding: '2px' }}>
            <DriftInsightCard
              drift={drift ?? { level: 'STABLE', score: 0, topInsight: '—', detail: '—', trend: 'stable', breakdown: { criticalWeight: 0, velocityWeight: 0, clusterWeight: 0, resolutionWeight: 0 } }}
              loading={loading}
            />
          </div>
        </div>
      </section>

      <IncidentGrid incidents={incidents} />

      {/* ── Routing Map ── */}
      {incidents.find(inc => inc.assignedUnit) && (
        <section className="relative py-16 overflow-hidden" aria-label="Routing visualization">
          <div className="relative z-10 max-w-7xl mx-auto px-6">
            <div className="mb-6">
              <div className="font-condiment text-neon text-xl tracking-widest mb-1">Live</div>
              <h2 className="font-grotesk text-cream text-3xl uppercase leading-none">
                Routing <span className="text-neon">Map</span>
              </h2>
            </div>
            <IncidentMap incident={incidents.find(inc => inc.assignedUnit)!} />
          </div>
        </section>
      )}
    </>
  );
}
