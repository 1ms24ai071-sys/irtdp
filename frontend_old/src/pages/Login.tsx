import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";
import { toastManager } from "../utils/ui";
const S: Record<string,React.CSSProperties> = {
  page:   { minHeight:"100vh", background:"#0a0b0f", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'IBM Plex Mono',monospace", position:"relative", overflow:"hidden" },
  grid:   { position:"absolute", inset:0, backgroundImage:"linear-gradient(#1e2030 1px,transparent 1px),linear-gradient(90deg,#1e2030 1px,transparent 1px)", backgroundSize:"40px 40px", opacity:.4 },
  card:   { position:"relative", zIndex:1, background:"#0f1117", border:"1px solid #1e2030", borderRadius:12, padding:"40px", width:"100%", maxWidth:440, boxShadow:"0 0 60px rgba(79,142,247,0.08)" },
  logo:   { display:"flex", alignItems:"center", gap:10, marginBottom:20 },
  lIcon:  { fontSize:28, color:"#4f8ef7" },
  lText:  { fontSize:18, fontWeight:700, color:"#e8eaf6", letterSpacing:"0.15em" },
  title:  { color:"#e8eaf6", fontSize:20, fontWeight:700, margin:"0 0 6px" },
  sub:    { color:"#7b8299", fontSize:12, marginBottom:28 },
  tabs:   { display:"flex", background:"#1a1d2e", borderRadius:6, padding:3, marginBottom:24 },
  tab:    { flex:1, padding:"8px", border:"none", background:"none", color:"#7b8299", cursor:"pointer", fontSize:12, fontWeight:600, borderRadius:4, fontFamily:"'IBM Plex Mono',monospace" },
  tabA:   { background:"#0f1117", color:"#e8eaf6", boxShadow:"0 1px 4px rgba(0,0,0,.3)" },
  err:    { background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.3)", color:"#ef4444", padding:"10px 14px", borderRadius:6, fontSize:12, marginBottom:16 },
  form:   { display:"flex", flexDirection:"column", gap:16 },
  field:  { display:"flex", flexDirection:"column", gap:6 },
  label:  { color:"#7b8299", fontSize:11, fontWeight:700, letterSpacing:"0.06em" },
  input:  { background:"#1a1d2e", border:"1px solid #1e2030", borderRadius:6, padding:"11px 14px", color:"#e8eaf6", fontSize:13, outline:"none", fontFamily:"'IBM Plex Mono',monospace" },
  btn:    { background:"#4f8ef7", border:"none", color:"#fff", padding:"13px", borderRadius:7, cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:"'IBM Plex Mono',monospace" },
  demos:  { display:"flex", flexDirection:"column", gap:8 },
  dnote:  { color:"#7b8299", fontSize:11, marginTop:0 },
  dbtn:   { background:"#1a1d2e", border:"1px solid #1e2030", borderRadius:7, padding:"12px 16px", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" },
  drole:  { color:"#e8eaf6", fontSize:13, fontWeight:700, fontFamily:"'IBM Plex Mono',monospace" },
  demail: { color:"#7b8299", fontSize:11 },
  tags:   { display:"flex", flexWrap:"wrap", gap:6, marginTop:24, paddingTop:20, borderTop:"1px solid #1e2030" },
  tag:    { background:"rgba(79,142,247,0.06)", border:"1px solid rgba(79,142,247,0.15)", color:"#4f8ef7", padding:"3px 9px", borderRadius:12, fontSize:10 },
};
const DEMOS = [
  { label:"Admin",    email:"admin@platform.local",    password:"password123!",    role:"admin"    },
  { label:"Police",   email:"officer1@police.local",   password:"password123!",   role:"police"   },
  { label:"Analyst",  email:"analyst@platform.local",  password:"password123!",  role:"analyst"  },
  { label:"Reporter", email:"reporter@platform.local", password:"password123!", role:"reporter" },
];
function getLandingRoute(role?: string) {
  return role === "reporter" ? "/report" : "/dashboard";
}

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pass,  setPass]  = useState("");
  const [err,   setErr]   = useState<string|null>(null);
  const [busy,  setBusy]  = useState(false);
  const [mode,  setMode]  = useState<"login"|"demo">("login");
  const doLogin = async (e:string, p:string) => {
    setErr(null); setBusy(true);
    try {
      const user = await login(e, p);
      toastManager.success(`Welcome back, ${user.displayName}`);
      nav(getLandingRoute(user.role), { replace: true });
    } catch(ex:any) {
      const message = ex.response?.data?.error ?? "Invalid credentials.";
      setErr(message);
      toastManager.error(message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div style={S.page}>
      <div style={S.grid} />
      <div style={S.card}>
        <div style={S.logo}><span style={S.lIcon}>⬡</span><span style={S.lText}>IRTDP</span></div>
        <h1 style={S.title}>Incident Detection Platform</h1>
        <p style={S.sub}>Real-time crime monitoring and analytics</p>
        <div style={S.tabs}>
          <button style={{...S.tab,...(mode==="login"?S.tabA:{})}} onClick={()=>setMode("login")}>Sign In</button>
          <button style={{...S.tab,...(mode==="demo" ?S.tabA:{})}} onClick={()=>setMode("demo")}>Demo</button>
        </div>
        {err && <div style={S.err}>{err}</div>}
        {mode === "login" ? (
          <form style={S.form} onSubmit={e=>{e.preventDefault(); doLogin(email,pass);}}>
            <div style={S.field}><label style={S.label}>Email</label><input style={S.input} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required /></div>
            <div style={S.field}><label style={S.label}>Password</label><input style={S.input} type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" required /></div>
            <button type="submit" style={S.btn} disabled={busy}>{busy?"Authenticating…":"Sign In →"}</button>
          </form>
        ) : (
          <div style={S.demos}>
            <p style={S.dnote}>Select a role to sign in:</p>
            {DEMOS.map(d => (
              <button key={d.role} style={S.dbtn} onClick={()=>doLogin(d.email,d.password)} disabled={busy}>
                <span style={S.drole}>{d.label}</span><span style={S.demail}>{d.email}</span>
              </button>
            ))}
          </div>
        )}
        <div style={S.tags}>
          {["K-Means Hotspots","Dijkstra Routing","Real-time WebSocket","Privacy-first"].map(t=>(
            <span key={t} style={S.tag}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
