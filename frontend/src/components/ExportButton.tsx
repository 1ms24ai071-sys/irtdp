import { useState } from 'react';
import { saveSnapshot } from '../api/drift';
import type { Incident } from '../types';
import toast from 'react-hot-toast';

interface ExportButtonProps {
  targetId: string;
  incidents: Incident[];
  label?: string;
  className?: string;
}

type Phase = 'idle' | 'rendering' | 'saving' | 'done';

const TOAST_BASE = {
  fontFamily: '"Share Tech Mono", monospace',
  fontSize: '13px',
  background: '#010828',
  color: '#EFF4FF',
};

export default function ExportButton({ targetId, incidents, label, className = '' }: ExportButtonProps) {
  const [phase, setPhase] = useState<Phase>('idle');

  const handleExport = async () => {
    const el = document.getElementById(targetId);
    if (!el) {
      toast.error('Export target not found.', { style: { ...TOAST_BASE, border: '1px solid rgba(255,60,60,0.35)' } });
      return;
    }

    setPhase('rendering');
    try {
      // Dynamically import to keep initial bundle lean
      const { default: html2canvas } = await import('html2canvas');

      const canvas = await html2canvas(el, {
        backgroundColor: '#010828',
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
        onclone: (doc: Document) => { doc.body.style.background = '#010828'; },
      });

      setPhase('saving');

      const label_text = label ?? `Export ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      saveSnapshot(incidents, label_text);

      const link      = document.createElement('a');
      const ts        = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
      link.download   = `irtdp-snapshot-${ts}.png`;
      link.href       = canvas.toDataURL('image/png', 1.0);
      link.click();

      setPhase('done');
      toast.success('Snapshot exported & saved to trajectory.', {
        duration: 3500, icon: '📸',
        style: { ...TOAST_BASE, border: '1px solid rgba(111,255,0,0.35)' },
      });
      setTimeout(() => setPhase('idle'), 2000);
    } catch (err) {
      console.error('[ExportButton]', err);
      setPhase('idle');
      toast.error('Export failed. Try again.', {
        style: { ...TOAST_BASE, border: '1px solid rgba(255,60,60,0.35)' },
      });
    }
  };

  const icons:  Record<Phase, string> = { idle: '📸', rendering: '⏳', saving: '💾', done: '✓' };
  const labels: Record<Phase, string> = { idle: 'Export Snapshot', rendering: 'Rendering…', saving: 'Saving…', done: 'Exported!' };
  const busy = phase === 'rendering' || phase === 'saving';

  return (
    <button
      onClick={handleExport}
      disabled={busy}
      aria-busy={busy}
      aria-label="Export current dashboard as PNG snapshot"
      className={`flex items-center gap-2 font-mono text-xs tracking-widest uppercase px-4 py-2.5 rounded-xl border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
        phase === 'done'
          ? 'border-neon/50 text-neon bg-neon/8'
          : 'border-white/15 text-cream/50 hover:border-neon/40 hover:text-neon hover:bg-neon/5'
      } ${className}`}
    >
      <span className={busy ? 'animate-pulse' : ''} aria-hidden>{icons[phase]}</span>
      {labels[phase]}
    </button>
  );
}
