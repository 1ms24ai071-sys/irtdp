import axios, { AxiosInstance } from "axios";
import type { Incident, Media, Hotspot, Paginated, User, ResourceAssign } from "../types";

const BASE = process.env.REACT_APP_API_URL ?? "http://localhost:8080";
const api: AxiosInstance = axios.create({ baseURL:BASE, timeout:30000 });

api.interceptors.request.use(cfg => {
  const t = localStorage.getItem("accessToken");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

let refreshing = false;
api.interceptors.response.use(r => r, async err => {
  const orig = err.config as any;
  if (err.response?.status === 401 && !orig._retry) {
    orig._retry = true;
    if (!refreshing) {
      refreshing = true;
      try {
        const { data } = await axios.post(`${BASE}/api/auth/refresh`, { refreshToken: localStorage.getItem("refreshToken") });
        localStorage.setItem("accessToken", data.accessToken);
      } catch { localStorage.clear(); window.location.href = "/login"; }
      finally { refreshing = false; }
    }
    return api(orig);
  }
  return Promise.reject(err);
});

export const authApi = {
  login:    (email:string, password:string) => api.post<{accessToken:string;refreshToken:string;user:User}>("/api/auth/login", {email,password}),
  register: (email:string, password:string, displayName:string, role="reporter") => api.post("/api/auth/register", {email,password,displayName,role}),
  logout:   () => api.post("/api/auth/logout", { refreshToken: localStorage.getItem("refreshToken") }),
};

export const incidentApi = {
  list:   (params?:Record<string,any>) => api.get<Paginated<Incident>>("/api/incidents", {params}),
  get:    (id:string)                  => api.get<Incident>(`/api/incidents/${id}`),
  create: (data:Record<string,any>)    => api.post<{id:string;riskScore:string;status:string}>("/api/incidents", data),
  update: (id:string, status:string)   => api.patch(`/api/incidents/${id}/status`, {status}),
  search: (q:string, from=0, size=10)  => api.get("/api/search", {params:{q,from,size}}),
};

export const mediaApi = {
  upload: (incidentId:string, file:File, onProgress?:(p:number)=>void) => {
    const fd = new FormData(); fd.append("file",file); fd.append("incidentId",incidentId);
    return api.post<{mediaId:string;type:string;status:string}>("/api/media/upload", fd, {
      headers:{"Content-Type":"multipart/form-data"},
      onUploadProgress: e => onProgress && e.total && onProgress(Math.round(e.loaded*100/e.total)),
    });
  },
  get: (id:string) => api.get<Media>(`/api/media/${id}`),
};

export const analyticsApi = {
  hotspots:  (k=5) => api.get<{hotspots:Hotspot[]}>("/api/hotspots", {params:{k}}),
  routes:    ()    => api.get<{assignments:ResourceAssign[]}>("/api/routes"),
  route:     (fromLat:number, fromLng:number, toLat:number, toLng:number) => api.get<{path:[number,number][]}>("/api/routes", {params:{fromLat,fromLng,toLat,toLng}}),
  officers:  ()    => api.get<{officers:any[]}>("/api/officers"),
  updateOfficerStatus: (id:string, status:string) => api.patch(`/api/officers/${id}/status`, {status}),
};

export const auditApi = {
  log: (action: string, entityType: string, entityId?: string, details?: object) => api.post("/api/audit/log", {
    userId: localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")!).id : undefined,
    action,
    entityType,
    entityId,
    ipAddress: "client_ip", // Would be set by server in production
    userAgent: navigator.userAgent,
    details
  }),
};

export const dispatchApi = {
  assign: (incidentId: string, officerId?: string, autoAssign?: boolean) => 
    api.post(`/api/dispatch/incidents/${incidentId}/assign`, { officerId, autoAssign }),
  updateStatus: (dispatchId: string, status: string) =>
    api.patch(`/api/dispatch/${dispatchId}/status`, { status }),
  getIncidentDispatches: (incidentId: string) =>
    api.get(`/api/dispatch/incidents/${incidentId}`),
};

export const trackingApi = {
  updateLocation: (officerId: string, latitude: number, longitude: number) =>
    api.post(`/api/officers/${officerId}/location`, { latitude, longitude }),
  getLocationHistory: (officerId: string, minutes?: number) =>
    api.get(`/api/officers/${officerId}/location-history`, { params: { minutes } }),
};

export const pdfApi = {
  generateReport: (incident: any, auditLogs?: any[], mapSnapshot?: string) =>
    api.post("/api/pdf/generate", {
      incidentId: incident.id,
      incident,
      auditLogs,
      mapSnapshot,
    }, { responseType: "blob" }),
};

export const sosApi = {
  trigger: (location: [number, number]) =>
    api.post("/api/sos", { location }),
};
