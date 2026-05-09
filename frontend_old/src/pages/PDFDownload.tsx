import React, { useState } from 'react';
import { Incident } from '../types';

const S = {
  cont: { padding: '16px' },
  btn: { width: '100%', padding: '12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' },
  btnHover: { background: '#059669' },
  btnDisabled: { background: '#4b5563', cursor: 'not-allowed', opacity: 0.5 },
  statMsg: { marginTop: '8px', fontSize: '12px', padding: '8px', borderRadius: '4px', textAlign: 'center' as const },
  success: { background: '#10b98122', color: '#34d399' },
  error: { background: '#ef444422', color: '#f87171' },
};

interface PDFDownloadProps {
  incident: Incident;
  onGeneratePDF?: (incident: Incident) => Promise<Blob>;
}

export default function PDFDownload({ incident, onGeneratePDF }: PDFDownloadProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  const handleDownloadPDF = async () => {
    setLoading(true);
    setStatus({ type: null, message: '' });

    try {
      let pdfBlob: Blob;

      if (onGeneratePDF) {
        pdfBlob = await onGeneratePDF(incident);
      } else {
        // Fallback: Generate simple HTML and convert to PDF
        const htmlContent = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Incident Report - ${incident.id}</title>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                h1 { color: #1f2937; }
                .section { margin-bottom: 20px; }
                .label { font-weight: bold; color: #4b5563; }
                .value { color: #1f2937; }
              </style>
            </head>
            <body>
              <h1>${incident.title}</h1>
              <div class="section">
                <div class="label">ID:</div>
                <div class="value">${incident.id}</div>
              </div>
              <div class="section">
                <div class="label">Description:</div>
                <div class="value">${incident.description || 'N/A'}</div>
              </div>
              <div class="section">
                <div class="label">Location:</div>
                <div class="value">${incident.address || 'N/A'} (${incident.lat}, ${incident.lng})</div>
              </div>
              <div class="section">
                <div class="label">Severity:</div>
                <div class="value">${incident.severity}</div>
              </div>
              <div class="section">
                <div class="label">Status:</div>
                <div class="value">${incident.status}</div>
              </div>
              <div class="section">
                <div class="label">Created:</div>
                <div class="value">${new Date(incident.createdAt).toLocaleString()}</div>
              </div>
            </body>
          </html>
        `;

        // Use browser's print-to-PDF capability
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(htmlContent);
          newWindow.document.close();
          // Browser's print dialog will handle saving as PDF
          newWindow.print();
        }

        setStatus({ type: 'success', message: 'PDF ready for download. Check your print dialog.' });
        setLoading(false);
        return;
      }

      // Download the blob
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `incident-${incident.id.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setStatus({ type: 'success', message: 'PDF downloaded successfully' });
    } catch (err) {
      console.error('PDF download failed:', err);
      setStatus({ type: 'error', message: 'Failed to generate PDF' });
    } finally {
      setLoading(false);
      setTimeout(() => setStatus({ type: null, message: '' }), 3000);
    }
  };

  return (
    <div style={S.cont}>
      <button
        style={{
          ...S.btn,
          ...(loading ? S.btnDisabled : {}),
        }}
        onClick={handleDownloadPDF}
        disabled={loading}
      >
        {loading ? '⏳' : '📄'} {loading ? 'Generating PDF…' : 'Download as PDF'}
      </button>
      {status.message && (
        <div style={{ ...S.statMsg, ...(status.type === 'success' ? S.success : S.error) }}>
          {status.message}
        </div>
      )}
    </div>
  );
}
