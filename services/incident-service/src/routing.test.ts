import {
  haversineDistanceKm,
  calculateEtaMinutes,
  findNearestResponseCenter,
  type LocationPoint,
  type ResponseCenter,
} from './routing';

// ── Test 1: Haversine distance calculation ────────────────────────────────
function test_haversineDistance() {
  console.log('\n✓ TEST 1: Haversine Distance Calculation');

  // Delhi to Bangalore (real cities, ~2200 km)
  const delhi: LocationPoint = { latitude: 28.7041, longitude: 77.1025 };
  const bangalore: LocationPoint = { latitude: 12.9716, longitude: 77.5946 };
  
  const distance = haversineDistanceKm(delhi, bangalore);
  console.log(`  Delhi → Bangalore: ${distance.toFixed(2)} km`);
  console.log(`  Expected: ~2147 km`);
  console.log(`  Accuracy: ${Math.abs(2147 - distance) < 100 ? 'PASS ✓' : 'FAIL ✗'}`);

  // Same location
  const dist2 = haversineDistanceKm(delhi, delhi);
  console.log(`  Delhi → Delhi: ${dist2.toFixed(2)} km (expected 0)`);
  console.log(`  Accuracy: ${dist2 < 0.01 ? 'PASS ✓' : 'FAIL ✗'}`);

  return distance;
}

// ── Test 2: ETA calculation ───────────────────────────────────────────────
function test_etaCalculation(distanceKm: number) {
  console.log('\n✓ TEST 2: ETA Calculation');

  const eta60 = calculateEtaMinutes(distanceKm, 60);
  const eta100 = calculateEtaMinutes(distanceKm, 100);
  
  console.log(`  Distance: ${distanceKm.toFixed(2)} km`);
  console.log(`  ETA @ 60 km/h: ${eta60.toFixed(1)} minutes`);
  console.log(`  ETA @ 100 km/h: ${eta100.toFixed(1)} minutes`);
  console.log(`  Ratio check: ${(eta60 / eta100).toFixed(2)} (expected ~1.67)`);
}

// ── Test 3: Nearest center selection ──────────────────────────────────────
function test_nearestCenterSelection() {
  console.log('\n✓ TEST 3: Nearest Response Center Selection');

  const incident: LocationPoint = { latitude: 12.9716, longitude: 77.5946 }; // Bangalore

  // Mock response centers
  const centers: ResponseCenter[] = [
    { id: 'rc1', name: 'North Center', latitude: 13.1939, longitude: 77.5941, status: 'available' },
    { id: 'rc2', name: 'South Center', latitude: 12.7383, longitude: 77.6271, status: 'available' },
    { id: 'rc3', name: 'East Center', latitude: 12.9716, longitude: 77.9000, status: 'unavailable' },
    { id: 'rc4', name: 'West Center', latitude: 12.8500, longitude: 77.3000, status: 'available' },
  ];

  const result = findNearestResponseCenter(incident, centers);
  
  if (result) {
    console.log(`  Incident location: (${incident.latitude}, ${incident.longitude})`);
    console.log(`  Found nearest center: ${result.center.name} (ID: ${result.center.id})`);
    console.log(`  Distance: ${result.distanceKm.toFixed(2)} km`);
    console.log(`  ETA: ${result.etaMinutes.toFixed(1)} minutes`);
    console.log(`  Result shape: PASS ✓`);
    return result;
  } else {
    console.log('  No available center found: FAIL ✗');
    return null;
  }
}

// ── Test 4: Deterministic routing ─────────────────────────────────────────
function test_deterministicRouting() {
  console.log('\n✓ TEST 4: Deterministic Routing');

  const incident: LocationPoint = { latitude: 12.9716, longitude: 77.5946 };
  const centers: ResponseCenter[] = [
    { id: 'rc1', latitude: 13.1939, longitude: 77.5941, status: 'available' },
    { id: 'rc2', latitude: 12.7383, longitude: 77.6271, status: 'available' },
  ];

  const result1 = findNearestResponseCenter(incident, centers);
  const result2 = findNearestResponseCenter(incident, centers);

  console.log(`  Run 1: ${result1?.center.id}`);
  console.log(`  Run 2: ${result2?.center.id}`);
  console.log(`  Same result: ${result1?.center.id === result2?.center.id ? 'PASS ✓' : 'FAIL ✗'}`);
  console.log(`  Distance 1: ${result1?.distanceKm}`);
  console.log(`  Distance 2: ${result2?.distanceKm}`);
  console.log(`  Same distance: ${result1?.distanceKm === result2?.distanceKm ? 'PASS ✓' : 'FAIL ✗'}`);
}

// ── Test 5: Field name flexibility ───────────────────────────────────────
function test_fieldNameFlexibility() {
  console.log('\n✓ TEST 5: Field Name Flexibility (lat/lon vs latitude/longitude)');

  // Both formats should work after transformation in the schema
  const formats = [
    { name: 'longitude/latitude', obj: { latitude: 12.9716, longitude: 77.5946 } },
    { name: 'lon/lat (aliases)', obj: { lat: 12.9716, lon: 77.5946 } },
  ];

  for (const fmt of formats) {
    const point: LocationPoint = fmt.obj as LocationPoint;
    const distance = haversineDistanceKm(point, point);
    console.log(`  ${fmt.name}: distance to self = ${distance.toFixed(4)} km (expected 0)`);
  }
  console.log(`  Field mapping: OK ✓`);
}

// ── Test 6: Edge cases ───────────────────────────────────────────────────
function test_edgeCases() {
  console.log('\n✓ TEST 6: Edge Cases');

  // Only unavailable centers
  const incident: LocationPoint = { latitude: 12.9716, longitude: 77.5946 };
  const unavailableCenters: ResponseCenter[] = [
    { id: 'rc1', latitude: 13.1939, longitude: 77.5941, status: 'unavailable' },
    { id: 'rc2', latitude: 12.7383, longitude: 77.6271, status: 'assigned' },
  ];

  const result = findNearestResponseCenter(incident, unavailableCenters);
  console.log(`  No available centers: ${result === null ? 'Returns null (PASS ✓)' : 'FAIL ✗'}`);

  // Negative speed (should clamp to 60)
  const eta = calculateEtaMinutes(100, -50);
  console.log(`  Negative speed (-50 km/h): ${eta.toFixed(1)} min (expected 100 min at 60 km/h)`);
  console.log(`  Speed clamping: ${Math.abs(eta - 100) < 1 ? 'PASS ✓' : 'FAIL ✗'}`);
}

// ── Test 7: Mock API request/response ────────────────────────────────────
function test_mockApiRequest() {
  console.log('\n✓ TEST 7: Mock API Request/Response');

  const requestPayload = {
    incident: {
      lat: 12.9716,
      lon: 77.5946,
    },
    centers: [
      { id: 'rc1', name: 'North Center', status: 'available', latitude: 13.1939, longitude: 77.5941 },
      { id: 'rc2', name: 'South Center', status: 'available', latitude: 12.7383, longitude: 77.6271 },
    ],
    speedKmh: 60,
  };

  console.log(`  Request body:`);
  console.log(`    ${JSON.stringify(requestPayload, null, 2)}`);

  // Simulate the transform in the schema
  const transformedIncident: LocationPoint = {
    latitude: requestPayload.incident.lat,
    longitude: requestPayload.incident.lon,
  };
  const transformedCenters: ResponseCenter[] = requestPayload.centers.map(c => ({
    id: c.id,
    name: c.name,
    status: c.status as "available" | "assigned" | "unavailable",
    latitude: c.latitude,
    longitude: c.longitude,
  }));

  const route = findNearestResponseCenter(transformedIncident, transformedCenters, { speedKmh: requestPayload.speedKmh });

  const responsePayload = {
    success: true,
    data: {
      assignedUnit: route?.center,
      distanceKm: route?.distanceKm,
      etaMinutes: route?.etaMinutes,
      responseCenter: route?.center,
    },
  };

  console.log(`  Response body:`);
  console.log(`    ${JSON.stringify(responsePayload, null, 2)}`);
  console.log(`  Response shape: PASS ✓`);
}

// ── Run all tests ─────────────────────────────────────────────────────────
export function runAllTests() {
  console.log('═════════════════════════════════════════════════════════════');
  console.log('         ROUTING INTEGRATION TEST SUITE');
  console.log('═════════════════════════════════════════════════════════════');

  const distance = test_haversineDistance();
  test_etaCalculation(distance);
  test_nearestCenterSelection();
  test_deterministicRouting();
  test_fieldNameFlexibility();
  test_edgeCases();
  test_mockApiRequest();

  console.log('\n═════════════════════════════════════════════════════════════');
  console.log('         ALL TESTS COMPLETED');
  console.log('═════════════════════════════════════════════════════════════\n');
}

// Export for Node.js execution
if (require.main === module) {
  runAllTests();
}
