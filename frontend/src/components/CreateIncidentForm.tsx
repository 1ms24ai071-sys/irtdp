import { useState, useRef, useCallback } from 'react';
import type { DragEvent } from 'react';
import { createIncident } from '../api/incidents';
import { useAsync } from '../hooks/useAsync';
import toast from 'react-hot-toast';

interface FormState {
  title: string;
  description: string;
  latitude: string;
  longitude: string;
}

const INITIAL: FormState = { title: '', description: '', latitude: '', longitude: '' };
const DESC_MAX = 500;

const TOAST_SUCCESS = {
  background: '#010828', border: '1px solid rgba(111,255,0,0.35)',
  color: '#EFF4FF', fontFamily: '"Share Tech Mono", monospace', fontSize: '13px',
};
const TOAST_ERROR = {
  background: '#010828', border: '1px solid rgba(255,60,60,0.35)',
  color: '#EFF4FF', fontFamily: '"Share Tech Mono", monospace', fontSize: '13px',
};

function validate(form: FormState): string | null {
  if (!form.title.trim())       return 'Title is required.';
  if (!form.description.trim()) return 'Description is required.';
  const lat = parseFloat(form.latitude);
  const lng = parseFloat(form.longitude);
  if (form.latitude  && (isNaN(lat) || lat < -90  || lat > 90))  return 'Latitude must be between -90 and 90.';
  if (form.longitude && (isNaN(lng) || lng < -180 || lng > 180)) return 'Longitude must be between -180 and 180.';
  return null;
}

// ── Geolocation button ────────────────────────────────────────────────────────
type GeoState = 'idle' | 'loading' | 'error';

function GeoButton({ onDetect }: { onDetect: (lat: string, lng: string) => void }) {
  const [geoState, setGeoState] = useState<GeoState>('idle');

  const detect = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser.', { style: TOAST_ERROR });
      return;
    }
    setGeoState('loading');
    navigator.geolocation.getCurrentPosition(
      pos => {
        onDetect(pos.coords.latitude.toFixed(6), pos.coords.longitude.toFixed(6));
        setGeoState('idle');
        toast.success('Location detected!', { duration: 2500, style: TOAST_SUCCESS });
      },
      err => {
        setGeoState('error');
        const msg =
          err.code === err.PERMISSION_DENIED  ? 'Location permission denied.' :
          err.code === err.POSITION_UNAVAILABLE ? 'Location unavailable.' : 'Location request timed out.';
        toast.error(msg, { style: TOAST_ERROR });
        setTimeout(() => setGeoState('idle'), 3000);
      },
      { timeout: 8000, enableHighAccuracy: true },
    );
  };

  return (
    <button
      type="button"
      onClick={detect}
      disabled={geoState === 'loading'}
      title="Auto-detect my location"
      className="shrink-0 flex items-center gap-1.5 font-mono text-[10px] tracking-widest uppercase px-3 py-2 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        background: geoState === 'error' ? 'rgba(255,60,60,0.1)' : 'rgba(111,255,0,0.08)',
        border:     geoState === 'error' ? '1px solid rgba(255,60,60,0.35)' : '1px solid rgba(111,255,0,0.25)',
        color:      geoState === 'error' ? '#FF3C3C' : '#6FFF00',
      }}
      aria-label="Auto-detect location using GPS"
    >
      {geoState === 'loading' ? (
        <>
          <svg className="w-3 h-3 animate-spin shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden>
            <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Detecting…
        </>
      ) : geoState === 'error' ? (
        <>⚠ Failed</>
      ) : (
        <>
          <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
          Auto-detect
        </>
      )}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function CreateIncidentForm({ onSuccess }: { onSuccess?: () => void }) {
  const [form,      setForm]      = useState<FormState>(INITIAL);
  const [file,      setFile]      = useState<File | null>(null);
  const [dragOver,  setDragOver]  = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const descLen  = form.description.length;
  const descOver = descLen > DESC_MAX;

  const submitter = useCallback(
    (f: FormState, media: File | null) =>
      createIncident({
        title:       f.title.trim(),
        description: f.description.trim(),
        latitude:    parseFloat(f.latitude)  || 0,
        longitude:   parseFloat(f.longitude) || 0,
        media:       media ?? undefined,
      }),
    [],
  );

  const { loading: submitting, run } = useAsync(submitter);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const handleGeoDetect = (lat: string, lng: string) => {
    setForm(prev => ({ ...prev, latitude: lat, longitude: lng }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (descOver) { setFormError(`Description must be ${DESC_MAX} characters or fewer.`); return; }
    const err = validate(form);
    if (err) { setFormError(err); return; }

    const incident = await run(form, file);
    if (incident) {
      const routingMsg = incident.assignedUnit ? 
        ` Routed to ${incident.assignedUnit.name} (${incident.distanceKm?.toFixed(1)} km, ${incident.etaMinutes?.toFixed(0)} min ETA)` : '';
      toast.success(`Incident #${incident.id.toString().slice(0, 8).toUpperCase()} created${routingMsg}`, {
        duration: 5000, icon: '🚨', style: TOAST_SUCCESS,
      });
      setForm(INITIAL);
      if (onSuccess) onSuccess();
      setFile(null);
      setFormError(null);
    } else {
      toast.error('Failed to create incident. Please try again.', { style: TOAST_ERROR });
    }
  };

  return (
    <section id="create" className="relative py-32 overflow-hidden">
      <div className="blob w-96 h-96 top-0 left-0"   style={{ background: '#6FFF00' }} aria-hidden />
      <div className="blob w-72 h-72 bottom-0 right-20" style={{ background: '#1a3aff' }} aria-hidden />

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-start">

          {/* ── Left: info ── */}
          <div>
            <div className="font-condiment text-neon text-2xl mb-2 tracking-widest">Submit report</div>
            <h2 className="font-grotesk text-cream text-5xl uppercase leading-none mb-6">
              Create<br /><span className="text-neon">Incident</span>
            </h2>
            <p className="font-mono text-cream/40 text-sm leading-relaxed mb-8 max-w-sm">
              Submit a new incident to the IRTDP pipeline. Your report will be
              instantly routed through AI classification and severity scoring.
            </p>

            <div className="space-y-4">
              {[
                { label: 'Instant processing',   desc: 'Events enter the AI pipeline in &lt;200ms'          },
                { label: 'Auto-classification',  desc: 'Multi-modal models assign severity automatically'   },
                { label: 'Responder routing',    desc: 'Alerts dispatched to appropriate teams at once'     },
              ].map(item => (
                <div key={item.label} className="glass p-4 flex items-start gap-4">
                  <span className="text-neon mt-0.5 shrink-0" aria-hidden>▶</span>
                  <div>
                    <div className="font-grotesk text-cream text-sm uppercase tracking-wider">{item.label}</div>
                    <div
                      className="font-mono text-cream/35 text-xs mt-0.5 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: item.desc }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right: form ── */}
          <div className="glass p-8">
            <div className="flex items-center gap-3 mb-7">
              <span className="w-2 h-2 rounded-full bg-neon animate-pulse" aria-hidden />
              <span className="font-mono text-neon text-xs tracking-widest uppercase">New Incident Report</span>
            </div>

            {/* Inline error */}
            {formError && (
              <div
                className="mb-5 flex items-center gap-3 rounded-xl px-4 py-3"
                style={{ background: 'rgba(255,60,60,0.08)', border: '1px solid rgba(255,60,60,0.25)' }}
                role="alert"
                aria-live="assertive"
              >
                <span className="text-red-400 shrink-0" aria-hidden>⚠</span>
                <span className="font-mono text-red-400 text-xs leading-relaxed">{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>

              {/* Title */}
              <div>
                <label htmlFor="inc-title" className="font-mono text-cream/40 text-xs tracking-widest uppercase block mb-2">
                  Incident Title <span className="text-red-400" aria-hidden>*</span>
                </label>
                <input
                  id="inc-title"
                  className="input-glass"
                  name="title"
                  placeholder="e.g. Flooding detected in Zone 4"
                  value={form.title}
                  onChange={handleChange}
                  maxLength={120}
                  disabled={submitting}
                  aria-required="true"
                />
              </div>

              {/* Description with character counter */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="inc-description" className="font-mono text-cream/40 text-xs tracking-widest uppercase">
                    Description <span className="text-red-400" aria-hidden>*</span>
                  </label>
                  <span
                    className={`font-mono text-[10px] tabular-nums transition-colors duration-200 ${
                      descOver         ? 'text-red-400'  :
                      descLen > DESC_MAX * 0.85 ? 'text-yellow-400' :
                                         'text-cream/25'
                    }`}
                    aria-live="polite"
                    aria-label={`${descLen} of ${DESC_MAX} characters used`}
                  >
                    {descLen}/{DESC_MAX}
                  </span>
                </div>
                <textarea
                  id="inc-description"
                  className={`input-glass resize-none transition-all duration-200 ${descOver ? 'border-red-400/50 focus:border-red-400/70' : ''}`}
                  name="description"
                  placeholder="Describe the incident in detail..."
                  rows={4}
                  value={form.description}
                  onChange={handleChange as React.ChangeEventHandler<HTMLTextAreaElement>}
                  disabled={submitting}
                  maxLength={DESC_MAX + 50} /* soft limit — hard enforced in validate */
                  aria-required="true"
                  aria-describedby="desc-counter"
                />
                {descOver && (
                  <p id="desc-counter" className="font-mono text-red-400/70 text-[10px] mt-1">
                    {descLen - DESC_MAX} characters over the limit
                  </p>
                )}
              </div>

              {/* Coordinates + geo button */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-cream/40 text-xs tracking-widest uppercase">
                    Coordinates <span className="text-cream/20 normal-case">(optional)</span>
                  </span>
                  <GeoButton onDetect={handleGeoDetect} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="inc-latitude" className="font-mono text-cream/25 text-[10px] tracking-wider uppercase block mb-1.5">
                      Latitude
                    </label>
                    <input
                      id="inc-latitude"
                      className="input-glass"
                      name="latitude"
                      type="number"
                      step="any"
                      placeholder="12.9716"
                      value={form.latitude}
                      onChange={handleChange}
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label htmlFor="inc-longitude" className="font-mono text-cream/25 text-[10px] tracking-wider uppercase block mb-1.5">
                      Longitude
                    </label>
                    <input
                      id="inc-longitude"
                      className="input-glass"
                      name="longitude"
                      type="number"
                      step="any"
                      placeholder="77.5946"
                      value={form.longitude}
                      onChange={handleChange}
                      disabled={submitting}
                    />
                  </div>
                </div>
              </div>

              {/* File upload */}
              <div>
                <label className="font-mono text-cream/40 text-xs tracking-widest uppercase block mb-2">
                  Media Upload <span className="text-cream/20 normal-case">(optional)</span>
                </label>
                <div
                  role="button"
                  tabIndex={submitting ? -1 : 0}
                  aria-label="Upload media file — click or drop file here"
                  className={`relative border rounded-xl p-5 text-center cursor-pointer transition-all duration-200 outline-none ${
                    dragOver
                      ? 'border-neon bg-neon/5 scale-[1.01]'
                      : 'border-white/10 hover:border-neon/40 bg-white/[0.02] hover:bg-white/[0.04]'
                  } focus-visible:ring-2 focus-visible:ring-neon/50 focus-visible:border-neon/60`}
                  onClick={() => !submitting && fileRef.current?.click()}
                  onKeyDown={e => e.key === 'Enter' && !submitting && fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    className="sr-only"
                    accept="image/*,video/*,audio/*"
                    onChange={e => setFile(e.target.files?.[0] ?? null)}
                    disabled={submitting}
                    aria-hidden
                  />
                  {file ? (
                    <div className="flex items-center justify-center gap-3 flex-wrap">
                      <span className="text-neon text-lg" aria-hidden>📎</span>
                      <div className="text-left">
                        <div className="font-mono text-cream text-xs truncate max-w-[160px]">{file.name}</div>
                        <div className="font-mono text-cream/30 text-[10px]">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                      </div>
                      <button
                        type="button"
                        className="font-mono text-cream/30 hover:text-red-400 text-xs transition-colors px-2 py-1 rounded"
                        onClick={e => { e.stopPropagation(); setFile(null); }}
                        aria-label="Remove selected file"
                      >
                        ✕ Remove
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="text-2xl mb-2 opacity-50" aria-hidden>📁</div>
                      <div className="font-mono text-cream/28 text-xs leading-relaxed">
                        Drop media here or click to browse
                        <br />
                        <span className="text-cream/15">Images, videos, audio — max 50MB</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || descOver}
                className="btn-neon w-full flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                aria-busy={submitting}
              >
                {submitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24" aria-hidden>
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processing…
                  </>
                ) : '🚨 Submit Incident Report'}
              </button>

              <p className="font-mono text-cream/15 text-[10px] text-center leading-relaxed">
                Reports are processed in real time by the IRTDP AI pipeline.
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
