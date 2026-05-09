import React, { useEffect, useState } from "react";
import { socketEvents, useSocketEvent } from "../utils/socket";
import { playSound, toastManager } from "../utils/ui";

interface SOSAlertProps {
  sosData: {
    id: string;
    userId: string;
    location: [number, number];
    timestamp: string;
    priority: "critical";
  } | null;
  onClose: () => void;
  onNavigate?: (lat: number, lng: number) => void;
}

export function SOSAlert({ sosData: externalSosData, onClose, onNavigate }: SOSAlertProps) {
  const [sosData, setSosData] = useState(externalSosData);
  const [socketState, setSocketState] = useState<'connected'|'reconnecting'|'disconnected'|'error'>('disconnected');

  useEffect(() => {
    socketEvents.connect();
  }, []);

  useSocketEvent("socket:connected", () => setSocketState('connected'), []);
  useSocketEvent("socket:disconnected", () => setSocketState('disconnected'), []);
  useSocketEvent("socket:reconnect_attempt", () => setSocketState('reconnecting'), []);
  useSocketEvent("socket:error", () => {
    setSocketState('error');
    toastManager.warning('Realtime SOS connection issue.');
  }, []);
  useSocketEvent("socket:reconnect_failed", () => {
    setSocketState('disconnected');
    toastManager.error('SOS realtime reconnect failed.');
  }, []);

  useSocketEvent("sos.triggered", (data: any) => {
    if (data && data.location) {
      setSosData({
        id: data.id || `sos-${Date.now()}`,
        userId: data.userId || "",
        location: data.location,
        timestamp: data.timestamp || new Date().toISOString(),
        priority: "critical",
      });
      onNavigate?.(data.location[0], data.location[1]);
    }
  }, [onNavigate]);

  useEffect(() => {
    if (externalSosData) {
      setSosData(externalSosData);
    }
  }, [externalSosData]);

  useEffect(() => {
    if (sosData) {
      const soundInterval = setInterval(() => {
        playSound("alert");
      }, 1500);

      const flashInterval = setInterval(() => {
        document.body.style.backgroundColor = "#ef4444";
        setTimeout(() => {
          document.body.style.backgroundColor = "#0a0b0f";
        }, 200);
      }, 800);

      const dismissTimeout = setTimeout(() => {
        onClose();
      }, 30000);

      return () => {
        clearInterval(soundInterval);
        clearInterval(flashInterval);
        clearTimeout(dismissTimeout);
        document.body.style.backgroundColor = "#0a0b0f";
      };
    }
  }, [sosData, onClose]);

  if (!sosData) return null;

  const lat = sosData.location[0];
  const lng = sosData.location[1];
  const timestamp = new Date(sosData.timestamp).toLocaleTimeString();

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "linear-gradient(135deg, rgba(0,0,0,0.98) 0%, rgba(15,17,23,0.95) 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 99999,
        backdropFilter: "blur(4px)",
      }}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        @keyframes slideIn {
          from { transform: translateY(-30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.3); }
          50% { box-shadow: 0 0 40px rgba(239, 68, 68, 0.6); }
        }
      `}</style>

      <div
        style={{
          textAlign: "center",
          color: "#fff",
          maxWidth: 520,
          width: "100%",
          background: "rgba(23, 25, 35, 0.92)",
          border: "3px solid #ef4444",
          borderRadius: 16,
          padding: 48,
          boxShadow: "0 0 60px rgba(239, 68, 68, 0.25), inset 0 0 30px rgba(239, 68, 68, 0.1)",
          animation: "glow 1s ease-in-out infinite, slideIn 0.4s ease-out",
        }}
      >
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#7b8299', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Realtime status
          </span>
          <span style={{ fontSize: 12, color: socketState === 'connected' ? '#22c55e' : socketState === 'reconnecting' ? '#f59e0b' : '#ef4444' }}>
            {socketState === 'connected' ? 'Connected' : socketState === 'reconnecting' ? 'Reconnecting...' : socketState === 'error' ? 'Connection error' : 'Disconnected'}
          </span>
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#ef4444",
            marginBottom: 16,
            animation: "bounce 0.6s ease-in-out infinite",
          }}
        >
          ⚠
        </div>

        <h1
          style={{
            fontSize: 42,
            fontWeight: 700,
            margin: "0 0 8px",
            color: "#ef4444",
            letterSpacing: "-0.02em",
          }}
        >
          SOS ALERT
        </h1>

        <p
          style={{
            fontSize: 16,
            color: "#4f8ef7",
            margin: "0 0 32px",
            letterSpacing: "0.05em",
            fontWeight: 600,
          }}
        >
          OFFICER IN CRITICAL CONDITION
        </p>

        <div
          style={{
            background: "rgba(239, 68, 68, 0.08)",
            border: "2px solid rgba(239, 68, 68, 0.3)",
            borderRadius: 12,
            padding: 20,
            marginBottom: 32,
          }}
        >
          <p style={{ margin: "0 0 12px", fontSize: 11, color: "#7b8299", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Location
          </p>
          <p style={{ margin: 0, fontSize: 18, fontFamily: "monospace", color: "#22c55e", fontWeight: 600 }}>
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "#7b8299" }}>
            Reported at {timestamp}
          </p>
        </div>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => {
              onNavigate?.(lat, lng);
            }}
            style={{
              background: "#ef4444",
              color: "#fff",
              border: "none",
              padding: "14px 28px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              flex: 1,
              maxWidth: 180,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              transition: "all 0.2s",
              boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#dc2626";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(239, 68, 68, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#ef4444";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.3)";
            }}
          >
            📍 Navigate
          </button>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              color: "#ef4444",
              border: "2px solid #ef4444",
              padding: "14px 28px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              flex: 1,
              maxWidth: 180,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
