import React, { useState, useEffect } from "react";
import { pdfApi, incidentApi } from "../utils/api";
import { LoadingSpinner } from "./LoadingSpinner";
import { toastManager, downloadBlob, formatTime } from "../utils/ui";
import type { Incident, AuditLog } from "../types";

interface AuditAndPDFProps {
  incident: Incident;
  auditLogs?: AuditLog[];
}

const S = {
  container: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    marginTop: 20,
  },
  section: {
    background: "#0f1117",
    border: "1px solid #1e2030",
    borderRadius: 8,
    padding: 16,
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
  log: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 2,
    padding: 12,
    background: "#1a1b22",
    borderRadius: 6,
    border: "1px solid #262d38",
    marginBottom: 8,
    fontSize: 12,
  },
  action: {
    color: "#4f8ef7",
    fontWeight: 700 as const,
    marginBottom: 2,
  },
  time: {
    color: "#7b8299",
    fontSize: 11,
  },
  button: {
    background: "#4f8ef7",
    color: "#fff",
    border: "none",
    padding: "10px 16px",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 700 as const,
    cursor: "pointer",
    width: "100%",
    transition: "all 0.2s",
  },
  empty: {
    textAlign: "center" as const,
    color: "#7b8299",
    fontSize: 12,
    padding: 24,
  },
};

export function AuditAndPDF({ incident, auditLogs = [] }: AuditAndPDFProps) {
  const [generating, setGenerating] = useState(false);
  const [displayLogs, setDisplayLogs] = useState<AuditLog[]>(auditLogs);

  const handleDownloadPDF = async () => {
    setGenerating(true);
    try {
      const response = await pdfApi.generateReport(incident, displayLogs);
      const blob = response.data as Blob;
      downloadBlob(blob, `incident-${incident.id}-report.pdf`);
      toastManager.success("Report downloaded successfully");
    } catch (error: any) {
      console.error("PDF generation error:", error);
      toastManager.error("Failed to generate report");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={S.container}>
      {/* Audit Logs */}
      <div style={S.section}>
        <div style={S.header}>
          <span>📋</span>
          Audit Trail
        </div>

        {displayLogs.length === 0 ? (
          <div style={S.empty}>No audit logs available</div>
        ) : (
          <div style={{ maxHeight: 300, overflowY: "auto" as const }}>
            {displayLogs.map((log, idx) => (
              <div key={idx} style={S.log}>
                <div style={S.action}>{log.action}</div>
                <div style={S.time}>
                  {log.createdAt ? formatTime(log.createdAt) : "Unknown time"}
                </div>
                {log.userId && (
                  <div style={{ color: "#7b8299", fontSize: 11, marginTop: 4 }}>
                    User: {log.userId.substring(0, 8)}...
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </div>

      {/* PDF Report */}
      <div style={S.section}>
        <div style={S.header}>
          <span>📄</span>
          Case Report
        </div>

        <div
          style={{
            background: "#1a1b22",
            borderRadius: 6,
            padding: 16,
            marginBottom: 16,
            textAlign: "center" as const,
          }}
        >
          <div style={{ fontSize: 12, color: "#7b8299", marginBottom: 8 }}>
            Generate a PDF report with:
          </div>
          <ul style={{ fontSize: 11, color: "#7b8299", margin: "0 0 12px" }}>
            <li>Incident details</li>
            <li>Media attachments</li>
            <li>Audit trail</li>
            <li>Response map</li>
          </ul>
        </div>

        <button
          onClick={handleDownloadPDF}
          disabled={generating}
          style={{
            ...S.button,
            opacity: generating ? 0.6 : 1,
            cursor: generating ? "not-allowed" : "pointer",
          }}
        >
          {generating ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <LoadingSpinner size="small" color="#fff" />
              Generating...
            </div>
          ) : (
            "↓ Download Report"
          )}
        </button>
      </div>
    </div>
  );
}
