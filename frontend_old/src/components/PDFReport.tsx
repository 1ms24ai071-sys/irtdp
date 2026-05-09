import React, { useState } from "react";
import { jsPDF } from "jspdf";
import { downloadBlob, formatDate } from "../utils/ui";
import type { Incident, Officer } from "../types";

interface PDFReportProps {
  incident: Incident;
  assignedOfficer?: Officer | null;
}

const S: Record<string, React.CSSProperties> = {
  container: {
    background: "#0f1117",
    border: "1px solid #1e2030",
    borderRadius: 12,
    padding: 18,
    maxWidth: 420,
    width: "100%",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: "#e8eaf6",
    margin: 0,
  },
  subtitle: {
    fontSize: 12,
    color: "#7b8299",
    margin: 0,
  },
  button: {
    width: "100%",
    padding: "12px 14px",
    background: "#4f8ef7",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 700,
    transition: "all 0.2s",
  },
  buttonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  hint: {
    marginTop: 12,
    color: "#7b8299",
    fontSize: 12,
    lineHeight: 1.5,
  },
};

const formatDateTime = (value: string) => {
  const date = new Date(value);
  return `${formatDate(value)} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};

export default function PDFReport({ incident, assignedOfficer }: PDFReportProps) {
  const [loading, setLoading] = useState(false);

  const buildLine = (doc: jsPDF, label: string, value: string, x: number, y: number) => {
    doc.setFontSize(11);
    doc.setTextColor(75, 85, 99);
    doc.text(`${label}:`, x, y);
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text(value, x + 90, y);
  };

  const handleGenerate = async () => {
    setLoading(true);

    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const margin = 40;
      let y = 56;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("Incident Report", margin, y);

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      y += 20;
      doc.text(`Report generated: ${formatDateTime(new Date().toISOString())}`, margin, y);
      y += 24;

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, y, 555, y);
      y += 24;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Incident Details", margin, y);
      y += 18;

      doc.setFont("helvetica", "normal");
      buildLine(doc, "Title", incident.title || "Untitled", margin, y);
      y += 18;
      buildLine(doc, "ID", incident.id, margin, y);
      y += 18;
      buildLine(doc, "Severity", incident.severity, margin, y);
      y += 18;
      buildLine(doc, "Status", incident.status, margin, y);
      y += 18;
      buildLine(doc, "Reported", formatDateTime(incident.createdAt), margin, y);
      y += 18;
      buildLine(doc, "Location", incident.address || `${incident.lat.toFixed(5)}, ${incident.lng.toFixed(5)}`, margin, y);
      y += 18;
      buildLine(doc, "Assigned Officer", assignedOfficer?.name ?? "Unassigned", margin, y);
      y += 30;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Summary", margin, y);
      y += 18;

      doc.setFont("helvetica", "normal");
      const description = incident.description?.trim() || "No description provided.";
      const lines = doc.splitTextToSize(description, 515);
      doc.text(lines, margin, y);
      y += lines.length * 16 + 20;

      if (assignedOfficer) {
        doc.setFont("helvetica", "bold");
        doc.text("Officer Details", margin, y);
        y += 18;
        doc.setFont("helvetica", "normal");
        buildLine(doc, "Name", assignedOfficer.name, margin, y);
        y += 18;
        buildLine(doc, "Role", assignedOfficer.role ?? "N/A", margin, y);
        y += 18;
        buildLine(doc, "Status", assignedOfficer.status ?? "N/A", margin, y);
      }

      const blob = doc.output("blob");
      downloadBlob(blob, `incident-report-${incident.id.slice(0, 8)}.pdf`);
    } catch (error) {
      console.error("PDF generation failed", error);
      alert("Unable to generate PDF report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={S.container}>
      <div style={S.header}>
        <div>
          <h2 style={S.title}>PDF Report</h2>
          <p style={S.subtitle}>Generate a downloadable incident report for sharing and auditing.</p>
        </div>
      </div>

      <button
        type="button"
        style={{
          ...S.button,
          ...(loading ? S.buttonDisabled : {}),
        }}
        onClick={handleGenerate}
        disabled={loading}
      >
        {loading ? "⏳ Generating…" : "📄 Generate Incident PDF"}
      </button>

      <p style={S.hint}>
        The report includes incident details, location, timestamp, and assigned officer information.
      </p>
    </div>
  );
}
