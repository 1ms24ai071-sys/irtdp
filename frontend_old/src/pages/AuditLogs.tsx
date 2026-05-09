import React from 'react';

const S = {
  cont: { padding: '16px' },
  empty: { textAlign: 'center' as const, color: '#7b8299', fontSize: '12px', padding: '16px' },
  log: { marginBottom: '12px', padding: '12px', background: '#0f1118', borderRadius: '4px', borderLeft: '3px solid #4f8ef7' },
  lhdr: { display: 'flex', justifyContent: 'space-between', marginBottom: '6px' },
  lact: { fontSize: '12px', fontWeight: 600, color: '#60a5fa' },
  luser: { fontSize: '11px', color: '#7b8299' },
  ltime: { fontSize: '10px', color: '#4b5563', fontStyle: 'italic' },
  ldesc: { fontSize: '12px', color: '#e8eaf6', marginTop: '4px', fontFamily: 'monospace' },
};

interface AuditLog {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  details?: string;
  metadata?: Record<string, any>;
}

interface AuditLogsProps {
  logs: AuditLog[];
  isLoading?: boolean;
}

export default function AuditLogs({ logs, isLoading }: AuditLogsProps) {
  if (isLoading) {
    return (
      <div style={S.cont}>
        <div style={S.empty}>Loading audit logs…</div>
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div style={S.cont}>
        <div style={S.empty}>No audit logs available.</div>
      </div>
    );
  }

  return (
    <div style={S.cont}>
      {logs.map((log) => (
        <div key={log.id} style={S.log}>
          <div style={S.lhdr}>
            <span style={S.lact}>{log.action}</span>
            <span style={S.ltime}>{new Date(log.timestamp).toLocaleTimeString()}</span>
          </div>
          <div style={S.luser}>by {log.user}</div>
          {log.details && <div style={S.ldesc}>{log.details}</div>}
        </div>
      ))}
    </div>
  );
}
