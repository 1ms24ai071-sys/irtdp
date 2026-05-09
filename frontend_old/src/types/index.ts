export type Severity       = "low"|"medium"|"high"|"critical";
export type IncidentStatus = "reported"|"processing"|"verified"|"resolved"|"rejected"|"pending_review";
export type MediaType      = "image"|"audio"|"video";
export type RiskScore      = "low"|"medium"|"high";
export type UserRole       = "reporter"|"police"|"analyst"|"admin";
export type OfficerStatus  = "available"|"en_route"|"on_scene"|"off_duty";
export type DispatchStatus = "assigned"|"en_route"|"on_scene"|"completed"|"cancelled";

export interface User     { id:string; role:UserRole; displayName:string; }
export interface Incident {
  id:string; title:string; description?:string; category?:string;
  severity:Severity; status:IncidentStatus; lat:number; lng:number;
  address?:string; riskScore:RiskScore; clusterId?:number; reporterName?:string;
  createdAt:string; updatedAt?:string; media?:Media[];
}
export interface Media {
  id:string; incidentId:string; url:string; accessUrl?:string; type:MediaType;
  mimeType?:string; sizeBytes?:number; durationS?:number; width?:number; height?:number;
  status:"uploaded"|"processing"|"processed"|"failed"|"flagged";
  thumbnailUrl?:string; transcript?:string; keywords?:string[]; riskScore?:RiskScore;
  moderationFlags?:Array<{category:string;confidence:number}>; createdAt:string;
}
export interface Hotspot        { clusterId:number; centroid:{lat:number;lng:number}; incidents:Incident[]; severityScore:number; }
export interface ResourceAssign { incidentId:string; resourceId:string; distanceKm:number; }
export interface Notification   { id:string; type:string; title:string; message:string; isRead:boolean; metadata:Record<string,any>; createdAt:string; }
export interface Paginated<T>   { data:T[]; pagination:{page:number;limit:number;total:number}; }

// Dispatch & Tracking Types
export interface Officer {
  id: string;
  name: string;
  role: UserRole;
  status: OfficerStatus;
  lat?: number;
  lng?: number;
  lastUpdate?: string;
}

export interface DispatchRecord {
  dispatchId: string;
  incidentId: string;
  status: DispatchStatus;
  assignedAt: string;
  updatedAt: string;
  officer: {
    id: string;
    name: string;
    status: OfficerStatus;
    lat?: number;
    lng?: number;
  };
}

export interface LocationPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
}

export interface SOSEvent {
  id: string;
  userId: string;
  location: [number, number];
  timestamp: string;
  priority: "critical";
}

export interface AuditLog {
  id?: string;
  action: string;
  entityType: string;
  entityId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  createdAt?: string;
}

export const SEV_COLORS:Record<Severity,string> = { low:"#22c55e", medium:"#f59e0b", high:"#f97316", critical:"#ef4444" };
export const SEV_LABELS:Record<Severity,string> = { low:"Low", medium:"Medium", high:"High", critical:"Critical" };
export const STATUS_LABELS:Record<IncidentStatus,string> = {
  reported:"Reported", processing:"Processing", verified:"Verified",
  resolved:"Resolved", rejected:"Rejected", pending_review:"Pending Review",
};
export const OFFICER_COLORS:Record<OfficerStatus,string> = {
  available: "#22c55e",
  en_route: "#f59e0b",
  on_scene: "#f97316",
  off_duty: "#7b8299",
};
