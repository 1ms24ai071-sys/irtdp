import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { incidentApi } from "../utils/api";
import type { Incident } from "../types";
import { SEV_COLORS, SEV_LABELS, STATUS_LABELS } from "../types";
import { toastManager } from "../utils/ui";
const S:Record<string,React.CSSProperties> = {
  page:{padding:32,maxWidth:1400,margin:"0 auto"},
  hdr:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:28},
  title:{color:"#e8eaf6",fontSize:28,fontWeight:700,margin:0,letterSpacing:"-0.02em"},
  sub:{color:"#7b8299",fontSize:13,marginTop:6},
  newBtn:{background:"#4f8ef7",color:"#fff",textDecoration:"none",padding:"10px 18px",borderRadius:8,fontSize:13,fontWeight:700,transition:"all 0.2s"},
  filterSection:{marginBottom:20},
  filterLabel:{color:"#7b8299",fontSize:11,fontWeight:700,letterSpacing:"0.08em",marginBottom:8,display:"block"},
  filters:{display:"grid",gridTemplateColumns:"2fr 1fr 1fr 1fr",gap:12,marginBottom:16},
  errorBanner:{background:"rgba(239,68,68,.08)",border:"1px solid rgba(239,68,68,.2)",color:"#ef4444",padding:"14px 16px",borderRadius:10,marginBottom:16,fontSize:13},
  error:{background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.3)",color:"#ef4444",padding:"12px 14px",borderRadius:8,marginBottom:16,fontSize:13},
  search:{width:"100%",background:"#0f1117",border:"1px solid #1e2030",borderRadius:8,padding:"10px 14px",color:"#e8eaf6",fontSize:13,outline:"none",fontFamily:"'IBM Plex Mono',monospace",transition:"border-color 0.2s"},
  searchFocus:{borderColor:"#4f8ef7"},
  sel:{width:"100%",background:"#0f1117",border:"1px solid #1e2030",borderRadius:8,padding:"10px 12px",color:"#e8eaf6",fontSize:12,outline:"none",transition:"all 0.2s",cursor:"pointer"},
  selActive:{borderColor:"#4f8ef7",boxShadow:"0 0 0 2px rgba(79,142,247,.1)"},
  activeChip:{display:"inline-flex",alignItems:"center",gap:6,background:"rgba(79,142,247,.15)",color:"#4f8ef7",padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:600,marginRight:8,marginTop:8},
  activeChipClose:{cursor:"pointer",fontWeight:700,fontSize:14},
  wrap:{background:"#0f1117",border:"1px solid #1e2030",borderRadius:12,overflow:"hidden",boxShadow:"0 1px 3px rgba(0,0,0,.1)"},
  tbl:{width:"100%",borderCollapse:"collapse"},
  th:{textAlign:"left",padding:"14px 16px",color:"#7b8299",fontSize:11,fontWeight:700,letterSpacing:"0.08em",borderBottom:"1px solid #1e2030",background:"#0d0f1a",cursor:"pointer",userSelect:"none",transition:"all 0.2s"},
  thHover:{color:"#4f8ef7",background:"rgba(79,142,247,.04)"},
  tr:{borderBottom:"1px solid #1e2030",transition:"background-color 0.2s"},
  trHover:{background:"rgba(79,142,247,.03)"},
  td:{padding:"14px 16px",fontSize:13,color:"#e8eaf6"},
  tdm:{padding:"14px 16px",fontSize:12,color:"#7b8299",fontFamily:"monospace"},
  tlink:{color:"#4f8ef7",textDecoration:"none",fontWeight:500,transition:"color 0.2s"},
  tlinkHover:{color:"#7ac5f5"},
  badge:{padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:700},
  schip:{background:"rgba(79,142,247,.12)",color:"#4f8ef7",padding:"4px 10px",borderRadius:6,fontSize:11,fontWeight:600},
  empty:{textAlign:"center",padding:48,color:"#7b8299",fontSize:13},
  pag:{display:"flex",alignItems:"center",justifyContent:"center",gap:16,marginTop:20},
  pbtn:{background:"#0f1117",border:"1px solid #1e2030",color:"#e8eaf6",padding:"8px 16px",borderRadius:6,cursor:"pointer",fontSize:12,transition:"all 0.2s"},
  pbtnActive:{borderColor:"#4f8ef7",color:"#4f8ef7"},
  pinfo:{color:"#7b8299",fontSize:12},
};
const RISK_C:Record<string,string>={low:"#22c55e",medium:"#f59e0b",high:"#ef4444"};
export default function IncidentList() {
  const [rows,setRows]=useState<Incident[]>([]);
  const [loading,setLoading]=useState(true);
  const [page,setPage]=useState(1);
  const [total,setTotal]=useState(0);
  const [sev,setSev]=useState("");
  const [stat,setStat]=useState("");
  const [q,setQ]=useState("");
  const [sort,setSort]=useState("severity");
  const [error,setError]=useState("");
  const LIMIT=15;
  const load = useCallback(async()=>{
    setLoading(true);
    try {
      if (q.trim()) {
        const {data}=await incidentApi.search(q,(page-1)*LIMIT,LIMIT);
        setRows(data.hits??[]); setTotal((data.total as any)?.value??0);
      } else {
        const {data}=await incidentApi.list({page,limit:LIMIT,severity:sev||undefined,status:stat||undefined,sortBy:sort});
        setRows(data.data); setTotal(data.pagination.total);
      }
    } catch(e){
      console.error(e);
      setError("Unable to load incidents. Please check your network connection.");
      toastManager.error("Unable to load incidents.");
    } finally { setLoading(false); }

  },[page,sev,stat,q,sort]);
  useEffect(()=>{load();},[load]);
  const pages=Math.ceil(total/LIMIT);
  return (
    <div style={S.page}>
      <header style={S.hdr}><div><h1 style={S.title}>Incidents</h1><p style={S.sub}>{total} total incidents</p></div><Link to="/report" style={S.newBtn} onMouseEnter={(e)=>{e.currentTarget.style.background="#3a7fd0"; e.currentTarget.style.boxShadow="0 4px 12px rgba(79,142,247,.3)"}} onMouseLeave={(e)=>{e.currentTarget.style.background="#4f8ef7"; e.currentTarget.style.boxShadow=""}} >+ Report</Link></header>
      
      <div style={S.filterSection}>
        <label style={S.filterLabel}>Search & Filter</label>
        <div style={S.filters}>
          <input style={S.search} placeholder="🔍 Search incidents by title or keyword…" value={q} onChange={e=>{setQ(e.target.value);setPage(1);}} onFocus={(e)=>{Object.assign(e.currentTarget.style,S.searchFocus)}} onBlur={(e)=>{e.currentTarget.style.borderColor="#1e2030"}}/>
          <select style={{...S.sel, ...(sev?S.selActive:{})}} value={sev} onChange={e=>{setSev(e.target.value);setPage(1);}}>
            <option value="">All Severities</option>
            {(["low","medium","high","critical"] as const).map(v=><option key={v} value={v}>{SEV_LABELS[v]}</option>)}
          </select>
          <select style={{...S.sel, ...(stat?S.selActive:{})}} value={stat} onChange={e=>{setStat(e.target.value);setPage(1);}}>
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
          </select>
          <select style={{...S.sel, ...(sort!=="severity"?S.selActive:{})}} value={sort} onChange={e=>setSort(e.target.value)}>
            <option value="severity">Sort: Severity</option>
            <option value="time">Sort: Newest</option>
          </select>
        </div>
        {(q||sev||stat) && <div style={{marginTop:8}}>
          {q && <div style={S.activeChip}>🔍 {q.slice(0,20)}{q.length>20?"...":""}<span style={S.activeChipClose} onClick={()=>{setQ("");setPage(1)}}>✕</span></div>}
          {sev && <div style={S.activeChip}>Severity: {SEV_LABELS[sev as import("../types").Severity]}<span style={S.activeChipClose} onClick={()=>{setSev("");setPage(1)}}>✕</span></div>}
          {stat && <div style={S.activeChip}>Status: {STATUS_LABELS[stat as import("../types").IncidentStatus]}<span style={S.activeChipClose} onClick={()=>{setStat("");setPage(1)}}>✕</span></div>}
        </div>}
      </div>
      {error && <div style={S.error}>{error}</div>}
      <div style={S.wrap}>
        <table style={S.tbl}>
          <thead><tr>{[["Title","20%"],["Category","12%"],["Severity","12%"],["Status","13%"],["Risk","10%"],["Location","18%"],["Date","15%"]].map(([h,w])=><th key={h} style={{...S.th, width:w}} title={`Click to sort by ${h.toLowerCase()}`}>↕ {h}</th>)}</tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={7} style={S.empty}>⏳ Loading incidents…</td></tr>
            : !rows.length ? <tr><td colSpan={7} style={S.empty}>🔍 No incidents found. Try adjusting your filters.</td></tr>
            : rows.map(r=>{
              const [rowHover, setRowHover] = React.useState(false);
              return (
                <tr key={r.id} style={{...S.tr, ...(rowHover?S.trHover:{})}} onMouseEnter={()=>setRowHover(true)} onMouseLeave={()=>setRowHover(false)}>
                  <td style={S.td}><Link to={`/incidents/${r.id}`} style={{...S.tlink, ...(rowHover?S.tlinkHover:{})}}>{r.title||`Incident ${r.id.slice(-8)}`}</Link></td>
                  <td style={S.tdm}>{r.category??"—"}</td>
                  <td style={S.td}><span style={{...S.badge,background:SEV_COLORS[r.severity]+"22",color:SEV_COLORS[r.severity]}}>{SEV_LABELS[r.severity]}</span></td>
                  <td style={S.td}><span style={S.schip}>{STATUS_LABELS[r.status]}</span></td>
                  <td style={S.td}><span style={{color:RISK_C[r.riskScore]??"#7b8299",fontWeight:700,fontSize:12}}>{r.riskScore?.toUpperCase()??"—"}</span></td>
                  <td style={S.tdm}>{r.lat.toFixed(3)}, {r.lng.toFixed(3)}</td>
                  <td style={S.tdm}>{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {pages>1 && <div style={S.pag}><button style={{...S.pbtn, ...(page>1?{}:{opacity:0.5,cursor:"not-allowed"})}} onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} onMouseEnter={(e)=>page>1&&Object.assign(e.currentTarget.style,{borderColor:"#4f8ef7",color:"#4f8ef7"})} onMouseLeave={(e)=>{e.currentTarget.style.borderColor="#1e2030";e.currentTarget.style.color="#e8eaf6"}}>← Prev</button><span style={S.pinfo}>Page <strong>{page}</strong> of <strong>{pages}</strong></span><button style={{...S.pbtn, ...(page<pages?{}:{opacity:0.5,cursor:"not-allowed"})}} onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page===pages} onMouseEnter={(e)=>page<pages&&Object.assign(e.currentTarget.style,{borderColor:"#4f8ef7",color:"#4f8ef7"})} onMouseLeave={(e)=>{e.currentTarget.style.borderColor="#1e2030";e.currentTarget.style.color="#e8eaf6"}}>Next →</button></div>}
    </div>
  );
}
