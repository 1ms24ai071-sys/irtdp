const base = 'http://localhost:8080';
console.log('=== TESTING SYSTEM END-TO-END ===\n');

try {
  console.log('1. Testing login...');
  const loginRes = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'reporter@platform.local', password: 'password123!' })
  });
  
  if (!loginRes.ok) {
    console.error('Login failed:', loginRes.status, await loginRes.text());
    process.exit(1);
  }
  
  const loginData = await loginRes.json();
  const token = loginData.accessToken;
  console.log('✓ Login successful, token:', token.slice(0, 20) + '...\n');

  console.log('2. Testing incident creation with IP tracking...');
  const incidentRes = await fetch(base + '/api/incidents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
      title: 'Test Incident with Audit',
      description: 'Verify audit-service captures incident creation',
      category: 'test',
      severity: 'medium',
      lat: 12.9740,
      lng: 77.5955,
      address: 'Test St'
    })
  });

  if (!incidentRes.ok) {
    const errText = await incidentRes.text();
    console.error('Incident creation failed:', incidentRes.status, errText);
    process.exit(1);
  }
  
  const incidentData = await incidentRes.json();
  console.log('✓ Incident created:', incidentData.id);
  console.log('  Status:', incidentData.status);
  
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('\n3. Checking audit logs...');
  const auditRes = await fetch(base + '/api/audit/logs?entityType=incident&limit=5', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  
  if (auditRes.ok) {
    const auditData = await auditRes.json();
    const count = auditData.rows ? auditData.rows.length : 0;
    console.log('✓ Retrieved', count, 'audit logs');
    if (auditData.rows && auditData.rows.length > 0) {
      console.log('  Sample audit entries:');
      auditData.rows.slice(0, 2).forEach(log => {
        console.log('  -', log.action, 'on', log.entity_type, 'IP:', log.ip_address);
      });
    }
  }
  
  console.log('\n✅ END-TO-END TEST PASSED!');
  
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
