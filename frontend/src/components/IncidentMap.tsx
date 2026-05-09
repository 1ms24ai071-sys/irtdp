import { useMemo } from 'react';
import type { Incident } from '../types';

interface IncidentMapProps {
  incident: Incident;
}

export default function IncidentMap({ incident }: IncidentMapProps) {
  const mapStyle = useMemo(() => ({
    position: 'relative' as const,
    width: '100%',
    height: '400px',
    backgroundColor: '#010828',
    border: '1px solid rgba(111,255,0,0.2)',
    borderRadius: '12px',
    overflow: 'hidden',
  }), []);

  const hasAssignedUnit = incident.assignedUnit && incident.distanceKm && incident.etaMinutes;

  return (
    <div style={mapStyle}>
      <svg
        width="100%"
        height="100%"
        style={{ position: 'absolute', top: 0, left: 0 }}
        viewBox="0 0 400 400"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Grid background */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(111,255,0,0.08)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="400" height="400" fill="url(#grid)" />

        {/* Incident location */}
        <circle
          cx="100"
          cy="200"
          r="12"
          fill="#FF3C3C"
          opacity="0.9"
          filter="drop-shadow(0 0 8px rgba(255, 60, 60, 0.6))"
        />
        <text
          x="100"
          y="240"
          textAnchor="middle"
          fill="#EFF4FF"
          fontSize="12"
          fontFamily="'Share Tech Mono', monospace"
          opacity="0.8"
        >
          Incident
        </text>

        {/* Assigned unit location (if available) */}
        {hasAssignedUnit && (
          <>
            {/* Polyline connecting incident to unit */}
            <line
              x1="100"
              y1="200"
              x2="300"
              y2="150"
              stroke="#6FFF00"
              strokeWidth="2"
              opacity="0.6"
              strokeDasharray="5,5"
            />

            {/* Unit marker */}
            <circle
              cx="300"
              cy="150"
              r="12"
              fill="#6FFF00"
              opacity="0.9"
              filter="drop-shadow(0 0 8px rgba(111, 255, 0, 0.6))"
            />
            <text
              x="300"
              y="190"
              textAnchor="middle"
              fill="#EFF4FF"
              fontSize="12"
              fontFamily="'Share Tech Mono', monospace"
              opacity="0.8"
            >
              {incident.assignedUnit.name || 'Response Center'}
            </text>
          </>
        )}
      </svg>

      {/* Info overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          backgroundColor: 'rgba(1, 8, 40, 0.85)',
          border: '1px solid rgba(111,255,0,0.3)',
          borderRadius: '8px',
          padding: '12px',
          fontSize: '12px',
          fontFamily: '"Share Tech Mono", monospace',
          color: '#EFF4FF',
          maxWidth: '180px',
        }}
      >
        {hasAssignedUnit ? (
          <>
            <div style={{ color: '#6FFF00', marginBottom: '8px', fontWeight: 'bold' }}>
              ✓ Routed
            </div>
            <div style={{ marginBottom: '4px', color: '#EFF4FF99' }}>
              Distance: <span style={{ color: '#6FFF00' }}>{incident.distanceKm?.toFixed(1)} km</span>
            </div>
            <div style={{ color: '#EFF4FF99' }}>
              ETA: <span style={{ color: '#6FFF00' }}>{incident.etaMinutes?.toFixed(0)} min</span>
            </div>
          </>
        ) : (
          <div style={{ color: '#FFC800' }}>
            ⊘ No routing data
          </div>
        )}
      </div>
    </div>
  );
}
