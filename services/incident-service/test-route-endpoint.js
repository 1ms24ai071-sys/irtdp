#!/usr/bin/env node

const http = require('http');

const testPayload = {
  incident: {
    lat: 12.9716,
    lon: 77.5946,
  },
  centers: [
    {
      id: 'rc1',
      name: 'North Center',
      status: 'available',
      latitude: 13.1939,
      longitude: 77.5941,
    },
    {
      id: 'rc2',
      name: 'South Center',
      status: 'available',
      latitude: 12.7383,
      longitude: 77.6271,
    },
    {
      id: 'rc3',
      name: 'East Center',
      status: 'unavailable',
      latitude: 12.9716,
      longitude: 77.9000,
    },
  ],
  speedKmh: 60,
};

const jsonData = JSON.stringify(testPayload);

const options = {
  hostname: 'localhost',
  port: 3002,
  path: '/api/incidents/route',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(jsonData),
  },
};

console.log('═══════════════════════════════════════════════════════════');
console.log('RUNTIME VERIFICATION: POST /api/incidents/route');
console.log('═══════════════════════════════════════════════════════════');
console.log('');
console.log('REQUEST PAYLOAD:');
console.log(JSON.stringify(testPayload, null, 2));
console.log('');
console.log('SENDING REQUEST...');
console.log('');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`HTTP ${res.statusCode}`);
    console.log('');
    console.log('RESPONSE PAYLOAD:');
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
      console.log('');

      // Verify response
      if (parsed.success && parsed.data) {
        const result = parsed.data;
        console.log('VERIFICATION RESULTS:');
        console.log('');
        console.log(`✓ Status: ${res.statusCode} (Success)`);
        console.log(`✓ Selected Center: ${result.responseCenter.name} (${result.responseCenter.id})`);
        console.log(`✓ Distance: ${result.distanceKm} km`);
        console.log(`✓ ETA: ${result.etaMinutes} minutes @ ${testPayload.speedKmh} km/h`);
        console.log('');

        // Manual calculation verification
        const incident = { latitude: testPayload.incident.lat, longitude: testPayload.incident.lon };
        const center = result.responseCenter;
        const R = 6371;
        const toRad = (d) => d * Math.PI / 180;
        const dLat = toRad(center.latitude - incident.latitude);
        const dLon = toRad(center.longitude - incident.longitude);
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(incident.latitude)) * Math.cos(toRad(center.latitude)) * Math.sin(dLon / 2) ** 2;
        const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const expectedEta = Math.round((distance / testPayload.speedKmh) * 60 * 10) / 10;

        console.log('DISTANCE ACCURACY:');
        console.log(`  Calculated: ${distance.toFixed(2)} km`);
        console.log(`  API Response: ${result.distanceKm} km`);
        console.log(`  Match: ${Math.abs(distance - result.distanceKm) < 0.1 ? '✓ YES' : '✗ NO'}`);
        console.log('');

        console.log('ETA ACCURACY:');
        console.log(`  Calculated: ${expectedEta.toFixed(1)} minutes`);
        console.log(`  API Response: ${result.etaMinutes} minutes`);
        console.log(`  Match: ${Math.abs(expectedEta - result.etaMinutes) < 0.2 ? '✓ YES' : '✗ NO'}`);
        console.log('');

        console.log('NEAREST CENTER VALIDATION:');
        const distances = testPayload.centers
          .filter(c => c.status === 'available')
          .map(c => {
            const dlat = toRad(c.latitude - incident.latitude);
            const dlon = toRad(c.longitude - incident.longitude);
            const a2 = Math.sin(dlat / 2) ** 2 + Math.cos(toRad(incident.latitude)) * Math.cos(toRad(c.latitude)) * Math.sin(dlon / 2) ** 2;
            const d = R * 2 * Math.atan2(Math.sqrt(a2), Math.sqrt(1 - a2));
            return { id: c.id, name: c.name, distance: d };
          })
          .sort((a, b) => a.distance - b.distance);

        console.log(`  Available centers: ${distances.length}`);
        distances.forEach((d, i) => {
          const isSelected = d.id === result.responseCenter.id;
          console.log(`  ${i + 1}. ${d.name} (${d.id}): ${d.distance.toFixed(2)} km ${isSelected ? '← SELECTED ✓' : ''}`);
        });
        console.log('');

        if (distances[0].id === result.responseCenter.id) {
          console.log('✓ CORRECT: Selected center is the nearest available center');
        } else {
          console.log('✗ ERROR: Selected center is NOT the nearest');
        }
      } else {
        console.log('✗ ERROR: Response format invalid');
      }
    } catch (e) {
      console.log('ERROR parsing response:', e.message);
      console.log('Raw response:', data);
    }
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
  });
});

req.on('error', (error) => {
  console.error('✗ ERROR: Request failed');
  console.error(error.message);
  console.log('');
  console.log('Make sure the incident service is running on port 3002');
  console.log('  cd services/incident-service && npm run build && node dist/index.js');
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  process.exit(1);
});

req.write(jsonData);
req.end();
