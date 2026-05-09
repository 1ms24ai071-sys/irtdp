import { apiFetch } from './client';
import { Incident, ResponseCenter } from '../types';

export function fetchIncidents(): Promise<Incident[]> { 
  return apiFetch('/incidents'); 
}

export function createIncident(data: any): Promise<Incident> { 
  return apiFetch('/incidents', { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }); 
}

export interface RouteRequestPayload {
  incident: {
    latitude: number;
    longitude: number;
  };
  centers: Array<{
    id: string;
    name?: string;
    status: "available" | "assigned" | "unavailable";
    latitude: number;
    longitude: number;
  }>;
  speedKmh?: number;
}

export interface RouteResponsePayload {
  success: boolean;
  data: {
    assignedUnit: ResponseCenter;
    distanceKm: number;
    etaMinutes: number;
    responseCenter: ResponseCenter;
  };
}

export async function findNearestResponseCenter(
  payload: RouteRequestPayload
): Promise<RouteResponsePayload['data'] | null> {
  try {
    const response = await apiFetch<RouteResponsePayload>('/incidents/route', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return response.success ? response.data : null;
  } catch (err) {
    console.warn('Routing lookup failed:', err);
    return null;
  }
}

