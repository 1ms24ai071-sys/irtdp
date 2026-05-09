import React, { useEffect, useState, useCallback } from 'react';
import { analyticsApi, dispatchApi } from '../utils/api';
import { socketEvents, useSocketEvent } from '../utils/socket';
import { toastManager } from '../utils/ui';
import type { Incident, DispatchRecord, DispatchStatus } from '../types';

const S = {
  cont: { padding: '16px' },
  disp: { marginBottom: '12px' },
  dlbl: { fontSize: '12px', color: '#7b8299', fontWeight: 600, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  dval: { fontSize: '13px', color: '#e8eaf6', marginBottom: '12px', fontFamily: 'monospace', padding: '8px', background: '#0f1118', borderRadius: '4px', border: '1px solid #1e2030' },
  dbtn: { width: '100%', padding: '10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, marginBottom: '8px', transition: 'all 0.2s' },
  dinfo: { fontSize: '12px', color: '#7b8299', padding: '8px', background: '#1a1d2e', borderRadius: '4px', marginTop: '8px', borderLeft: '3px solid #4f8ef7' },
  dispatch: {
    pending: { background: '#f59e0b22', borderColor: '#f59e0b', color: '#fbbf24' },
    dispatched: { background: '#3b82f622', borderColor: '#3b82f6', color: '#60a5fa' },
    arrived: { background: '#10b98122', borderColor: '#10b981', color: '#34d399' },
  } as Record<string, any>,
};

interface DispatchUIProps {
  incident: Incident;
  canManage: boolean;
  onDispatch?: (resourceType: string) => Promise<void>;
}

export default function DispatchUI({ incident, canManage, onDispatch }: DispatchUIProps) {
  const [dispatchRecord, setDispatchRecord] = useState<DispatchRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [error, setError] = useState("");
  const [socketStatus, setSocketStatus] = useState<'connected'|'reconnecting'|'disconnected'>('disconnected');

  const fetchDispatch = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const response = await dispatchApi.getIncidentDispatches(incident.id);
      const payload = response.data;
      const record = Array.isArray(payload) ? payload[0] ?? null : payload ?? null;
      setDispatchRecord(record);
    } catch (err) {
      console.error(err);
      setError("Unable to load dispatch details.");
      toastManager.error("Unable to load dispatch details.");
      setDispatchRecord(null);
    } finally {
      setLoading(false);
    }
  }, [incident.id]);

  useEffect(() => {
    socketEvents.connect();
    fetchDispatch();
  }, [fetchDispatch]);

  useSocketEvent("socket:connected", () => setSocketStatus('connected'), []);
  useSocketEvent("socket:disconnected", () => setSocketStatus('disconnected'), []);
  useSocketEvent("socket:reconnect_attempt", () => setSocketStatus('reconnecting'), []);
  useSocketEvent("dispatch.status_changed", (data: any) => {
    if (data?.incidentId === incident.id) {
      fetchDispatch();
      toastManager.info('Dispatch status updated.');
    }
  }, [incident.id, fetchDispatch]);

  const DIS_TYPES = [
    { id: 'police', label: 'Police', icon: '🚔' },
    { id: 'ambulance', label: 'Ambulance', icon: '🚑' },
    { id: 'fire', label: 'Fire', icon: '🚒' },
  ];

  const statusTransition: Record<DispatchStatus, { next: DispatchStatus | null; label: string }> = {
    assigned: { next: 'en_route', label: 'Mark En Route' },
    en_route: { next: 'on_scene', label: 'Mark On Scene' },
    on_scene: { next: 'completed', label: 'Mark Completed' },
    completed: { next: null, label: 'Response Completed' },
    cancelled: { next: null, label: 'Dispatch Cancelled' },
  };

  const assignResource = async (resourceType: string) => {
    setError("");
    setLoading(true);
    try {
      const response = await dispatchApi.assign(incident.id, resourceType, false);
      const payload = response.data;
      const record = Array.isArray(payload) ? payload[0] ?? null : payload ?? null;
      setDispatchRecord(record);
      toastManager.success(`Officer assigned to ${resourceType}.`);
      if (onDispatch) await onDispatch(resourceType);
    } catch (err: any) {
      console.error('Auto-dispatch failed:', err);
      toastManager.error(err?.response?.data?.error || 'Failed to dispatch resource.');
      setError('Dispatch request failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateDispatchStatus = async (newStatus: DispatchStatus) => {
    if (!dispatchRecord) return;
    setStatusLoading(true);
    try {
      await dispatchApi.updateStatus(dispatchRecord.dispatchId, newStatus);
      setDispatchRecord((prev) => prev ? { ...prev, status: newStatus, updatedAt: new Date().toISOString() } : prev);
      toastManager.success(`Dispatch marked ${newStatus.replace('_', ' ')}.`);
    } catch (err: any) {
      console.error('Status update failed:', err);
      toastManager.error(err?.response?.data?.error || 'Unable to update dispatch status.');
    } finally {
      setStatusLoading(false);
    }
  };

  const currentAction = dispatchRecord ? statusTransition[dispatchRecord.status] : null;

  return (
    <div style={S.cont}>
      <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={S.dlbl}>Dispatch Status</div>
          <div style={{ color: '#7b8299', fontSize: 11 }}>Assign officers and progress response.</div>
        </div>
        <div style={{ color: socketStatus === 'connected' ? '#22c55e' : socketStatus === 'reconnecting' ? '#f59e0b' : '#ef4444', fontSize: 11 }}>
          {socketStatus === 'connected' ? 'Live tracking' : socketStatus === 'reconnecting' ? 'Reconnecting' : 'Offline'}
        </div>
      </div>

      {loading ? (
        <div style={S.dinfo}>Loading dispatch details…</div>
      ) : (
        <>
          {error && <div style={{ ...S.dinfo, background: '#331212', borderLeftColor: '#ef4444', color: '#fca5a5' }}>{error}</div>}

          {canManage ? (
            <>
              {dispatchRecord ? (
                <div style={S.dval}>
                  <div style={{ marginBottom: 10, fontWeight: 700, color: '#e8eaf6' }}>Current assignment</div>
                  <div style={{ marginBottom: 6 }}>Officer: <strong>{dispatchRecord.officer?.name ?? 'Unknown'}</strong></div>
                  <div style={{ marginBottom: 6 }}>Status: <strong>{dispatchRecord.status.replace('_', ' ')}</strong></div>
                  <div style={{ marginBottom: 6 }}>Updated: {new Date(dispatchRecord.updatedAt).toLocaleString()}</div>
                </div>
              ) : (
                <div style={{ ...S.dval, color: '#9ca3af' }}>No active dispatch found for this incident yet.</div>
              )}

              {dispatchRecord && currentAction?.next ? (
                <button
                  style={{ ...S.dbtn, opacity: statusLoading ? 0.7 : 1, cursor: statusLoading ? 'not-allowed' : 'pointer' }}
                  disabled={statusLoading}
                  onClick={() => updateDispatchStatus(currentAction.next!)}
                >
                  {statusLoading ? 'Updating status…' : currentAction.label}
                </button>
              ) : !dispatchRecord ? (
                <div style={S.disp}>
                  {DIS_TYPES.map(t => (
                    <button
                      key={t.id}
                      style={{
                        ...S.dbtn,
                        marginRight: '4px',
                        width: 'calc(33.333% - 3px)',
                        display: 'inline-block',
                      }}
                      onClick={() => assignResource(t.id)}
                      disabled={loading}
                    >
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={S.dinfo}>
                  Dispatch is complete or cancelled. No further updates available.
                </div>
              )}
            </>
          ) : (
            <div style={{ ...S.dval, color: '#7b8299', fontStyle: 'italic' }}>
              Dispatch controls are reserved for Police/Admin/Analyst roles.
            </div>
          )}
        </>
      )}
    </div>
  );
}
