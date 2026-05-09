import {
  kMeansClustering, dijkstra, greedyAssign, mergeSort, sortIncidents,
  binarySearchByTime, incidentsInRange, kmpSearch, detectKeywords,
  partitionIncidents, tspDP, haversine,
  type Incident, type Resource, type Point
} from "./algorithms";

const mkInc = (id: string, lat: number, lng: number, severity: Incident["severity"] = "low", createdAt = new Date()): Incident =>
  ({ id, lat, lng, severity, createdAt });
const mkRes = (id: string, lat: number, lng: number, status: Resource["status"] = "available"): Resource =>
  ({ id, name: id, type: "police_car", lat, lng, status });

describe("1. K-Means Clustering", () => {
  test("returns k hotspots", () => {
    const inc = [0,1,2,3,4,5].map(i => mkInc(`i${i}`, 12+i*0.1, 77+i*0.1));
    expect(kMeansClustering(inc, 3).length).toBe(3);
  });
  test("all incidents assigned", () => {
    const inc = Array.from({length:20}, (_,i) => mkInc(`i${i}`, 12+i*0.01, 77+i*0.01));
    const hs = kMeansClustering(inc, 4);
    expect(hs.reduce((s,h)=>s+h.incidents.length,0)).toBe(20);
  });
  test("sorted by severity score desc", () => {
    const inc = [mkInc("a",12.97,77.59,"critical"),mkInc("b",12.97,77.59,"critical"),mkInc("c",14,79,"low")];
    const hs = kMeansClustering(inc, 2);
    expect(hs[0].severityScore).toBeGreaterThanOrEqual(hs[1].severityScore);
  });
  test("handles fewer incidents than k", () => {
    expect(kMeansClustering([mkInc("x",12,77)], 5).length).toBe(1);
  });
  test("empty input returns empty", () => {
    expect(kMeansClustering([], 3)).toEqual([]);
  });
});

describe("2. Dijkstra", () => {
  const g = {
    nodes: ["A","B","C","D"],
    edges: new Map([
      ["A", [{to:"B",weight:1},{to:"C",weight:4}]],
      ["B", [{to:"C",weight:2},{to:"D",weight:5}]],
      ["C", [{to:"D",weight:1}]],
      ["D", []]
    ])
  };
  test("finds shortest path A->D", () => {
    const r = dijkstra(g, "A", "D");
    expect(r.path).toEqual(["A","B","C","D"]);
    expect(r.distance).toBe(4);
  });
  test("disconnected returns empty path", () => {
    const g2 = { nodes:["A","B"], edges: new Map([["A",[]],["B",[]]]) };
    expect(dijkstra(g2,"A","B").path.length).toBe(0);
  });
  test("src===tgt returns distance 0", () => {
    const g3 = { nodes:["A"], edges: new Map([["A",[]]]) };
    expect(dijkstra(g3,"A","A").distance).toBe(0);
  });
});

describe("3. Greedy Assignment", () => {
  test("assigns resources to incidents", () => {
    const inc = [mkInc("i1",12.97,77.59,"high"), mkInc("i2",12.98,77.6,"low")];
    const res = [mkRes("r1",12.96,77.58), mkRes("r2",13.0,77.65)];
    const out = greedyAssign(inc, res);
    expect(out.length).toBe(2);
    expect(out.every(a => a.distanceKm >= 0)).toBe(true);
  });
  test("skips unavailable resources", () => {
    const inc = [mkInc("i1",12.97,77.59,"high")];
    const res = [mkRes("r1",12.96,77.58,"unavailable")];
    expect(greedyAssign(inc, res).length).toBe(0);
  });
  test("high severity served first", () => {
    const inc = [mkInc("low",12.0,77.0,"low"), mkInc("crit",12.01,77.01,"critical")];
    const res = [mkRes("r1",12.005,77.005)];
    expect(greedyAssign(inc, res)[0].incidentId).toBe("crit");
  });
});

describe("4. Merge Sort", () => {
  test("sorts numbers", () => {
    expect(mergeSort([5,3,1,4,2],(a,b)=>a-b)).toEqual([1,2,3,4,5]);
  });
  test("sorts incidents by severity desc", () => {
    const inc = ["low","critical","medium","high"].map(s => mkInc(s,0,0,s as any));
    const sorted = sortIncidents(inc);
    expect(sorted.map(i=>i.severity)).toEqual(["critical","high","medium","low"]);
  });
  test("empty array", () => { expect(mergeSort([],(a:number,b:number)=>a-b)).toEqual([]); });
  test("single element", () => { expect(mergeSort([42],(a:number,b:number)=>a-b)).toEqual([42]); });
});

describe("5. Binary Search", () => {
  const base = new Date(2024,0,1).getTime();
  const inc = Array.from({length:5}, (_,i) => mkInc(`i${i}`,0,0,"low", new Date(base + i*86400000)));
  test("finds existing element", () => {
    expect(binarySearchByTime(inc, new Date(base+2*86400000))).toBe(2);
  });
  test("returns -1 for missing", () => {
    expect(binarySearchByTime(inc, new Date(2020,0,1))).toBe(-1);
  });
  test("range query returns correct slice", () => {
    const r = incidentsInRange(inc, new Date(base+86400000), new Date(base+3*86400000));
    expect(r.length).toBe(3);
  });
});

describe("6. KMP String Matching", () => {
  test("finds pattern", () => {
    expect(kmpSearch("there was a robbery near the bank","robbery")).toContain(12);
  });
  test("case-insensitive", () => {
    expect(kmpSearch("A WEAPON was found","weapon").length).toBeGreaterThan(0);
  });
  test("no match returns empty", () => {
    expect(kmpSearch("peaceful day","robbery")).toEqual([]);
  });
  test("multiple occurrences", () => {
    expect(kmpSearch("fire here, fire there","fire").length).toBe(2);
  });
  test("detectKeywords finds danger words", () => {
    const r = detectKeywords("I saw a person with a weapon near the explosion");
    expect(r.map(x=>x.keyword)).toContain("weapon");
    expect(r.map(x=>x.keyword)).toContain("explosion");
  });
});

describe("7. D&C Partitioning", () => {
  test("all incidents included in partitions", () => {
    const inc = Array.from({length:200}, (_,i) => mkInc(`i${i}`, 10+Math.random()*5, 70+Math.random()*5));
    const parts = partitionIncidents(inc, 50);
    expect(parts.reduce((s,p)=>s+p.incidents.length,0)).toBe(200);
  });
  test("each partition <= maxPerPart", () => {
    const inc = Array.from({length:100}, (_,i) => mkInc(`i${i}`, 10+Math.random()*5, 70+Math.random()*5));
    partitionIncidents(inc, 30).forEach(p => expect(p.incidents.length).toBeLessThanOrEqual(30));
  });
  test("empty input", () => { expect(partitionIncidents([], 50)).toEqual([]); });
});

describe("8. DP-TSP", () => {
  test("visits all stops", () => {
    const stops: Point[] = [{lat:0,lng:0},{lat:0,lng:1},{lat:1,lng:0},{lat:1,lng:1}];
    const { order } = tspDP(stops);
    expect(new Set(order).size).toBe(4);
  });
  test("single stop returns 0 distance", () => {
    expect(tspDP([{lat:12.97,lng:77.59}])).toEqual({order:[0],totalDistance:0});
  });
  test("empty returns empty", () => {
    expect(tspDP([])).toEqual({order:[],totalDistance:0});
  });
});

describe("Haversine", () => {
  test("same point = 0", () => {
    expect(haversine({lat:12.97,lng:77.59},{lat:12.97,lng:77.59})).toBe(0);
  });
  test("Bangalore to Chennai ~290km", () => {
    const d = haversine({lat:12.97,lng:77.59},{lat:13.08,lng:80.27});
    expect(d).toBeGreaterThan(250);
    expect(d).toBeLessThan(320);
  });
});
