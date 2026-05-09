const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const API_BASE = 'http://localhost:3001'; // incident-service direct
const AUTH_TOKEN = 'your-jwt-token-here'; // Need to get a valid token first

async function createIncident(title, description, category, severity, lat, lng) {
  try {
    const response = await axios.post(`${API_BASE}/api/incidents`, {
      title,
      description,
      category,
      severity,
      latitude: lat,
      longitude: lng
    }, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (response.data.success) {
      console.log(`✓ Incident created: ${response.data.data.id}`);
      return response.data.data.id;
    } else {
      console.error(`✗ Failed: ${response.data.error}`);
      return null;
    }
  } catch (error) {
    console.error(`✗ Error: ${error.response?.data?.error || error.message}`);
    return null;
  }
}

async function runLoadTest(concurrentRequests = 10) {
  console.log(`Starting load test with ${concurrentRequests} concurrent requests...`);

  const incidents = [];
  for (let i = 0; i < concurrentRequests; i++) {
    incidents.push({
      title: `Load Test Incident ${i + 1}`,
      description: `Test incident for load testing - ${uuidv4()}`,
      category: 'test',
      severity: Math.floor(Math.random() * 5) + 1,
      lat: 40.7128 + (Math.random() - 0.5) * 0.1, // NYC area
      lng: -74.0060 + (Math.random() - 0.5) * 0.1
    });
  }

  const startTime = Date.now();
  const promises = incidents.map(incident =>
    createIncident(incident.title, incident.description, incident.category, incident.severity, incident.lat, incident.lng)
  );

  const results = await Promise.allSettled(promises);
  const endTime = Date.now();

  const successful = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;
  const failed = results.length - successful;

  console.log(`\nLoad test completed in ${endTime - startTime}ms`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success rate: ${(successful / results.length * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('\nFailed requests:');
    results.forEach((result, i) => {
      if (result.status === 'rejected' || result.value === null) {
        console.log(`  Request ${i + 1}: Failed`);
      }
    });
  }

  return { successful, failed, totalTime: endTime - startTime };
}

async function main() {
  // First, get a valid JWT token by logging in
  try {
    console.log('Getting JWT token...');
    const loginResponse = await axios.post(`${API_BASE.replace('3001', '3000')}/api/auth/login`, {
      email: 'admin@emergency.com',
      password: 'admin123'
    });

    if (loginResponse.data.success) {
      const token = loginResponse.data.data.accessToken;
      console.log('✓ Got JWT token');

      // Update the auth token
      // Note: In real implementation, you'd set this globally or pass it
      // For now, we'll modify the function to accept token

      // Run load tests with different concurrency levels
      const testLevels = [10, 25, 50];

      for (const level of testLevels) {
        console.log(`\n=== Testing ${level} concurrent requests ===`);
        const result = await runLoadTestWithToken(level, token);

        if (result.failed > 0) {
          console.log(`❌ Load test failed at ${level} concurrency`);
          process.exit(1);
        }

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log('\n✅ All load tests passed!');

    } else {
      console.error('Failed to login:', loginResponse.data.error);
      process.exit(1);
    }

  } catch (error) {
    console.error('Login error:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function runLoadTestWithToken(concurrentRequests, token) {
  console.log(`Starting load test with ${concurrentRequests} concurrent requests...`);

  const incidents = [];
  for (let i = 0; i < concurrentRequests; i++) {
    incidents.push({
      title: `Load Test Incident ${i + 1}`,
      description: `Test incident for load testing - ${uuidv4()}`,
      category: 'test',
      severity: Math.floor(Math.random() * 5) + 1,
      lat: 40.7128 + (Math.random() - 0.5) * 0.1,
      lng: -74.0060 + (Math.random() - 0.5) * 0.1
    });
  }

  const startTime = Date.now();
  const promises = incidents.map(incident =>
    createIncidentWithToken(incident.title, incident.description, incident.category, incident.severity, incident.lat, incident.lng, token)
  );

  const results = await Promise.allSettled(promises);
  const endTime = Date.now();

  const successful = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;
  const failed = results.length - successful;

  console.log(`\nLoad test completed in ${endTime - startTime}ms`);
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success rate: ${(successful / results.length * 100).toFixed(1)}%`);

  return { successful, failed, totalTime: endTime - startTime };
}

async function createIncidentWithToken(title, description, category, severity, lat, lng, token) {
  try {
    const response = await axios.post(`${API_BASE}/api/incidents`, {
      title,
      description,
      category,
      severity,
      latitude: lat,
      longitude: lng
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (response.data.success) {
      return response.data.data.id;
    } else {
      console.error(`✗ Failed: ${response.data.error}`);
      return null;
    }
  } catch (error) {
    console.error(`✗ Error: ${error.response?.data?.error || error.message}`);
    return null;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runLoadTestWithToken, createIncidentWithToken };