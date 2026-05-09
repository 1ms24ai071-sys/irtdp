import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { authApi } from "./utils/api";
import { SOSAlert } from "./components/SOSAlert";
import { ToastContainer } from "./components/ToastContainer";
import type { User } from "./types";
import Dashboard      from "./pages/Dashboard";
import IncidentList   from "./pages/IncidentList";
import IncidentDetail from "./pages/IncidentDetail";
import ReportIncident from "./pages/ReportIncident";
import HotspotMap     from "./pages/HotspotMap";
import Login          from "./pages/Login";

interface Ctx { user:User|null; login:(e:string,p:string)=>Promise<User>; logout:()=>void; isLoading:boolean; }
const AuthContext = createContext<Ctx>({} as Ctx);
export const useAuth = () => useContext(AuthContext);

function decodeTokenPayload(token:string): User | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + (4 - normalized.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(padded));
    if (!decoded?.role) return null;
    return {
      id: decoded.sub ?? decoded.userId ?? decoded.id ?? "",
      role: decoded.role,
      displayName: decoded.displayName ?? decoded.name ?? decoded.email ?? "Reporter",
    };
  } catch {
    return null;
  }
}

function AuthProvider({ children }:{ children:ReactNode }) {
  const [user, setUser] = useState<User|null>(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("accessToken");
      const storedUser = localStorage.getItem("user");
      const initialUser = storedUser ? JSON.parse(storedUser) : token ? decodeTokenPayload(token) : null;
      if (token && initialUser) {
        try {
          const response = await fetch(`${process.env.REACT_APP_API_URL ?? "http://localhost:8080"}/api/auth/verify`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.ok) {
            setUser(initialUser);
          } else {
            localStorage.clear();
          }
        } catch {
          localStorage.clear();
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);
  const login = async (email:string, password:string) => {
    const { data } = await authApi.login(email, password);
    localStorage.setItem("accessToken",  data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("user",         JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };
  const logout = () => { authApi.logout().catch(()=>{}); localStorage.clear(); setUser(null); };
  return <AuthContext.Provider value={{ user, login, logout, isLoading }}>{children}</AuthContext.Provider>;
}

const C: Record<string,React.CSSProperties> = {
  shell:   { display:"flex", height:"100vh", background:"#0a0b0f", fontFamily:"'IBM Plex Mono',monospace" },
  side:    { width:220, background:"#0f1117", borderRight:"1px solid #1e2030", display:"flex", flexDirection:"column", flexShrink:0 },
  brand:   { display:"flex", alignItems:"center", gap:10, padding:"24px 20px 20px", borderBottom:"1px solid #1e2030" },
  bIcon:   { fontSize:22, color:"#4f8ef7" },
  bText:   { fontSize:15, fontWeight:700, color:"#e8eaf6", letterSpacing:"0.1em" },
  nav:     { flex:1, padding:"16px 0" },
  link:    { display:"flex", alignItems:"center", gap:10, padding:"10px 20px", color:"#7b8299", textDecoration:"none", fontSize:13, fontWeight:500 },
  active:  { color:"#4f8ef7", background:"rgba(79,142,247,0.08)", borderRight:"2px solid #4f8ef7" },
  usr:     { padding:"16px 20px", borderTop:"1px solid #1e2030" },
  badge:   { display:"inline-block", fontSize:10, fontWeight:700, letterSpacing:"0.1em", color:"#4f8ef7", background:"rgba(79,142,247,0.12)", padding:"2px 8px", borderRadius:3, marginBottom:6 },
  uname:   { color:"#e8eaf6", fontSize:13, marginBottom:12 },
  logBtn:  { background:"none", border:"1px solid #1e2030", color:"#7b8299", padding:"6px 12px", borderRadius:4, cursor:"pointer", fontSize:12, width:"100%" },
  main:    { flex:1, overflow:"auto", background:"#0a0b0f" },
  loading: { display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", color:"#4f8ef7" },
};

function Layout({ children }:{ children:ReactNode }) {
  const { user, logout } = useAuth();
  const loc = useLocation();
  const role = user?.role;
  const isPublic = !user;
  const isReporter = role === "reporter";
  const links = isPublic ? [
    { to:"/report",    label:"Report",    icon:"➕" },
  ] : isReporter ? [
    { to:"/dashboard", label:"Dashboard", icon:"⬛" },
    { to:"/report",    label:"Report",    icon:"➕" },
  ] : [
    { to:"/dashboard", label:"Dashboard", icon:"⬛" },
    { to:"/incidents", label:"Incidents", icon:"🚨" },
    { to:"/hotspots",  label:"Hotspots",  icon:"🗺"  },
    { to:"/report",    label:"Report",    icon:"➕" },
  ];
  return (
    <div className="app-shell" style={C.shell}>
      <aside className="app-side" style={C.side}>
        <div style={C.brand}><span style={C.bIcon}>⬡</span><span style={C.bText}>IRTDP</span></div>
        <nav className="app-nav" style={C.nav}>
          {links.map(l => <Link key={l.to} to={l.to} className="app-nav-link" style={{ ...C.link, ...(loc.pathname===l.to ? C.active:{}) }}>
            <span>{l.icon}</span>{l.label}
          </Link>)}
        </nav>
        <div style={C.usr}>
          {isPublic ? (
            <>
              <div style={C.badge}>PUBLIC</div>
              <Link to="/login" style={{...C.logBtn, display:"block", textAlign:"center", textDecoration:"none"}}>Sign In</Link>
            </>
          ) : (
            <>
              <div style={C.badge}>{user?.role?.toUpperCase()}</div>
              <div style={C.uname}>{user?.displayName}</div>
              <button style={C.logBtn} onClick={logout}>Sign out</button>
            </>
          )}
        </div>
      </aside>
      <main className="app-main" style={C.main}>{children}</main>
    </div>
  );
}

function isAuthorized(user: User | null, allowedRoles: string[]) {
  return Boolean(user && allowedRoles.includes(user.role));
}

function Guard({ children, requireAuth = true }:{ children:ReactNode, requireAuth?:boolean }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div style={C.loading}>Loading…</div>;
  if (requireAuth && !user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function RoleGuard({ children, allowedRoles }:{ children:ReactNode; allowedRoles:string[] }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div style={C.loading}>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAuthorized(user, allowedRoles)) return <Navigate to="/dashboard" replace />;
  return <Layout>{children}</Layout>;
}

function PublicGuard({ children }:{ children:ReactNode }) {
  return <Guard requireAuth={false}>{children}</Guard>;
}

function getLandingRoute(role?: string) {
  return role === "reporter" ? "/report" : "/dashboard";
}

function RedirectAuthenticated({ children }:{ children:ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <div style={C.loading}>Loading…</div>;
  if (user) return <Navigate to={getLandingRoute(user.role)} replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <style>{`
        .app-shell { display: flex; min-height: 100vh; background: #0a0b0f; font-family: 'IBM Plex Mono', monospace; }
        .app-side { width: 220px; }
        .app-main { flex: 1; overflow: auto; }
        .app-nav { display: flex; flex-direction: column; }
        .app-nav-link { transition: all 0.2s ease; }
        .app-toast-container { right: 16px; left: auto; bottom: 16px; }
        .app-toast { max-width: 100%; }
        @media (max-width: 980px) {
          .app-shell { flex-direction: column; }
          .app-side { width: 100%; flex-direction: row; align-items: center; justify-content: space-between; padding: 12px 16px; border-right: none; border-bottom: 1px solid #1e2030; }
          .app-main { padding: 16px; }
          .app-nav { flex-direction: row; flex-wrap: wrap; gap: 6px; }
          .app-nav-link { padding: 8px 12px; font-size: 12px; }
        }
        @media (max-width: 640px) {
          .app-side { padding: 10px 12px; }
          .app-nav { gap: 4px; }
          .app-nav-link { padding: 8px 10px; font-size: 11px; }
          .app-toast-container { left: 12px; right: 12px; }
        }
      `}</style>
      <SOSAlert sosData={null} onClose={() => {}} />
      <BrowserRouter>
        <Routes>
          <Route path="/login"         element={<RedirectAuthenticated><Login /></RedirectAuthenticated>} />
          <Route path="/"              element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"     element={<Guard><Dashboard /></Guard>} />
          <Route path="/incidents"     element={<RoleGuard allowedRoles={["police","admin","analyst"]}><IncidentList /></RoleGuard>} />
          <Route path="/incidents/:id" element={<RoleGuard allowedRoles={["police","admin","analyst"]}><IncidentDetail /></RoleGuard>} />
          <Route path="/report"        element={<PublicGuard><ReportIncident /></PublicGuard>} />
          <Route path="/hotspots"      element={<RoleGuard allowedRoles={["police","admin"]}><HotspotMap /></RoleGuard>} />
        </Routes>
      </BrowserRouter>
      <ToastContainer />
    </AuthProvider>
  );
}
