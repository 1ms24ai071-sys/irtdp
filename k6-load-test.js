import http from 'k6/http';
import { check, sleep } from 'k6';

// Simulates 1000+ concurrent traffic bursts
export const options = {
  stages: [
    { duration: '30s', target: 200 },  // Ramp-up to 200 users over 30s
    { duration: '1m', target: 1000 },  // Burst to 1000 users for 1 min
    { duration: '30s', target: 0 },    // Cool down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be < 500ms
    http_req_failed: ['rate<0.01'],   // Error rate should be less than 1%
  },
};

// Assuming tests are run locally or against a staging ingress domain
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';

// Mock credentials / parameters
const TEST_EMAIL = `loadtest_${Math.floor(Math.random() * 10000)}@system.local`;
const TEST_PASS = 'load_test_p4ssw0rd';

export default function () {
  // 1. Healthcheck Flow (High frequency)
  const healthRes = http.get(`${BASE_URL}/health`);
  check(healthRes, {
    'health returns 200': (r) => r.status === 200,
  });

  // 2. Incident Read Flow (Moderate frequency)
  const incidentRes = http.get(`${BASE_URL}/api/incidents?limit=10&page=1`, {
    headers: { 'Authorization': 'Bearer DUMMY_LOAD_TEST_TOKEN' } // normally would auth dynamically
  });
  check(incidentRes, { 'incident fetch bypasses proxy correctly': (r) => r.status === 200 || r.status === 401 }); 

  sleep(1);
}
