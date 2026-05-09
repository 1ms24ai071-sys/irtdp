import { Pool } from 'pg';

const pool = new Pool({ connectionString: 'postgresql://irtdp:irtdp_secret@localhost:5432/irtdp' });

try {
  const result = await pool.query('SELECT COUNT(*) as count FROM audit_logs');
  console.log('Total audit logs:', result.rows[0].count);
  
  const recent = await pool.query(`
    SELECT action, entity_type, user_id, ip_address, user_agent, created_at 
    FROM audit_logs 
    ORDER BY created_at DESC 
    LIMIT 10
  `);
  
  console.log('\nRecent audit logs:');
  recent.rows.forEach(row => {
    console.log('-', row.action, '/', row.entity_type);
    console.log('  User:', row.user_id?.slice(0, 8) + '...', 'IP:', row.ip_address);
    console.log('  Agent:', row.user_agent, 'Time:', new Date(row.created_at).toISOString());
  });
  
  await pool.end();
  console.log('\n✅ Database check completed');
} catch (e) {
  console.error('❌ Database error:', e.message);
}
