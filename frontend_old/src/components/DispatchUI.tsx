import React, { useState, useEffect } from "react";
import { analyticsApi, dispatchApi } from "../utils/api";
import { LoadingSpinner } from "./LoadingSpinner";
import { toastManager } from "../utils/ui";
import type { Officer, DispatchStatus } from "../types";
import { OFFICER_COLORS } from "../types";

interface DispatchUIProps {
  incidentId: string;
  incidentTitle: string;
  onDispatchCreated?: (dispatchId: string) => void;
}

const S = {
  container: {
    background: "#0f1117",
    border: "1px solid #1e2030",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    fontSize: 14,
    fontWeight: 700 as const,
    color: "#e8eaf6",
    marginBottom: 12,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  list: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
    maxHeight: 300,
    overflowY: "auto" as const,
  },
  officer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: 14,
    background: "#11131c",
    borderRadius: 10,
    border: "1px solid #1e2030",
    boxShadow: "0 1px 0 rgba(255,255,255,0.03)",
  },
  officerActive: {
    borderColor: "#4f8ef7",
    background: "rgba(79,142,247,.06)",
  },
  officerInfo: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
    flex: 1,
  },
  officerMeta: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  statusBadge: {
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700 as const,
    textTransform: "uppercase" as const,
    letterSpacing: "0.04em",
  },
  assignButton: {
    padding: "8px 14px",
    borderRadius: 8,
    border: "none",
    fontSize: 12,
    fontWeight: 700 as const,
    cursor: "pointer",
    minWidth: 96,
  },
  status: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    flexShrink: 0,
  },
  info: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 2,
    flex: 1,
  },
  name: {
    fontSize: 13,
    fontWeight: 600 as const,
    color: "#e8eaf6",
  },
  meta: {
    fontSize: 11,
    color: "#7b8299",
  },
  buttons: {
    display: "flex",
    gap: 6,
    marginTop: 12,
  },
  btn: {
    flex: 1,
    padding: "8px 12px",
    borderRadius: 6,
    border: "none",
    fontSize: 12,
    fontWeight: 700 as const,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  autoBtn: {
    background: "#4f8ef7",
    color: "#fff",
  },
  empty: {
    textAlign: "center" as const,
    color: "#7b8299",
    fontSize: 12,
    padding: 24,
  },
};

export function DispatchUI({ incidentId, incidentTitle, onDispatchCreated }: DispatchUIProps) {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOfficer, setSelectedOfficer] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    const loadOfficers = async () => {
      try {
        const response = await analyticsApi.officers();
        setOfficers(response.data.officers || []);
      } catch (error) {
        console.error("Failed to load officers:", error);
        toastManager.error("Failed to load officers");
      } finally {
        setLoading(false);
      }
    };

    loadOfficers();
  }, []);

  const handleAutoAssign = async () => {
    setAssigning(true);
    try {
      const response = await dispatchApi.assign(incidentId, undefined, true);
      toastManager.success(`Officer assigned successfully`);
      onDispatchCreated?.(response.data.dispatchId);
    } catch (error: any) {
      toastManager.error(error.response?.data?.error || "Failed to auto-assign officer");
    } finally {
      setAssigning(false);
    }
  };

  const availableOfficers = officers.filter((o) => o.status === "available");

  const handleManualAssign = async (officerId: string) => {
    setAssigning(true);
    try {
      const response = await dispatchApi.assign(incidentId, officerId, false);
      toastManager.success(`Officer assigned successfully`);
      setOfficers((current) =>
        current.map((officer) =>
          officer.id === officerId ? { ...officer, status: "en_route" } : officer,
        ),
      );
      setSelectedOfficer(null);
      onDispatchCreated?.(response.data.dispatchId);
    } catch (error: any) {
      toastManager.error(error.response?.data?.error || "Failed to assign officer");
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div style={S.container}>
      <div style={S.header}>
        <span>👮</span>
        Dispatch Officer
      </div>

      {loading ? (
        <div style={{ textAlign: "center" as const, padding: "16px" }}>
          <LoadingSpinner size="small" />
        </div>
      ) : officers.length === 0 ? (
        <div style={S.empty}>No officers available</div>
      ) : (
        <>
          <div style={{ marginBottom: 10, color: "#7b8299", fontSize: 12 }}>
            Select an available officer to assign to <strong>{incidentTitle}</strong>. Only available officers can be dispatched.
          </div>
          <div style={S.list}>
            {officers.map((officer) => {
              const available = officer.status === "available";
              const active = selectedOfficer === officer.id;
              return (
                <div
                  key={officer.id}
                  onClick={() => available && setSelectedOfficer(officer.id)}
                  style={{
                    ...S.officer,
                    ...(active ? S.officerActive : {}),
                    opacity: available ? 1 : 0.65,
                    cursor: available ? "pointer" : "default",
                  }}
                >
                  <div style={S.officerInfo}>
                    <div style={S.name}>{officer.name}</div>
                    <div style={S.officerMeta}>
                      <div style={{ ...S.status, background: OFFICER_COLORS[officer.status] ?? "#7b8299" }} />
                      <div style={S.meta}>{available ? "Available" : officer.status.replace("_", " ")}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <div
                      style={{
                        ...S.statusBadge,
                        background: available ? "rgba(34,197,94,.12)" : "rgba(245,158,11,.12)",
                        color: available ? "#22c55e" : "#f59e0b",
                      }}
                    >
                      {available ? "Available" : officer.status.replace("_", " ")}
                    </div>
                    <button
                      onClick={() => available && handleManualAssign(officer.id)}
                      disabled={!available || assigning}
                      style={{
                        ...S.assignButton,
                        background: available ? "#22c55e" : "#1e2030",
                        color: available ? "#fff" : "#7b8299",
                        opacity: assigning ? 0.6 : 1,
                      }}
                    >
                      {assigning && selectedOfficer === officer.id ? "Assigning..." : "Assign"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={S.buttons}>
            <button
              onClick={handleAutoAssign}
              disabled={assigning || availableOfficers.length === 0}
              style={{
                ...S.btn,
                ...S.autoBtn,
                opacity: assigning || availableOfficers.length === 0 ? 0.6 : 1,
                cursor: assigning || availableOfficers.length === 0 ? "not-allowed" : "pointer",
              }}
            >
              {assigning ? "Assigning..." : "Auto-Assign"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
