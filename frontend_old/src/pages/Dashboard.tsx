import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { incidentApi, analyticsApi } from "../utils/api";
import { toastManager } from "../utils/ui";
import { socketEvents, useSocketEvent } from "../utils/socket";
import type { Incident, Hotspot } from "../types";
import { SEV_COLORS, SEV_LABELS } from "../types";
const S: Record<string,React.CSSProperties> = {
  page:   { padding:32, maxWidth:1200, margin:"0 auto" },
  hdr:    { display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:32 },
  htitle: { color:"#e8eaf6", fontSize:24, fontWeight:700, margin:0, letterSpacing:"-0.02em" },
  hsub:   { color:"#7b8299", fontSize:13, marginTop:4 },
  live:   { display:"flex", alignItems:"center", gap:8, background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.3)", color:"#ef4444", padding:"8px 14px", borderRadius:6, fontSize:12, fontWeight:600 },
  dot:    { width:8, height:8, borderRadius:"50%", background:"#ef4444", animation:"pulse 1s infinite" },
  grid4:  { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:24 },
  error:{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",color:"#ef4444",padding:14,borderRadius:8,marginBottom:20,fontSize:13},
  scard:  { background:"#0f1117", border:"1px solid #1e2030", borderRadius:12, padding:"24px", cursor:"pointer", transition:"all 0.3s ease", position:"relative", overflow:"hidden" },
  scardHover: { borderColor:"#4f8ef7", boxShadow:"0 8px 24px rgba(79,142,247,.15)" },
  sIcon:  { fontSize:28, marginBottom:12 },
  sVal:   { fontSize:36, fontWeight:700, letterSpacing:"-0.02em", marginBottom:4 },
  sLab:   { color:"#e8eaf6", fontSize:14, fontWeight:600, marginBottom:2 },
  sSub:   { color:"#7b8299", fontSize:11 },
  grid2:  { display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 },
  panel:  { background:"#0f1117", border:"1px solid #1e2030", borderRadius:8, padding:24 },
  ptop:   { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 },
  ptitle: { color:"#e8eaf6", fontSize:15, fontWeight:700, margin:0 },
  all:    { color:"#4f8ef7", textDecoration:"none", fontSize:12 },
  anote:  { color:"#4f8ef7", fontSize:11, marginBottom:12, marginTop:-8, fontStyle:"italic" },
  irow:   { display:"flex", alignItems:"center", gap:12, padding:"10px 0", borderBottom:"1px solid #1e2030", textDecoration:"none" },
  sevdot: { width:8, height:8, borderRadius:"50%", flexShrink:0 },
  iinfo:  { flex:1 },
  itit:   { color:"#e8eaf6", fontSize:13, fontWeight:500, display:"block" },
  imeta:  { color:"#7b8299", fontSize:11 },
  sbadge: { fontSize:10, padding:"3px 8px", borderRadius:4, fontWeight:600 },
  hrow:   { display:"flex", alignItems:"center", gap:12, padding:"8px 0", borderBottom:"1px solid #1e2030" },
  hrank:  { width:32, height:32, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff", flexShrink:0 },
  hinfo:  { flex:1 },
  hcoord: { color:"#e8eaf6", fontSize:12, fontFamily:"monospace", display:"block" },
  hcnt:   { color:"#7b8299", fontSize:11 },
  hscore: { display:"flex", flexDirection:"column", alignItems:"flex-end" },
  scLab:  { color:"#7b8299", fontSize:10 },
  scVal:  { fontSize:18, fontWeight:700 },
  algo:   { background:"#0f1117", border:"1px solid #1e2030", borderRadius:8, padding:24 },
  agrid:  { display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginTop:16 },
  acard:  { display:"flex", alignItems:"center", gap:12, padding:"12px 16px", background:"rgba(79,142,247,.05)", borderRadius:6, border:"1px solid rgba(79,142,247,.1)" },
  aon:    { width:8, height:8, borderRadius:"50%", background:"#22c55e", flexShrink:0 },
  aname:  { color:"#e8eaf6", fontSize:12, fontWeight:600 },
  apurp:  { color:"#7b8299", fontSize:11, marginTop:2 },
  empty:  { color:"#7b8299", fontSize:13, textAlign:"center", padding:24 },
};
const RANK_COLORS = ["#ef4444","#f97316","#f59e0b","#84cc16","#22c55e"];
function stBg(st:string):React.CSSProperties {
  const m:Record<string,React.CSSProperties> = {
    reported:{background:"rgba(79,142,247,.15)",color:"#4f8ef7"}, verified:{background:"rgba(34,197,94,.15)",color:"#22c55e"},
    resolved:{background:"rgba(34,197,94,.2)",color:"#22c55e"},   rejected:{background:"rgba(239,68,68,.15)",color:"#ef4444"},
    processing:{background:"rgba(245,158,11,.15)",color:"#f59e0b"}, pending_review:{background:"rgba(245,158,11,.15)",color:"#f59e0b"},
  };
  return m[st] ?? {};
}
export default function Dashboard() {
  const storedUser = localStorage.getItem("user");
  const user = storedUser ? JSON.parse(storedUser) : null;
  const isReporter = user?.role === "reporter";
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [hotspots,  setHotspots]  = useState<Hotspot[]>([]);
  const [total,     setTotal]     = useState(0);
  const [live,      setLive]      = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const fetch = useCallback(async () => {
    setError("");
    if (isReporter) {
      setLoading(false);
      return;
    }
    try {
      const [iR, hR] = await Promise.all([incidentApi.list({ limit:20, sortBy:"severity" }), analyticsApi.hotspots(5)]);
      setIncidents(iR.data.data);
      setTotal(iR.data.pagination.total);
      setHotspots(hR.data.hotspots);
    } catch(e) {
      console.error(e);
      const message = "Unable to load dashboard data. Please try again later.";
      setError(message);
      toastManager.error(message);
    } finally { setLoading(false); }
  }, [isReporter]);
  useEffect(() => {
    fetch();
    if (isReporter) return;
    socketEvents.connect();
  }, [fetch, isReporter]);

  useSocketEvent("socket:connected", () => {
    console.log("Dashboard live socket connected");
  }, []);

  useSocketEvent("socket:disconnected", () => {
    toastManager.warning("Live updates disconnected. Reconnecting...");
  }, []);

  useSocketEvent("incident.new", () => {
    setLive((c) => c + 1);
    fetch();
  }, [fetch]);
  useSocketEvent("incident.updated", fetch, [fetch]);
  useSocketEvent("incident.verified", fetch, [fetch]);
  useSocketEvent("incident.resolved", fetch, [fetch]);
  const crit = incidents.filter(i=>i.severity==="critical").length;
  const high = incidents.filter(i=>i.severity==="high").length;
  const resolved = incidents.filter(i=>i.status==="resolved").length;
  const verified = incidents.filter(i=>i.status==="verified").length;
  const stats = [
    { label:"Total", value:total,  accent:"#4f8ef7", icon:"📋", subtext:"All incidents" },
    { label:"Critical", value:crit, accent:"#ef4444", icon:"🔴", subtext:"Immediate action" },
    { label:"Verified", value:verified, accent:"#22c55e", icon:"✓", subtext:"Confirmed cases" },
    { label:"Resolved", value:resolved, accent:"#8b5cf6", icon:"🎯", subtext:"Completed" },
  ];
  if (loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",color:"#4f8ef7", flexDirection:"column", gap:16}}><style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style><div style={{fontSize:32, animation:"spin 1s linear infinite"}}>⚙</div>Loading…</div>;
  if (isReporter) return (
    <div style={S.page}>
      <header style={S.hdr}>
        <div><h1 style={S.htitle}>Reporter Dashboard</h1><p style={S.hsub}>Submit incidents and stay informed.</p></div>
      </header>
      <div style={S.grid2}>
        <section style={S.panel}>
          <div style={S.ptop}><h2 style={S.ptitle}>Report a new incident</h2><Link to="/report" style={S.all}>Submit →</Link></div>
          <p style={S.anote}>Only reporters can file incidents. Police-only analytics and routing are restricted.</p>
        </section>
        <section style={S.panel}>
          <div style={S.ptop}><h2 style={S.ptitle}>Access policy</h2></div>
          <p style={S.empty}>Your account has limited access to police dashboards, incident routing, and officer tracking.</p>
        </section>
      </div>
    </div>
  );
  return (
    <div style={S.page}>
      <header style={S.hdr}>
        <div><h1 style={S.htitle}>Operations Dashboard</h1><p style={S.hsub}>Real-time incident monitoring</p></div>
        {live > 0 && <div style={S.live}><span style={S.dot}/>{live} new since last visit</div>}
      </header>
      {error && <div style={S.error}>{error}</div>}
      <div style={S.grid4}>
        {stats.map(c => {
          const [hover, setHover] = React.useState(false);
          return (
            <div
              key={c.label}
              onMouseEnter={() => setHover(true)}
              onMouseLeave={() => setHover(false)}
              style={{
                ...S.scard,
                ...(hover ? S.scardHover : {}),
                borderTop: `3px solid ${c.accent}`,
              }}
            >
              <div style={S.sIcon}>{c.icon}</div>
              <div style={{...S.sVal, color:c.accent}}>{c.value}</div>
              <div style={S.sLab}>{c.label}</div>
              <div style={S.sSub}>{c.subtext}</div>
            </div>
          );
        })}
      </div>
      <div style={S.grid2}>
        <section style={S.panel}>
          <div style={S.ptop}><h2 style={S.ptitle}>Recent Incidents</h2><Link to="/incidents" style={S.all}>View all →</Link></div>
          {incidents.slice(0,6).map(inc => (
            <Link key={inc.id} to={`/incidents/${inc.id}`} style={{...S.irow, transition:"all 0.2s", cursor:"pointer"}} onMouseEnter={(e)=>{e.currentTarget.style.background="rgba(79,142,247,.04)";e.currentTarget.style.paddingLeft="12px"}} onMouseLeave={(e)=>{e.currentTarget.style.background="";e.currentTarget.style.paddingLeft="0"}}>
              <div style={{...S.sevdot, background:SEV_COLORS[inc.severity]}}/>
              <div style={S.iinfo}>
                <span style={S.itit}>{inc.title||`Incident ${inc.id.slice(-8)}`}</span>
                <span style={S.imeta}>{inc.category??"Uncategorized"} · {new Date(inc.createdAt).toLocaleDateString()}</span>
              </div>
              <div style={{display:"flex", gap:8, alignItems:"center"}}>
                <span style={{...S.sbadge,...stBg(inc.status), fontSize:11}}>{inc.status.replace("_"," ")}</span>
              </div>
            </Link>
          ))}
          {!incidents.length && <p style={S.empty}>No incidents reported.</p>}
        </section>
        <section style={S.panel}>
          <div style={S.ptop}><h2 style={S.ptitle}>Crime Hotspots</h2><Link to="/hotspots" style={S.all}>Map →</Link></div>
          <p style={S.anote}>K-Means Clustering · {hotspots.length} active clusters</p>
          {hotspots.slice(0,5).map((h,i) => {
            const totalInHotspot = h.incidents.length;
            const criticalInHotspot = h.incidents.filter(inc=>inc.severity==="critical").length;
            return (
              <div key={h.clusterId} style={{...S.hrow, padding:"12px 0"}}>
                <div style={{...S.hrank, background:RANK_COLORS[i]??"#4f8ef7"}}>#{i+1}</div>
                <div style={S.hinfo}>
                  <span style={S.hcoord}>{h.centroid.lat.toFixed(4)}, {h.centroid.lng.toFixed(4)}</span>
                  <span style={S.hcnt}>{totalInHotspot} incidents · {criticalInHotspot} critical</span>
                </div>
                <div style={S.hscore}>
                  <span style={S.scLab}>Risk</span>
                  <span style={{...S.scVal, color: h.severityScore>25?"#ef4444":h.severityScore>15?"#f97316":h.severityScore>5?"#f59e0b":"#22c55e"}}>{h.severityScore.toFixed(1)}</span>
                </div>
              </div>
            );
          })}
          {!hotspots.length && <p style={S.empty}>Insufficient data for clustering.</p>}
        </section>
      </div>
      <section style={S.algo}>
        <h2 style={{...S.ptitle, marginBottom:4}}>Active DAA Algorithms</h2>
        <p style={{color:"#7b8299", fontSize:12, marginBottom:16}}>Real-time data processing pipeline</p>
        <div style={S.agrid}>
          {[
            ["K-Means Clustering",   "Hotspot detection", "🎯"],
            ["Dijkstra's Algorithm", "Shortest route", "🛣"],
            ["Greedy Assignment",    "Resource dispatch", "🚨"],
            ["Merge Sort (D&C)",     "Priority ordering", "📊"],
            ["Binary Search",        "Time-range lookup", "⏱"],
            ["KMP String Matching",  "Keyword detection", "🔍"],
          ].map(([name,purp,emoji]) => (
            <div key={name} style={{...S.acard, cursor:"pointer", transition:"all 0.3s"}} onMouseEnter={(e)=>{e.currentTarget.style.background="rgba(79,142,247,.1)"; e.currentTarget.style.transform="translateY(-2px)"}} onMouseLeave={(e)=>{e.currentTarget.style.background="rgba(79,142,247,.05)"; e.currentTarget.style.transform="translateY(0)"}}>
              <div style={{fontSize:20, marginRight:4}}>{emoji}</div>
              <div><div style={S.aname}>{name}</div><div style={S.apurp}>{purp}</div></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
