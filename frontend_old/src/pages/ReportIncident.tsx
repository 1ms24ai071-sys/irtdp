import React, { useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router-dom";
import { incidentApi, mediaApi } from "../utils/api";import { toastManager } from "../utils/ui";const S:Record<string,React.CSSProperties>={
  page:{padding:32,maxWidth:760,margin:"0 auto"},title:{color:"#e8eaf6",fontSize:24,fontWeight:700,margin:0},
  sub:{color:"#7b8299",fontSize:13,marginTop:6,marginBottom:32},
  form:{display:"flex",flexDirection:"column",gap:24},
  err:{background:"rgba(239,68,68,.1)",border:"1px solid rgba(239,68,68,.3)",color:"#ef4444",padding:"12px 16px",borderRadius:6,fontSize:13},
  success:{background:"rgba(34,197,94,.1)",border:"1px solid rgba(34,197,94,.3)",color:"#22c55e",padding:"12px 16px",borderRadius:6,fontSize:13},
  sec:{background:"#0f1117",border:"1px solid #1e2030",borderRadius:8,padding:24},
  stit:{color:"#e8eaf6",fontSize:14,fontWeight:700,marginTop:0,marginBottom:20,paddingBottom:12,borderBottom:"1px solid #1e2030"},
  row:{display:"flex",gap:16},field:{display:"flex",flexDirection:"column",gap:6,flex:1,marginBottom:12},
  label:{color:"#7b8299",fontSize:12,fontWeight:600,letterSpacing:"0.05em"},
  input:{background:"#1a1d2e",border:"1px solid #1e2030",borderRadius:6,padding:"10px 12px",color:"#e8eaf6",fontSize:13,outline:"none",fontFamily:"'IBM Plex Mono',monospace"},
  sel:{background:"#1a1d2e",border:"1px solid #1e2030",borderRadius:6,padding:"10px 12px",color:"#e8eaf6",fontSize:13,outline:"none"},
  ta:{background:"#1a1d2e",border:"1px solid #1e2030",borderRadius:6,padding:"10px 12px",color:"#e8eaf6",fontSize:13,outline:"none",resize:"vertical",fontFamily:"'IBM Plex Mono',monospace"},
  locBtn:{background:"rgba(79,142,247,.1)",border:"1px solid rgba(79,142,247,.3)",color:"#4f8ef7",padding:"10px 16px",borderRadius:6,cursor:"pointer",fontSize:13,fontWeight:600},
  note:{color:"#7b8299",fontSize:11,marginBottom:12},
  drop:{border:"2px dashed #1e2030",borderRadius:8,padding:"40px 20px",textAlign:"center",cursor:"pointer"},
  dicon:{fontSize:32,display:"block",marginBottom:8},dtxt:{color:"#7b8299",fontSize:13},
  flist:{display:"flex",flexDirection:"column",gap:8,marginTop:16},
  frow:{display:"flex",alignItems:"center",gap:12,padding:"8px 12px",background:"rgba(79,142,247,.05)",borderRadius:6,border:"1px solid rgba(79,142,247,.1)"},
  fname:{flex:1,color:"#e8eaf6",fontSize:12},fsz:{color:"#7b8299",fontSize:11},
  pbar:{width:80,height:4,background:"#1e2030",borderRadius:2,overflow:"hidden"},pfill:{height:"100%",background:"#4f8ef7"},
  priv:{background:"rgba(34,197,94,.05)",border:"1px solid rgba(34,197,94,.2)",color:"#22c55e",padding:"12px 16px",borderRadius:6,fontSize:12},
  btn:{background:"#4f8ef7",border:"none",color:"#fff",padding:"14px 24px",borderRadius:8,cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:"'IBM Plex Mono',monospace"},
  locRow:{display:"flex",gap:8,flexWrap:"wrap",marginTop:8},
  locChip:{background:"rgba(79,142,247,.15)",border:"1px solid rgba(79,142,247,.4)",color:"#4f8ef7",padding:"6px 12px",borderRadius:4,cursor:"pointer",fontSize:12,fontWeight:500,transition:"all 0.2s"},
  map:{width:"100%",height:280,borderRadius:10,border:"1px solid #1e2030",marginTop:16,overflow:"hidden"},
  info:{background:"rgba(59,130,246,.08)",border:"1px solid rgba(59,130,246,.18)",color:"#60a5fa",padding:"10px 14px",borderRadius:6,fontSize:12,marginTop:12},
};
const CATS=["Theft","Assault","Vandalism","Robbery","Fire","Fraud","Drug Activity","Suspicious Activity","Traffic Incident","Other"];
const PRESETS = [
  {name:"MG Road",lat:"12.9763",lng:"77.6033"},
  {name:"Indiranagar",lat:"12.9784",lng:"77.6408"},
  {name:"Whitefield",lat:"12.9698",lng:"77.7499"},
];
export default function ReportIncident() {
  const nav = useNavigate();
  const ref = useRef<HTMLInputElement>(null);
  const [f,setF] = useState({title:"",description:"",category:"Other",severity:"low",lat:"12.9716",lng:"77.5946",address:""});
  const [files,setFiles]=useState<File[]>([]);
  const [prog,setProg]=useState<Record<string,number>>({});
  const [busy,setBusy]=useState(false);
  const [locating,setLocating]=useState(false);
  const [errors,setErrors]=useState<Record<string,string>>({});
  const [info,setInfo]=useState<string>("");
  const [success,setSuccess]=useState(false);
  const up=(k:keyof typeof f,v:string)=>setF(p=>({...p,[k]:v}));
  const setLocation=(lat:string,lng:string,name:string)=>{
    up("lat",lat);
    up("lng",lng);
    setInfo(`✓ Location set to ${name}: ${lat}, ${lng}`);
    setErrors(prev => ({ ...prev, location: "" }));
    setTimeout(()=>setInfo(""),2500);
  };
  const locate=()=>{
    setLocating(true);
    setInfo("");
    setErrors(prev => ({ ...prev, location: "" }));
    if(!navigator.geolocation){
      setInfo("ℹ️ Browser geolocation not available. Select a preset location or enter coordinates manually.");
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      p=>{
        const lat = p.coords.latitude.toFixed(6);
        const lng = p.coords.longitude.toFixed(6);
        up("lat",lat);
        up("lng",lng);
        setInfo("✓ Location detected! Coordinates: "+lat+", "+lng);
        toastManager.success("Location detected successfully.");
        setLocating(false);
        setTimeout(()=>setInfo(""),3000);
      },
      (e)=>{
        const message = "Location permission denied or unavailable. Enter coordinates manually or choose a preset location.";
        setInfo("ℹ️ " + message);
        toastManager.warning(message);
        setLocating(false);
      },
      {timeout:6000,enableHighAccuracy:false}
    );
  };
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault();
    const newErrors: Record<string,string> = {};
    if (!f.title.trim()) newErrors.title = 'Title is required.';
    if (!f.description.trim()) newErrors.description = 'Description is required.';
    if (!f.lat.trim() || !f.lng.trim() || isNaN(parseFloat(f.lat)) || isNaN(parseFloat(f.lng))) newErrors.location = 'Valid coordinates are required.';
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }
    setErrors({});
    setBusy(true);
    try {
      // Use correct API field names: lat/lng instead of latitude/longitude
      const {data}=await incidentApi.create({
        title:f.title,
        description:f.description,
        category:f.category,
        severity:f.severity,
        lat:parseFloat(f.lat),
        lng:parseFloat(f.lng),
        address:f.address
      });

      // Upload media files if any were selected
      if (files.length > 0) {
        for (const file of files) {
          try {
            await mediaApi.upload(data.id, file, p => setProg(prev => ({...prev,[file.name]:p})));
          } catch (uploadErr) {
            console.error(`Failed to upload ${file.name}:`, uploadErr);
            toastManager.warning(`Failed to upload some media files. Incident was created.`);
          }
        }
      }

      setSuccess(true);
      toastManager.success("Incident reported successfully. Redirecting to dashboard...");
      setTimeout(() => nav('/'), 2000);

    } catch(ex:any){
      const submitError = ex.response?.data?.error ?? ex.message ?? "Failed to submit incident. Please try again.";
      setErrors({submit: submitError});
      toastManager.error(submitError);
      console.error("Incident submission error:", ex);
    } finally { setBusy(false); }

  };
  return (
    <div style={S.page}>
      <h1 style={S.title}>Report Incident</h1>
      <p style={S.sub}>All submissions are reviewed and risk-scored automatically.</p>
      <form style={S.form} onSubmit={submit}>
        {Object.keys(errors).length > 0 && <div style={S.err}>{Object.values(errors).join(' ')}</div>}
        {success && <div style={S.success}>✓ Incident reported successfully! Redirecting to dashboard...</div>}
        <section style={S.sec}>
          <h2 style={S.stit}>Incident Details</h2>
          <div style={S.field}><label style={S.label}>Title *</label>{errors.title && <div style={{color:'#ef4444', fontSize:11}}>{errors.title}</div>}<input style={S.input} value={f.title} onChange={e=>up("title",e.target.value)} placeholder="Brief description" required/></div>
          <div style={S.row}>
            <div style={S.field}><label style={S.label}>Category</label><select style={S.sel} value={f.category} onChange={e=>up("category",e.target.value)}>{CATS.map(c=><option key={c}>{c}</option>)}</select></div>
            <div style={S.field}><label style={S.label}>Severity</label><select style={S.sel} value={f.severity} onChange={e=>up("severity",e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
          </div>
          <div style={S.field}><label style={S.label}>Description</label>{errors.description && <div style={{color:'#ef4444', fontSize:11}}>{errors.description}</div>}<textarea style={S.ta} rows={4} value={f.description} onChange={e=>up("description",e.target.value)} placeholder="Describe what happened…"/></div>
        </section>
        <section style={S.sec}>
          <h2 style={S.stit}>Location</h2>
          <div style={S.field}><label style={S.label}>Address (optional)</label><input style={S.input} value={f.address} onChange={e=>up("address",e.target.value)} placeholder="Street address or landmark"/></div>
          <div style={S.row}>
            <div style={S.field}><label style={S.label}>Latitude *</label><input style={S.input} type="number" step="0.000001" value={f.lat} onChange={e=>up("lat",e.target.value)} required/></div>
            <div style={S.field}><label style={S.label}>Longitude *</label><input style={S.input} type="number" step="0.000001" value={f.lng} onChange={e=>up("lng",e.target.value)} required/></div>
          </div>
          {errors.location && <div style={{color:'#ef4444', fontSize:11, marginTop:8}}>{errors.location}</div>}
          <button type="button" style={{...S.locBtn,opacity:locating?0.6:1,cursor:locating?"wait":"pointer"}} onClick={locate} disabled={locating}>{locating?"🔄 Locating...":"📍 Use My Location"}</button>
          {info && <div style={S.info}>{info}</div>}
          <div style={S.note}>Or select a common location:</div>
          <div style={S.locRow}>
            {PRESETS.map(h=><button key={h.name} type="button" style={S.locChip} onClick={()=>setLocation(h.lat,h.lng,h.name)}>{h.name}</button>)}
          </div>
          {(() => {
            const latValue = parseFloat(f.lat);
            const lngValue = parseFloat(f.lng);
            const hasCoordinates = !isNaN(latValue) && !isNaN(lngValue);
            return hasCoordinates ? (
              <MapContainer center={[latValue, lngValue]} zoom={14} scrollWheelZoom={false} style={S.map} key={`${latValue}-${lngValue}`}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap contributors" />
                <Marker position={[latValue, lngValue]}>
                  <Popup>{f.address || "Selected location"}</Popup>
                </Marker>
              </MapContainer>
            ) : null;
          })()}
        </section>
        <section style={S.sec}>
          <h2 style={S.stit}>Media Evidence</h2>
          <p style={S.note}>Images, audio, video accepted · Max 100MB · EXIF removed automatically</p>
          <div style={S.drop} onClick={()=>ref.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();setFiles(Array.from(e.dataTransfer.files));}}>
            <span style={S.dicon}>📁</span><p style={S.dtxt}>Click or drag files here</p>
            <input ref={ref} type="file" multiple accept="image/*,audio/*,video/*" style={{display:"none"}} onChange={e=>e.target.files&&setFiles(Array.from(e.target.files))}/>
          </div>
          {files.length>0&&<div style={S.flist}>{files.map(f=>(
            <div key={f.name} style={S.frow}>
              <span>{f.type.startsWith("image/")?"🖼":f.type.startsWith("video/")?"🎬":"🔊"}</span>
              <span style={S.fname}>{f.name}</span>
              <span style={S.fsz}>{(f.size/1024).toFixed(0)} KB</span>
              {prog[f.name]!==undefined&&<div style={S.pbar}><div style={{...S.pfill,width:`${prog[f.name]}%`}}/></div>}
            </div>
          ))}</div>}
        </section>
        <div style={S.priv}>🔒 Identity anonymized · Media encrypted at rest · High-risk held for review</div>
        <button type="submit" style={S.btn} disabled={busy}>{busy?"Submitting…":"Submit Report →"}</button>
      </form>
    </div>
  );
}
