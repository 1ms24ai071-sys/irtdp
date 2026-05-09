export interface ResponseCenter {
  id: string;
  name?: string;
  latitude: number;
  longitude: number;
  status: "available" | "assigned" | "unavailable";
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  type?: string;
  latitude: number;
  longitude: number;
  status: string;
  createdAt: string;
  severityScore: number;
  assignedUnit?: ResponseCenter;
  distanceKm?: number;
  etaMinutes?: number;
}
