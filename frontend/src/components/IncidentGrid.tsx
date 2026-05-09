import { Incident } from '../types';

export default function IncidentGrid({ incidents }: { incidents: Incident[] }) {
  if (incidents.length === 0) {
    return <div className="text-cream/50 font-mono italic">No incidents recorded.</div>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {incidents.map((inc, i) => (
        <div key={inc.id || i} className="p-5 bg-white/5 border border-white/10 rounded-xl relative overflow-hidden backdrop-blur-sm hover:border-neon/30 transition-colors">
          <div className="absolute top-0 right-0 p-2 opacity-10 font-bold text-6xl select-none" style={{ color: '#6FFF00' }}>{i + 1}</div>
          <h3 className="font-grotesk text-neon text-lg mb-2">{inc.title}</h3>
          <p className="font-mono text-cream/70 text-sm mb-4 line-clamp-3">{inc.description}</p>
          
          {/* Location */}
          <div className="flex gap-2 font-mono text-[10px] text-cream/40 uppercase mb-3">
            <span className="px-2 py-1 bg-black/30 rounded border border-white/5">Lat: {Number(inc.latitude).toFixed(4)}</span>
            <span className="px-2 py-1 bg-black/30 rounded border border-white/5">Lng: {Number(inc.longitude).toFixed(4)}</span>
          </div>

          {/* Routing info if available */}
          {inc.assignedUnit && inc.distanceKm && inc.etaMinutes && (
            <div className="border-t border-white/5 pt-3 mt-3">
              <div className="font-mono text-[11px] text-cream/50 uppercase tracking-wider mb-2">
                ✓ Routed
              </div>
              <div className="space-y-1 font-mono text-xs text-cream/70">
                <div>
                  Unit: <span className="text-neon">{inc.assignedUnit.name || inc.assignedUnit.id}</span>
                </div>
                <div>
                  Distance: <span className="text-neon">{inc.distanceKm.toFixed(1)} km</span>
                </div>
                <div>
                  ETA: <span className="text-neon">{inc.etaMinutes.toFixed(0)} min</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
