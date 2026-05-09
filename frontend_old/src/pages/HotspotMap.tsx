import React, { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import { analyticsApi, sosApi } from "../utils/api";
import { socketEvents, useSocketEvent } from "../utils/socket";
import { toastManager } from "../utils/ui";
import { useAuth } from "../App";
import type { Hotspot, ResourceAssign, Incident } from "../types";
import 'leaflet/dist/leaflet.css';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

type IncidentWithCluster = Incident & { cid: number; hs?: Hotspot };

// Fix for default markers in react-leaflet
import L from 'leaflet';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

const START_ICON = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
});
const END_ICON = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
});

const SELECTED_INCIDENT_ICON = new L.DivIcon({
  html: '<div style="width:24px;height:24px;border:3px solid #4f8ef7;border-radius:50%;background:#131827;box-shadow:0 0 20px rgba(79,142,247,0.7);"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  className: '',
});

const COLORS = ["#ef4444", "#f97316", "#f59e0b", "#22c55e", "#4f8ef7", "#a855f7", "#ec4899"];
const SEV_W: Record<string, string> = { critical: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#22c55e" };
const S: Record<string, React.CSSProperties> = {
  page: { padding: 32, maxWidth: 1200, margin: "0 auto",  },

  hdr: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  title: { color: "#e8eaf6", fontSize: 24, fontWeight: 700, margin: 0 },
  sub: { color: "#4f8ef7", fontSize: 12, marginTop: 4, fontStyle: "italic" },
  ctrl: { display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, },

  cl: { color: "#7b8299", fontSize: 11, fontWeight: 700 },
  kbtns: { display: "flex", gap: 6, },

  kb: { background: "#0f1117", border: "1px solid #1e2030", color: "#7b8299", padding: "6px 14px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 },
  kba: { background: "rgba(79,142,247,.15)", borderColor: "#4f8ef7", color: "#4f8ef7" },
  grid: { display: "grid", gridTemplateColumns: "1fr 300px", gap: 16,  },

  map: { background: "#0f1117", border: "1px solid #1e2030", borderRadius: 8, overflow: "hidden" },
  mhdr: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #1e2030" },
  mttl: { color: "#e8eaf6", fontSize: 14, fontWeight: 700 },
  mnote: { color: "#7b8299", fontSize: 12 },
  mload: { display: "flex", alignItems: "center", justifyContent: "center", height: 400, color: "#7b8299", fontSize: 13, textAlign: "center", padding: 24,  },

  side: { display: "flex", flexDirection: "column", gap: 12 },
  ac: { background: "#0f1117", border: "1px solid #1e2030", borderRadius: 8, padding: 16 },
  att: { color: "#e8eaf6", fontSize: 13, fontWeight: 700, margin: "0 0 12px" },
  ast: { display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 10 },
  anum: { width: 22, height: 22, background: "rgba(79,142,247,.15)", color: "#4f8ef7", borderRadius: 4, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  an: { color: "#e8eaf6", fontSize: 12, fontWeight: 600 },
  ad: { color: "#7b8299", fontSize: 11, marginTop: 2 },
  hc: { background: "#0f1117", border: "1px solid #1e2030", borderRadius: 8, padding: 16 },
  hct: { display: "flex", alignItems: "center", gap: 8, color: "#e8eaf6", fontSize: 13, fontWeight: 700, margin: "0 0 12px" },
  cd: { width: 10, height: 10, borderRadius: "50%" },
  hst: { display: "flex", gap: 16, marginBottom: 10 },
  hs: { display: "flex", flexDirection: "column", alignItems: "center" },
  hsv: { fontSize: 24, fontWeight: 700, color: "#e8eaf6" },
  hsl: { color: "#7b8299", fontSize: 10 },
  coord: { color: "#7b8299", fontSize: 11, fontFamily: "monospace", marginBottom: 10 },
  br: { display: "flex", flexDirection: "column", gap: 6 },
  sr: { display: "flex", alignItems: "center", gap: 8 },
  sl: { color: "#7b8299", fontSize: 10, width: 48, textTransform: "capitalize" },
  sb: { flex: 1, height: 5, background: "#1e2030", borderRadius: 3, overflow: "hidden" },
  sf: { height: "100%", borderRadius: 3 },
  sc: { color: "#e8eaf6", fontSize: 11, width: 20, textAlign: "right" },
  ap: { background: "#0f1117", border: "1px solid #1e2030", borderRadius: 8, padding: 16 },
  anote2: { color: "#7b8299", fontSize: 11, marginTop: -8, marginBottom: 10 },
  ar: { display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid #1e2030" },
  ai: { display: "flex", flexDirection: "column", gap: 2 },
  aid: { color: "#e8eaf6", fontSize: 11, fontFamily: "monospace" },
  adi: { color: "#7b8299", fontSize: 10 },
  lp: { background: "#0f1117", border: "1px solid #1e2030", borderRadius: 8, padding: 16 },
  lr: { display: "flex", alignItems: "center", gap: 10, padding: "8px", borderRadius: 6, cursor: "pointer", marginBottom: 4 },
  lra: { background: "rgba(79,142,247,.08)" },
  rb: { width: 28, height: 28, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0 },
  li2: { flex: 1, display: "flex", flexDirection: "column", gap: 2 },
  ll: { color: "#e8eaf6", fontSize: 12 },
  lc2: { color: "#7b8299", fontSize: 10, fontFamily: "monospace" },
  lsc: { color: "#ef4444", fontSize: 16, fontWeight: 700 },
  empty: { color: "#7b8299", fontSize: 12, textAlign: "center", padding: 12 },
};

const MapEvents = ({ selectedIncident }: { selectedIncident: Incident | null }) => {
  const map = useMap();
  useEffect(() => {
    if (selectedIncident) {
      map.flyTo([selectedIncident.lat, selectedIncident.lng], 15, { animate: true, duration: 1.2 });
    }
  }, [selectedIncident, map]);
  return null;
};

export default function HotspotMap() {
  const { user } = useAuth();
  const isPolice = user?.role === 'police' || user?.role === 'admin';
  const [mode, setMode] = useState<'public'|'police'>('public');
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [assigns, setAssigns] = useState<ResourceAssign[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [k, setK] = useState(5);
  const [loading, setLoading] = useState(true);
  const [socketStatus, setSocketStatus] = useState<'connected'|'disconnected'|'reconnecting'|'error'>('disconnected');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedIncident, setSelectedIncident] = useState<IncidentWithCluster | null>(null);
  const [retrying, setRetrying] = useState(false);

  const handleRetry = () => {
    setRetrying(true);
    setError("");
    setRefreshKey((prev) => prev + 1);
    setTimeout(() => setRetrying(false), 500);
  };
  const [route, setRoute] = useState<[number, number][] | null>(null);
  const [routeInfo, setRouteInfo] = useState<{distance:number;duration:number}|null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [sosActive, setSosActive] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMode(isPolice ? 'police' : 'public');
  }, [isPolice]);

  useEffect(() => {
    if (isPolice && mode === 'police') {
      socketEvents.connect();
    }
  }, [isPolice, mode]);

  useSocketEvent('socket:connected', () => setSocketStatus('connected'), [isPolice, mode]);
  useSocketEvent('socket:disconnected', () => setSocketStatus('disconnected'), [isPolice, mode]);
  useSocketEvent('socket:reconnect_attempt', () => setSocketStatus('reconnecting'), [isPolice, mode]);
  useSocketEvent('socket:error', () => setSocketStatus('error'), [isPolice, mode]);

  useSocketEvent('officer.location.update', (update: any) => {
    if (!isPolice || mode !== 'police' || !update || !update.id) return;
    setOfficers((current) => {
      const next = current.map((officer) => (officer.id === update.id ? { ...officer, ...update } : officer));
      return next.some((officer) => officer.id === update.id) ? next : [...current, update];
    });
  }, [isPolice, mode]);

  useSocketEvent('incident.updated', (update: any) => {
    if (!update || !update.id) return;
    setRefreshKey((prev) => prev + 1);
    if (selectedIncident?.id === update.id) {
      setSelectedIncident((prev) => prev ? { ...prev, ...update } : prev);
    }
  }, [selectedIncident, isPolice, mode]);

  useSocketEvent('sos.triggered', () => {
    toastManager.info('New SOS alert received.');
  }, [isPolice, mode]);

  const calculateDistanceKm = (path:[number, number][]) => {
    const toRad = (deg:number) => deg * Math.PI / 180;
    let total = 0;
    for (let i = 1; i < path.length; i += 1) {
      const [lat1, lng1] = path[i - 1];
      const [lat2, lng2] = path[i];
      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      total += 6371 * c;
    }
    return total;
  };

  const calculateRouteInfo = (path:[number, number][]) => {
    const distance = calculateDistanceKm(path);
    const averageSpeedKmh = 35;
    const duration = (distance / averageSpeedKmh) * 60;
    return { distance, duration };
  };

  const triggerSOS = async () => {
    if (!userLocation) {
      toastManager.error("Location access required for SOS.");
      return;
    }
    setSosActive(true);
    try {
      socketEvents.emit('sos:triggered', {
        userId: user?.id,
        location: userLocation,
        timestamp: new Date().toISOString(),
      });
      await sosApi.trigger(userLocation);
      toastManager.success("SOS alert sent. Help is on the way.");
    } catch (error: any) {
      console.error('SOS failed:', error);
      const message = error?.message || "SOS failed to send. Please call emergency services directly.";
      toastManager.error(message);
      setError(message);
    } finally {
      setSosActive(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [h, r, o] = await Promise.all([
          analyticsApi.hotspots(k),
          analyticsApi.routes().catch(() => ({ data: { assignments: [] } })),
          isPolice && mode === 'police' ? analyticsApi.officers().catch(() => ({ data: { officers: [] } })) : Promise.resolve({ data: { officers: [] } }),
        ]);
        const filtered = h.data.hotspots
          .map((cluster:any) => ({
            ...cluster,
            incidents: cluster.incidents.filter((incident:any) => incident.status === 'verified' && (incident.severity === 'high' || incident.severity === 'critical')),
          }))
          .filter((cluster:any) => cluster.incidents.length > 0);

        setHotspots(h.data.hotspots);
        setAssigns(r.data.assignments ?? []);
        setOfficers(o.data.officers ?? []);
        if (filtered.length && filtered[0].incidents.length) {
          const first = filtered[0].incidents[0];
          setSelectedIncident((prev) => prev ?? ({ ...first, cid: filtered[0].clusterId, hs: filtered[0] }));
        }
      } catch (error) {
        console.error(error);
        const message = "Unable to load hotspot data. Please check your connection.";
        setError(message);
        toastManager.error(message);
      } finally {
        setLoading(false);
      }
    };
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [k, isPolice, mode, refreshKey]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setUserLocation([coords.latitude, coords.longitude]),
      () => undefined,
      { enableHighAccuracy: false, timeout: 5000 },
    );
  }, []);

  const filteredHotspots = hotspots
    .map((h) => ({
      ...h,
      incidents: h.incidents.filter((incident) => {
        const isVerified = incident.status === 'verified';
        const highSeverity = incident.severity === 'high' || incident.severity === 'critical';
        return isVerified && highSeverity;
      }),
    }))
    .filter((h) => h.incidents.length > 0);

  const incidentsToShow: IncidentWithCluster[] = filteredHotspots.flatMap((h) => h.incidents.map((i) => ({ ...i, cid: h.clusterId, hs: h })));

  const center: [number, number] = incidentsToShow.length > 0
    ? [
      incidentsToShow.reduce((sum, i) => sum + i.lat, 0) / incidentsToShow.length,
      incidentsToShow.reduce((sum, i) => sum + i.lng, 0) / incidentsToShow.length,
    ]
    : [12.9716, 77.5946];

  const handleMarkerClick = (incident: IncidentWithCluster) => {
    setSelectedIncident(incident);
    setRoute(null);
    setRouteInfo(null);
  };


  useEffect(() => {
    if (!isPolice || mode !== 'police' || !selectedIncident || !userLocation) {
      if (mode !== 'police' || !isPolice) {
        setRoute(null);
        setRouteInfo(null);
      }
      setRouteLoading(false);
      return;
    }

    const loadRoute = async () => {
      setRouteLoading(true);
      try {
        const { data } = await analyticsApi.route(userLocation[0], userLocation[1], selectedIncident.lat, selectedIncident.lng);
        const path = data.path as [number, number][];
        setRoute(path);
        setRouteInfo(calculateRouteInfo(path));
      } catch (error) {
        console.error('Route generation failed', error);
        setRoute(null);
        setRouteInfo(null);
      } finally {
        setRouteLoading(false);
      }
    };

    loadRoute();
  }, [isPolice, mode, selectedIncident, userLocation]);

  return (
    <div style={S.page}>
      <header style={S.hdr}>
        <div><h1 style={S.title}>Hotspot Analysis</h1><p style={S.sub}>K-Means · Dijkstra · Greedy Assignment</p></div>
        <div style={S.ctrl}>
          {isPolice && (
            <button
              style={{ ...S.kb, background: sosActive ? '#ef4444' : '#dc2626', color: 'white', marginRight: 16 }}
              onClick={triggerSOS}
              disabled={sosActive}
            >
              🚨 {sosActive ? 'SENDING SOS...' : 'SOS ALERT'}
            </button>
          )}
          <label style={S.cl}>Clusters (k)</label>
          <div style={S.kbtns}>{[3, 4, 5, 6, 8].map((v) => (
            <button key={v} style={{ ...S.kb, ...(k === v ? S.kba : {}) }} onClick={() => setK(v)}>{v}</button>
          ))}</div>
          {isPolice ? (
            <button style={{ ...S.kb, marginLeft: 16 }} onClick={() => setMode(mode === 'public' ? 'police' : 'public')}>
              {mode === 'public' ? 'Police View' : 'Public View'}
            </button>
          ) : (
            <div style={{ ...S.kb, ...S.kba, marginLeft: 16 }}>Public View</div>
          )}
        </div>
      </header>
      <div style={S.grid}>
        <div style={S.map}>
          <div style={S.mhdr}>
            <div>
              <span style={S.mttl}>Interactive Incident Map</span>
              <div style={S.mnote}>{incidentsToShow.length} verified high/critical incidents</div>
            </div>
            <span style={{ ...S.mnote, fontSize: 11, color: socketStatus === 'connected' ? '#22c55e' : socketStatus === 'reconnecting' ? '#f59e0b' : '#f97316' }}>
              {socketStatus === 'connected' ? 'Live updates enabled' : socketStatus === 'reconnecting' ? 'Realtime reconnecting' : 'Realtime unavailable'}
            </span>
          </div>
          {error && (
            <div style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", color: "#ef4444", padding: 14, borderRadius: 8, margin: "0 16px 16px", textAlign: "center" }}>
              <div>{error}</div>
              <button
                onClick={handleRetry}
                style={{ marginTop: 12, background: '#4f8ef7', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 8, cursor: 'pointer' }}
                disabled={retrying}
              >
                {retrying ? 'Retrying…' : 'Retry'}
              </button>
            </div>
          )}
          {loading ? <div style={S.mload}>Loading hotspots…</div>
            : incidentsToShow.length === 0 ? <div style={S.mload}>No incidents available.</div>
            : (
              <MapContainer center={center} zoom={12} style={{ height: 500, width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
                <MapEvents selectedIncident={selectedIncident} />
                {filteredHotspots.map((h) => (
                  <Circle
                    key={`cluster-${h.clusterId}`}
                    center={[h.centroid.lat, h.centroid.lng]}
                    radius={Math.min(300 + h.incidents.length * 50, 1000)}
                    pathOptions={{
                      color: COLORS[h.clusterId % COLORS.length],
                      fillColor: COLORS[h.clusterId % COLORS.length],
                      fillOpacity: 0.2,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <div>
                        <strong>Cluster {h.clusterId + 1}</strong><br />
                        {h.incidents.length} incidents<br />
                        Risk Score: {h.severityScore}<br />
                        Center: {h.centroid.lat.toFixed(4)}, {h.centroid.lng.toFixed(4)}
                      </div>
                    </Popup>
                  </Circle>
                ))}
                <MarkerClusterGroup showCoverageOnHover={false} spiderfyOnMaxZoom>
                  {incidentsToShow.map((incident) => (
                    <Marker key={incident.id} position={[incident.lat, incident.lng]} eventHandlers={{ click: () => handleMarkerClick(incident) }}>
                      <Popup>
                        {mode === 'public' ? (
                          <div>
                            <strong>{incident.title ?? `Incident ${incident.id.slice(-8)}`}</strong><br />
                            Severity: {incident.severity}
                          </div>
                        ) : (
                          <div>
                            <strong>{incident.title}</strong><br />
                            Severity: {incident.severity}<br />
                            Category: {incident.category}<br />
                            Status: {incident.status}<br />
                            Reported by: {incident.reporterName ?? 'Anonymous'}
                          </div>
                        )}
                      </Popup>
                    </Marker>
                  ))}
                </MarkerClusterGroup>
                {userLocation && mode === 'police' && route && (
                  <Marker position={userLocation} icon={START_ICON}>
                    <Popup>Officer start location</Popup>
                  </Marker>
                )}
                {mode === 'police' && selectedIncident && route && (
                  <Marker position={[selectedIncident.lat, selectedIncident.lng]} icon={END_ICON}>
                    <Popup>Incident destination</Popup>
                  </Marker>
                )}
                {userLocation && !route && (
                  <Marker
                    position={userLocation}
                    icon={START_ICON}
                  >
                    <Popup>You are here</Popup>
                  </Marker>
                )}
                {mode === 'police' && officers.map((officer) => (
                  <Marker
                    key={officer.id}
                    position={[officer.lat, officer.lng]}
                    icon={new L.Icon({
                      iconUrl: officer.status === 'available' ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png' :
                             officer.status === 'en_route' ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png' :
                             'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
                      iconSize: [25, 41],
                      iconAnchor: [12, 41],
                      popupAnchor: [1, -34],
                      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    })}
                  >
                    <Popup>
                      <div>
                        <strong>{officer.name}</strong><br />
                        Status: {officer.status}<br />
                        Last Update: {new Date(officer.lastUpdate).toLocaleTimeString()}
                      </div>
                    </Popup>
                  </Marker>
                ))}
                {mode === 'police' && route && <Polyline positions={route} color="#4f8ef7" weight={4} />}

              </MapContainer>
            )}
        </div>
        <div style={S.side}>
          <section style={S.ac}>
            <h3 style={S.att}>Algorithm Pipeline</h3>
            {[["1", "K-Means Clustering", `Groups ${hotspots.flatMap((h) => h.incidents).length} incidents into ${k} clusters`], ["2", "Dijkstra's Algorithm", "Shortest police response route"], ["3", "Greedy Assignment", `${assigns.length} resources dispatched`]].map(([n, name, desc]) => (
              <div key={n} style={S.ast}><span style={S.anum}>{n}</span><div><div style={S.an}>{name}</div><div style={S.ad}>{desc}</div></div></div>
            ))}
          </section>
          {selectedIncident && (
            <section style={S.hc}>
              <h3 style={S.hct}><span style={{ ...S.cd, background: COLORS[selectedIncident.cid ?? 0] }} /> Selected Incident</h3>
              <div style={S.hst}><div style={S.hs}><span style={S.hsv}>{selectedIncident.title ?? selectedIncident.id.slice(-8)}</span><span style={S.hsl}>{selectedIncident.status}</span></div></div>
              <div style={S.coord}>{selectedIncident.lat.toFixed(4)}, {selectedIncident.lng.toFixed(4)}</div>
              {mode === 'police' && (
                <div style={{ marginTop: 10, color: '#7b8299', fontSize: 12 }}>
                  Category: {selectedIncident.category ?? 'Unknown'}<br />
                  Severity: {selectedIncident.severity}<br />
                  Reported by: {selectedIncident.reporterName ?? 'Anonymous'}
                </div>
              )}
              {mode === 'police' && (
                <div style={{ marginTop: 14, padding: '12px 14px', background: '#090b10', borderRadius: 8, border: '1px solid #1e2030' }}>
                  <div style={{ color: '#7b8299', fontSize: 12, marginBottom: 8 }}>Route summary</div>
                  {routeLoading ? (
                    <div style={{ color: '#7b8299', fontSize: 12 }}>Calculating best police route…</div>
                  ) : routeInfo ? (
                    <>
                      <div style={{ color: '#e8eaf6', fontSize: 13 }}>Distance: {routeInfo.distance.toFixed(2)} km</div>
                      <div style={{ color: '#7b8299', fontSize: 12 }}>Estimated response: {Math.round(routeInfo.duration)} mins</div>
                    </>
                  ) : userLocation ? (
                    <div style={{ color: '#f97316', fontSize: 12 }}>Unable to calculate route. Check network or location access.</div>
                  ) : (
                    <div style={{ color: '#7b8299', fontSize: 12 }}>Waiting for officer location to calculate route.</div>
                  )}
                </div>
              )}
            </section>
          )}
          {assigns.length > 0 && (
            <section style={S.ap}>
              <h3 style={S.att}>Resource Dispatch</h3>
              <p style={S.anote2}>Greedy nearest-first</p>
              {assigns.slice(0, 5).map((assignment, index) => (
                <div key={index} style={S.ar}><span>🚓</span><div style={S.ai}><span style={S.aid}>{assignment.resourceId.slice(0, 8)}…</span><span style={S.adi}>{assignment.distanceKm.toFixed(2)} km</span></div></div>
              ))}
            </section>
          )}
          <section style={S.lp}>
            <h3 style={S.att}>All Hotspots</h3>
            {filteredHotspots.map((h, index) => (
              <div
                key={h.clusterId}
                style={{ ...S.lr, ...(selectedIncident?.cid === h.clusterId ? S.lra : {}) }}
                onClick={() => {
                  if (h.incidents.length) {
                    const incident = h.incidents[0];
                    setSelectedIncident({ ...incident, cid: h.clusterId, hs: h });
                  }
                }}
              >
                <div style={{ ...S.rb, background: COLORS[h.clusterId % COLORS.length] }}>#{index + 1}</div>
                <div style={S.li2}><span style={S.ll}>{h.incidents.length} incidents</span><span style={S.lc2}>{h.centroid.lat.toFixed(3)}, {h.centroid.lng.toFixed(3)}</span></div>
                <span style={S.lsc}>{h.severityScore}</span>
              </div>
            ))}
            {!hotspots.length && !loading && <p style={S.empty}>No hotspots. Add incidents first.</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
