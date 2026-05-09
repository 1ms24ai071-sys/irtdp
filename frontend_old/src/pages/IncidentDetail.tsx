import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { incidentApi } from "../utils/api";
import type { Incident, Media } from "../types";
import { SEV_COLORS, SEV_LABELS, STATUS_LABELS } from "../types";
import { useAuth } from "../App";
import { toastManager } from "../utils/ui";
import DispatchUI from "./DispatchUI";
import AuditLogs from "./AuditLogs";
import PDFDownload from "./PDFDownload";
const RISK_C:Record<string,string>={low:"#22c55e",medium:"#f59e0b",high:"#ef4444"};
const MSTAT_C:Record<string,string>={processed:"#22c55e",processing:"#f59e0b",failed:"#ef4444",flagged:"#f97316",uploaded:"#4f8ef7"};
const SBTN_C:Record<string,string>={verified:"#22c55e",resolved:"#4f8ef7",rejected:"#ef4444"};
const S:Record<string,React.CSSProperties>={
  page:{padding:32,maxWidth:1100,margin:"0 auto"},
  load:{display:"flex",alignItems:"center",justifyContent:"center",height:"60vh",color:"#7b8299",fontFamily:"'IBM Plex Mono',monospace"},
  bc:{display:"flex",alignItems:"center",marginBottom:20,fontSize:13},
  bl:{color:"#4f8ef7",cursor:"pointer"},bs:{color:"#1e2030",margin:"0 8px"},bc2:{color:"#7b8299"},
  top:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24,gap:24},
  title:{color:"#e8eaf6",fontSize:22,fontWeight:700,margin:0,marginBottom:10},
  meta:{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"},
  sevB:{padding:"4px 10px",borderRadius:5,fontSize:12,fontWeight:700},
  stB:{background:"rgba(79,142,247,.1)",color:"#4f8ef7",padding:"4px 10px",borderRadius:5,fontSize:12},
  mtxt:{color:"#7b8299",fontSize:12},
  rcard:{background:"#0f1117",border:"1px solid #1e2030",borderRadius:8,padding:"16px 24px",textAlign:"center",flexShrink:0},
  rl:{color:"#7b8299",fontSize:11,fontWeight:700,letterSpacing:"0.08em",marginBottom:4},
  rv:{fontSize:28,fontWeight:700,letterSpacing:"0.05em"},rn:{color:"#7b8299",fontSize:11,marginTop:4},
  grid:{display:"grid",gridTemplateColumns:"1fr 320px",gap:16},
  left:{display:"flex",flexDirection:"column",gap:16},right:{display:"flex",flexDirection:"column",gap:16},
  panel:{background:"#0f1117",border:"1px solid #1e2030",borderRadius:8,padding:20},
  ptit:{color:"#e8eaf6",fontSize:14,fontWeight:700,margin:"0 0 16px",paddingBottom:12,borderBottom:"1px solid #1e2030"},
  desc:{color:"#c8cce0",fontSize:14,lineHeight:1.7,margin:"0 0 16px"},
  loc:{display:"flex",alignItems:"flex-start",gap:10,padding:12,background:"rgba(79,142,247,.05)",borderRadius:6},
  ladr:{color:"#e8eaf6",fontSize:13,fontWeight:500},lco:{color:"#7b8299",fontSize:11,fontFamily:"monospace",marginTop:2},
  mprv:{marginBottom:16},mimg:{width:"100%",borderRadius:6,maxHeight:300,objectFit:"cover"},
  minfo:{display:"flex",alignItems:"center",gap:10,marginTop:8,flexWrap:"wrap"},
  mtype:{background:"rgba(79,142,247,.1)",color:"#4f8ef7",padding:"2px 8px",borderRadius:4,fontSize:10,fontWeight:700},
  mmeta:{color:"#7b8299",fontSize:11},
  thumbs:{display:"flex",gap:8,flexWrap:"wrap"},
  thumb:{width:64,height:64,background:"#1a1d2e",borderRadius:6,cursor:"pointer",border:"2px solid transparent",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden"},
  thumbA:{borderColor:"#4f8ef7"},
  timg:{width:"100%",height:"100%",objectFit:"cover"},
  ticon:{fontSize:24},
  trans:{background:"#1a1d2e",borderRadius:6,padding:"14px 16px",color:"#c8cce0",fontSize:13,lineHeight:1.7,fontStyle:"italic"},
  kwsec:{marginTop:12},kwl:{color:"#f59e0b",fontSize:12,fontWeight:700,marginBottom:8},
  kwlist:{display:"flex",flexWrap:"wrap",gap:6},
  kw:{background:"rgba(245,158,11,.1)",color:"#f59e0b",padding:"3px 10px",borderRadius:12,fontSize:11,fontWeight:600,border:"1px solid rgba(245,158,11,.3)"},
  modsec:{marginTop:12,padding:12,background:"rgba(239,68,68,.05)",borderRadius:6,border:"1px solid rgba(239,68,68,.2)"},
  modl:{color:"#ef4444",fontSize:12,fontWeight:700,marginBottom:8},
  frow:{display:"flex",alignItems:"center",gap:10,marginBottom:6},fcat:{color:"#e8eaf6",fontSize:12,width:140,flexShrink:0},
  fbar:{flex:1,height:6,background:"#1e2030",borderRadius:3,overflow:"hidden"},ffill:{height:"100%",background:"#ef4444",borderRadius:3},fconf:{color:"#ef4444",fontSize:11,width:36,textAlign:"right"},
  sbtns:{display:"flex",flexDirection:"column",gap:8},
  sbtn:{padding:10,borderRadius:6,border:"1px solid",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"'IBM Plex Mono',monospace"},
  dlist:{display:"flex",flexDirection:"column"},
  drow:{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #1e2030"},
  dlb:{color:"#7b8299",fontSize:12},dv:{color:"#e8eaf6",fontSize:12,fontFamily:"monospace"},
  mapp:{background:"#1a1d2e",borderRadius:6,padding:32,textAlign:"center"},mpin:{fontSize:32,marginBottom:8},
  mcoord:{color:"#4f8ef7",fontSize:13,fontFamily:"monospace",marginBottom:4},mnote:{color:"#7b8299",fontSize:11},
};
export default function IncidentDetail() {
  const { id } = useParams<{id:string}>();
  const nav = useNavigate();
  const { user } = useAuth();
  const [inc,setInc]=useState<Incident|null>(null);
  const [load,setLoad]=useState(true);
  const [active,setActive]=useState<Media|null>(null);
  const [upd,setUpd]=useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  useEffect(()=>{
    if(!id)return;
    incidentApi.get(id)
      .then(({data}) => { setInc(data); if(data.media?.length) setActive(data.media[0]); })
      .catch((err) => { toastManager.error("Incident not found or network error."); nav("/incidents"); })
      .finally(()=>setLoad(false));
    // Load audit logs
    setLogsLoading(true);
    setTimeout(() => {
      // Mock audit logs for now - in production, fetch from API
      setAuditLogs([
        { id: '1', action: 'Created', user: 'Anonymous', timestamp: new Date(Date.now() - 86400000).toISOString(), details: 'Incident reported' },
        { id: '2', action: 'Verified', user: user?.displayName || 'System', timestamp: new Date(Date.now() - 3600000).toISOString(), details: 'Marked as verified by analyst' },
      ]);
      setLogsLoading(false);
    }, 300);
  },[id,nav,user]);
  const updateStatus=async(s:string)=>{
    if(!inc)return; setUpd(true);
    try {
      await incidentApi.update(inc.id,s);
      setInc(i=>i?{...i,status:s as any}:null);
      toastManager.success(`Incident status updated to ${s}.`);
    } catch (error:any) {
      toastManager.error(error.response?.data?.error || "Unable to update status.");
    } finally { setUpd(false); }
  };
  if(load)return <div style={S.load}>Loading…</div>;
  if(!inc)return <div style={S.load}>Not found.</div>;
  const canManage=Boolean(user && ["admin","police","analyst"].includes(user.role));
  return (
    <div style={S.page}>
      <div style={S.bc}><span style={S.bl} onClick={()=>nav("/incidents")}>Incidents</span><span style={S.bs}>/</span><span style={S.bc2}>{inc.title}</span></div>
      <div style={S.top}>
        <div>
          <h1 style={S.title}>{inc.title}</h1>
          <div style={S.meta}>
            <span style={{...S.sevB,background:SEV_COLORS[inc.severity]+"22",color:SEV_COLORS[inc.severity]}}>● {SEV_LABELS[inc.severity]}</span>
            <span style={S.stB}>{STATUS_LABELS[inc.status]}</span>
            {inc.category&&<span style={S.mtxt}>{inc.category}</span>}
            <span style={S.mtxt}>{new Date(inc.createdAt).toLocaleString()}</span>
          </div>
        </div>
        <div style={S.rcard}>
          <div style={S.rl}>RISK SCORE</div>
          <div style={{...S.rv,color:RISK_C[inc.riskScore]??"#7b8299"}}>{inc.riskScore?.toUpperCase()}</div>
          <div style={S.rn}>{inc.riskScore==="high"?"Manual review":inc.riskScore==="medium"?"Flagged":"Auto-accepted"}</div>
        </div>
      </div>
      <div style={S.grid}>
        <div style={S.left}>
          <section style={S.panel}>
            <h2 style={S.ptit}>Description</h2>
            <p style={S.desc}>{inc.description||"No description."}</p>
            <div style={S.loc}><span style={{fontSize:18}}>📍</span><div><div style={S.ladr}>{inc.address||"No address"}</div><div style={S.lco}>{inc.lat.toFixed(6)}, {inc.lng.toFixed(6)}</div></div></div>
          </section>
          {inc.media&&inc.media.length>0&&(
            <section style={S.panel}>
              <h2 style={S.ptit}>Media ({inc.media.length})</h2>
              {active&&(
                <div style={S.mprv}>
                  {active.type==="image"?<img src={active.accessUrl||active.url} alt="" style={S.mimg} onError={e=>{(e.target as HTMLImageElement).src="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='200'><rect fill='%231e2030' width='400' height='200'/></svg>";}}/>
                  :active.type==="video"?<video controls style={S.mimg} src={active.accessUrl||active.url}/>
                  :<div style={{background:"#1a1d2e",borderRadius:6,padding:20,textAlign:"center"}}><span style={{fontSize:32,display:"block",marginBottom:12}}>🎵</span><audio controls style={{width:"100%"}} src={active.accessUrl||active.url}/></div>}
                  <div style={S.minfo}>
                    <span style={S.mtype}>{active.type.toUpperCase()}</span>
                    {active.sizeBytes&&<span style={S.mmeta}>{(active.sizeBytes/1024).toFixed(0)} KB</span>}
                    {active.width&&<span style={S.mmeta}>{active.width}×{active.height}</span>}
                    <span style={{...S.mmeta,color:MSTAT_C[active.status]??"#7b8299"}}>{active.status}</span>
                  </div>
                </div>
              )}
              <div style={S.thumbs}>{inc.media.map(m=>(
                <div key={m.id} style={{...S.thumb,...(active?.id===m.id?S.thumbA:{})}} onClick={()=>setActive(m)}>
                  {m.thumbnailUrl?<img src={m.thumbnailUrl} alt="" style={S.timg}/>:<span style={S.ticon}>{m.type==="image"?"🖼":m.type==="video"?"🎬":"🔊"}</span>}
                </div>
              ))}</div>
            </section>
          )}
          {active?.transcript&&(
            <section style={S.panel}>
              <h2 style={S.ptit}>AI Transcript</h2>
              <div style={S.trans}>{active.transcript}</div>
              {active.keywords&&active.keywords.length>0&&<div style={S.kwsec}><div style={S.kwl}>⚠️ Keywords (KMP)</div><div style={S.kwlist}>{active.keywords.map(k=><span key={k} style={S.kw}>{k}</span>)}</div></div>}
              {active.moderationFlags&&active.moderationFlags.length>0&&(
                <div style={S.modsec}><div style={S.modl}>🚩 Moderation Flags</div>
                  {active.moderationFlags.map((f,i)=>(
                    <div key={i} style={S.frow}><span style={S.fcat}>{f.category}</span><div style={S.fbar}><div style={{...S.ffill,width:`${f.confidence*100}%`}}/></div><span style={S.fconf}>{(f.confidence*100).toFixed(0)}%</span></div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
        <div style={S.right}>
          {canManage&&(
            <section style={S.panel}>
              <h2 style={S.ptit}>Manage Status</h2>
              <div style={S.sbtns}>
                {(["verified","resolved","rejected"] as const).map(s=>(
                  <button key={s} style={{...S.sbtn,borderColor:SBTN_C[s],color:inc.status===s?"#fff":SBTN_C[s],background:inc.status===s?SBTN_C[s]+"cc":"transparent"}}
                    onClick={()=>updateStatus(s)} disabled={upd||inc.status===s}>{STATUS_LABELS[s]}</button>
                ))}
              </div>
            </section>
          )}
          <section style={S.panel}>
            <h2 style={S.ptit}>Details</h2>
            <div style={S.dlist}>
              {[["ID",inc.id.slice(0,8)+"…"],["Reporter",inc.reporterName??"Anon"],["Cluster",inc.clusterId!==undefined?`#${inc.clusterId}`:"—"],["Created",new Date(inc.createdAt).toLocaleString()],["Updated",inc.updatedAt ? new Date(inc.updatedAt).toLocaleString() : "—"]].map(([l,v])=>(
                <div key={l} style={S.drow}><span style={S.dlb}>{l}</span><span style={S.dv}>{v}</span></div>
              ))}
            </div>
          </section>
          <section style={S.panel}>
            <h2 style={S.ptit}>Location</h2>
            <div style={S.mapp}><div style={S.mpin}>📍</div><div style={S.mcoord}>{inc.lat.toFixed(4)}, {inc.lng.toFixed(4)}</div><div style={S.mnote}>Add Leaflet/Mapbox for interactive map</div></div>
          </section>
          <section style={S.panel}>
            <h2 style={S.ptit}>Dispatch</h2>
            <DispatchUI incident={inc} canManage={canManage} />
          </section>
          <section style={S.panel}>
            <h2 style={S.ptit}>Export</h2>
            <PDFDownload incident={inc} />
          </section>
        </div>
      </div>
      <div style={{...S.grid, gridTemplateColumns: '1fr'}}>
        <section style={S.panel}>
          <h2 style={S.ptit}>Audit Trail</h2>
          <AuditLogs logs={auditLogs} isLoading={logsLoading} />
        </section>
      </div>
    </div>
  );
}
