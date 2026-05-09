/**
 * DAA Algorithms — all 8 implementations
 * 1. K-Means Clustering   (hotspot detection)
 * 2. Dijkstra             (shortest route)
 * 3. Greedy Assignment    (nearest resource)
 * 4. Merge Sort / D&C     (severity ordering)
 * 5. Binary Search        (time-range lookup)
 * 6. KMP String Matching  (keyword detection)
 * 7. D&C Partitioning     (geospatial sharding)
 * 8. DP-TSP               (optimal patrol route)
 */

export interface Point { lat: number; lng: number; id?: string; }
export interface Incident {
  id: string; lat: number; lng: number;
  severity: "low" | "medium" | "high" | "critical";
  createdAt: Date; clusterId?: number;
}
export interface Resource {
  id: string; name: string; type: string;
  lat: number; lng: number;
  status: "available" | "assigned" | "unavailable";
}
export interface Graph {
  nodes: string[];
  edges: Map<string, Array<{ to: string; weight: number }>>;
}
export interface Hotspot {
  clusterId: number; centroid: Point;
  incidents: Incident[]; severityScore: number;
}

// ── 1. K-MEANS ────────────────────────────────────────────────
export function kMeansClustering(incidents: Incident[], k: number, maxIter = 100): Hotspot[] {
  if (incidents.length === 0) return [];
  if (incidents.length < k) k = incidents.length;

  let centroids: Point[] = [...incidents]
    .sort(() => Math.random() - 0.5)
    .slice(0, k)
    .map(i => ({ lat: i.lat, lng: i.lng }));

  let assignments = new Array(incidents.length).fill(0);
  let changed = true;
  let iter = 0;

  while (changed && iter < maxIter) {
    changed = false; iter++;
    for (let i = 0; i < incidents.length; i++) {
      let best = 0, minD = Infinity;
      for (let c = 0; c < k; c++) {
        const d = eucDist(incidents[i], centroids[c]);
        if (d < minD) { minD = d; best = c; }
      }
      if (assignments[i] !== best) { assignments[i] = best; changed = true; }
    }
    const sums = Array.from({ length: k }, () => ({ lat: 0, lng: 0, n: 0 }));
    for (let i = 0; i < incidents.length; i++) {
      const c = assignments[i];
      sums[c].lat += incidents[i].lat;
      sums[c].lng += incidents[i].lng;
      sums[c].n++;
    }
    for (let c = 0; c < k; c++) {
      if (sums[c].n > 0)
        centroids[c] = { lat: sums[c].lat / sums[c].n, lng: sums[c].lng / sums[c].n };
    }
  }

  incidents.forEach((inc, i) => { inc.clusterId = assignments[i]; });

  return centroids.map((centroid, clusterId) => {
    const members = incidents.filter((_, i) => assignments[i] === clusterId);
    return { clusterId, centroid, incidents: members, severityScore: sevScore(members) };
  }).sort((a, b) => b.severityScore - a.severityScore);
}
function eucDist(a: Point, b: Point) {
  return Math.sqrt((a.lat - b.lat) ** 2 + (a.lng - b.lng) ** 2);
}
function sevScore(inc: Incident[]) {
  const w = { low: 1, medium: 2, high: 4, critical: 8 };
  return inc.reduce((s, i) => s + w[i.severity], 0);
}

// ── 2. DIJKSTRA ───────────────────────────────────────────────
export function dijkstra(graph: Graph, src: string, tgt: string): { path: string[]; distance: number } {
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const visited = new Set<string>();
  const pq: Array<{ node: string; d: number }> = [];
  for (const n of graph.nodes) { dist.set(n, n === src ? 0 : Infinity); prev.set(n, null); }
  pq.push({ node: src, d: 0 });
  while (pq.length > 0) {
    pq.sort((a, b) => a.d - b.d);
    const { node: u } = pq.shift()!;
    if (visited.has(u)) continue;
    visited.add(u);
    if (u === tgt) break;
    for (const { to, weight } of graph.edges.get(u) ?? []) {
      if (visited.has(to)) continue;
      const nd = (dist.get(u) ?? Infinity) + weight;
      if (nd < (dist.get(to) ?? Infinity)) {
        dist.set(to, nd); prev.set(to, u); pq.push({ node: to, d: nd });
      }
    }
  }
  const path: string[] = [];
  let cur: string | null = tgt;
  while (cur !== null) { path.unshift(cur); cur = prev.get(cur) ?? null; }
  return { path: path[0] === src ? path : [], distance: dist.get(tgt) ?? Infinity };
}

// ── 3. GREEDY RESOURCE ASSIGNMENT ────────────────────────────
export function greedyAssign(incidents: Incident[], resources: Resource[]) {
  const avail = resources.filter(r => r.status === "available");
  const used = new Set<string>();
  const result: Array<{ incidentId: string; resourceId: string; distanceKm: number }> = [];
  const sorted = mergeSort([...incidents], (a, b) => sevRank(b.severity) - sevRank(a.severity));
  for (const inc of sorted) {
    let best: Resource | null = null; let minD = Infinity;
    for (const res of avail) {
      if (used.has(res.id)) continue;
      const d = haversine({ lat: inc.lat, lng: inc.lng }, { lat: res.lat, lng: res.lng });
      if (d < minD) { minD = d; best = res; }
    }
    if (best) { used.add(best.id); result.push({ incidentId: inc.id, resourceId: best.id, distanceKm: minD }); }
  }
  return result;
}
function sevRank(s: string) { return { low: 1, medium: 2, high: 3, critical: 4 }[s] ?? 0; }

// ── 4. MERGE SORT (D&C) ──────────────────────────────────────
export function mergeSort<T>(arr: T[], cmp: (a: T, b: T) => number): T[] {
  if (arr.length <= 1) return arr;
  const mid = arr.length >> 1;
  return merge(mergeSort(arr.slice(0, mid), cmp), mergeSort(arr.slice(mid), cmp), cmp);
}
function merge<T>(L: T[], R: T[], cmp: (a: T, b: T) => number): T[] {
  const out: T[] = []; let i = 0, j = 0;
  while (i < L.length && j < R.length) cmp(L[i], R[j]) <= 0 ? out.push(L[i++]) : out.push(R[j++]);
  return out.concat(L.slice(i), R.slice(j));
}
export function sortIncidents(inc: Incident[]) {
  return mergeSort(inc, (a, b) => {
    const d = sevRank(b.severity) - sevRank(a.severity);
    return d !== 0 ? d : b.createdAt.getTime() - a.createdAt.getTime();
  });
}

// ── 5. BINARY SEARCH ─────────────────────────────────────────
export function binarySearchByTime(inc: Incident[], target: Date): number {
  let lo = 0, hi = inc.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const t = inc[mid].createdAt.getTime();
    if (t === target.getTime()) return mid;
    t < target.getTime() ? (lo = mid + 1) : (hi = mid - 1);
  }
  return -1;
}
export function incidentsInRange(sorted: Incident[], from: Date, to: Date) {
  let lo = 0, hi = sorted.length;
  while (lo < hi) { const m = (lo + hi) >> 1; sorted[m].createdAt < from ? (lo = m + 1) : (hi = m); }
  const left = lo;
  lo = 0; hi = sorted.length;
  while (lo < hi) { const m = (lo + hi) >> 1; sorted[m].createdAt <= to ? (lo = m + 1) : (hi = m); }
  return sorted.slice(left, lo);
}

// ── 6. KMP STRING MATCHING ───────────────────────────────────
export function kmpSearch(text: string, pattern: string): number[] {
  const matches: number[] = [];
  if (!pattern) return matches;
  const t = text.toLowerCase(), p = pattern.toLowerCase();
  const fail = buildFail(p);
  for (let i = 0, j = 0; i < t.length;) {
    if (t[i] === p[j]) { i++; j++; if (j === p.length) { matches.push(i - j); j = fail[j - 1]; } }
    else if (j > 0) j = fail[j - 1]; else i++;
  }
  return matches;
}
function buildFail(p: string) {
  const f = new Array(p.length).fill(0);
  for (let i = 1, k = 0; i < p.length;) {
    if (p[k] === p[i]) { f[i++] = ++k; }
    else if (k > 0) k = f[k - 1]; else f[i++] = 0;
  }
  return f;
}
export const DANGER_KEYWORDS = ["weapon","gun","knife","bomb","attack","assault","robbery","murder","shooting","explosion","fire","hostage","threat"];
export function detectKeywords(text: string, kws = DANGER_KEYWORDS) {
  return kws.map(kw => ({ keyword: kw, positions: kmpSearch(text, kw), count: kmpSearch(text, kw).length }))
            .filter(r => r.count > 0);
}

// ── 7. D&C SPATIAL PARTITION ─────────────────────────────────
export interface Partition { id: string; incidents: Incident[]; }
export function partitionIncidents(incidents: Incident[], maxPerPart = 50): Partition[] {
  const parts: Partition[] = [];
  function divide(items: Incident[], minLat: number, maxLat: number, minLng: number, maxLng: number, depth: number) {
    if (items.length === 0) return;
    if (items.length <= maxPerPart || depth > 8) { parts.push({ id: `p${parts.length}`, incidents: items }); return; }
    if (maxLat - minLat >= maxLng - minLng) {
      const mid = (minLat + maxLat) / 2;
      divide(items.filter(i => i.lat <= mid), minLat, mid, minLng, maxLng, depth + 1);
      divide(items.filter(i => i.lat > mid),  mid, maxLat, minLng, maxLng, depth + 1);
    } else {
      const mid = (minLng + maxLng) / 2;
      divide(items.filter(i => i.lng <= mid), minLat, maxLat, minLng, mid,    depth + 1);
      divide(items.filter(i => i.lng > mid),  minLat, maxLat, mid,    maxLng, depth + 1);
    }
  }
  if (!incidents.length) return parts;
  const lats = incidents.map(i => i.lat), lngs = incidents.map(i => i.lng);
  divide(incidents, Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs), 0);
  return parts;
}

// ── 8. DP-TSP ────────────────────────────────────────────────
export function tspDP(stops: Point[]): { order: number[]; totalDistance: number } {
  const n = stops.length;
  if (n === 0) return { order: [], totalDistance: 0 };
  if (n === 1) return { order: [0], totalDistance: 0 };
  if (n > 20) return greedyTSP(stops);
  const d = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => i === j ? 0 : haversine(stops[i], stops[j])));
  const FULL = (1 << n) - 1;
  const dp  = Array.from({ length: 1 << n }, () => new Array(n).fill(Infinity));
  const par = Array.from({ length: 1 << n }, () => new Array(n).fill(-1));
  dp[1][0] = 0;
  for (let mask = 1; mask <= FULL; mask++) {
    for (let u = 0; u < n; u++) {
      if (!(mask & (1 << u)) || dp[mask][u] === Infinity) continue;
      for (let v = 0; v < n; v++) {
        if (mask & (1 << v)) continue;
        const nm = mask | (1 << v), nd = dp[mask][u] + d[u][v];
        if (nd < dp[nm][v]) { dp[nm][v] = nd; par[nm][v] = u; }
      }
    }
  }
  let last = 0, minD = Infinity;
  for (let u = 0; u < n; u++) if (dp[FULL][u] < minD) { minD = dp[FULL][u]; last = u; }
  const order: number[] = []; let mask = FULL, cur = last;
  while (cur !== -1) { order.unshift(cur); const p = par[mask][cur]; mask ^= 1 << cur; cur = p; }
  return { order, totalDistance: minD };
}
function greedyTSP(stops: Point[]) {
  const visited = new Set([0]); const order = [0]; let total = 0, cur = 0;
  while (visited.size < stops.length) {
    let best = -1, bD = Infinity;
    for (let i = 0; i < stops.length; i++) {
      if (visited.has(i)) continue;
      const d = haversine(stops[cur], stops[i]); if (d < bD) { bD = d; best = i; }
    }
    if (best === -1) break; visited.add(best); order.push(best); total += bD; cur = best;
  }
  return { order, totalDistance: total };
}

// ── UTILITY ──────────────────────────────────────────────────
export function haversine(a: Point, b: Point): number {
  const R = 6371, toR = (d: number) => d * Math.PI / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const s = Math.sin(dLat/2)**2 + Math.cos(toR(a.lat))*Math.cos(toR(b.lat))*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}
