const fs = require('fs');
const path = require('path');

const UI_DIR = path.join(__dirname, 'irtdp-ui');
const SRC_DIR = path.join(UI_DIR, 'src');

// App.jsx
const appJsx = `
import React, { useState, useEffect } from 'react';
import Login from './Login';
import Dashboard from './Dashboard';
import './index.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');

  useEffect(() => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }, [token]);

  return (
    <div className="app-container">
      {token ? <Dashboard token={token} setToken={setToken} /> : <Login setToken={setToken} />}
    </div>
  );
}

export default App;
`;

// Login.jsx
const loginJsx = `
import React, { useState } from 'react';

function Login({ setToken }) {
  const [email, setEmail] = useState('admin@irtdp.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:8080/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) setToken(data.accessToken);
      else setError(data.error || 'Login failed');
    } catch (err) {
      setError('Cannot connect to gateway');
    }
  };

  return (
    <div className="login-container">
      <h2>IRTDP Secure Login</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={handleLogin}>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" required />
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" required />
        <button type="submit">Access System</button>
      </form>
    </div>
  );
}
export default Login;
`;

// Dashboard.jsx
const dashboardJsx = `
import React, { useState, useEffect } from 'react';
import CreateIncident from './CreateIncident';

function Dashboard({ token, setToken }) {
  const [incidents, setIncidents] = useState([]);
  const [showCreate, setShowCreate] = useState(false);

  const fetchIncidents = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/incidents', {
        headers: { 'Authorization': \`Bearer \${token}\` }
      });
      if (res.status === 401) setToken('');
      const data = await res.json();
      if (data.success) {
        setIncidents(data.data || []);
      }
    } catch(err) { console.error("Fetch err", err); }
  }

  useEffect(() => {
    fetchIncidents();
    const intv = setInterval(fetchIncidents, 5000);
    return () => clearInterval(intv);
  }, []);

  return (
    <div className="dashboard">
      <header>
        <h1>IRTDP Dashboard</h1>
        <div><button className="btn-logout" onClick={() => setToken('')}>Logout</button></div>
      </header>
      
      <main>
        <div className="dash-controls">
           <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
             {showCreate ? "Cancel" : "+ Report Incident"}
           </button>
        </div>

        {showCreate && <CreateIncident token={token} onCreated={() => { setShowCreate(false); fetchIncidents(); }} />}

        <div className="incidents-grid">
          {incidents.map(inc => (
            <div key={inc.id} className="incident-card">
              <span className={\`badge \${inc.status}\`}>{inc.status}</span>
              <h3>{inc.title}</h3>
              <p>{inc.description}</p>
              <div className="meta">
                <span>Category: {inc.category}</span>
                <span>Created: {new Date(inc.created_at).toLocaleString()}</span>
              </div>
            </div>
          ))}
          {incidents.length===0 && <p className="empty">No incidents reported.</p>}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
`;

// CreateIncident.jsx
const createIncidentJsx = `
import React, { useState } from 'react';

function CreateIncident({ token, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', category: 'fire', latitude: 40.7128, longitude: -74.006 });
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:8080/api/incidents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${token}\`
        },
        body: JSON.stringify({
          ...form,
          latitude: parseFloat(form.latitude),
          longitude: parseFloat(form.longitude)
        })
      });
      if (res.ok) onCreated();
      else {
        const d = await res.json();
        setError(JSON.stringify(d.error) || 'Failed to create');
      }
    } catch(err) {
      setError('Connection failed');
    }
  };

  return (
    <div className="create-card">
      <h3>Report New Incident</h3>
      {error && <div className="error">{error}</div>}
      <form onSubmit={submit}>
        <input placeholder="Title" required value={form.title} onChange={e=>setForm({...form, title: e.target.value})} />
        <textarea placeholder="Description" required value={form.description} onChange={e=>setForm({...form, description: e.target.value})} />
        <select value={form.category} onChange={e=>setForm({...form, category: e.target.value})}>
          <option value="fire">Fire</option>
          <option value="medical">Medical</option>
          <option value="police">Police</option>
        </select>
        <div className="row">
          <input type="number" step="0.0001" placeholder="Lat" value={form.latitude} onChange={e=>setForm({...form, latitude: e.target.value})} />
          <input type="number" step="0.0001" placeholder="Lng" value={form.longitude} onChange={e=>setForm({...form, longitude: e.target.value})} />
        </div>
        <button type="submit">Submit Incident</button>
      </form>
    </div>
  );
}
export default CreateIncident;
`;

// index.css
const cssCode = `
:root { --primary: #007bff; --bg: #f4f7f6; --surface: #ffffff; --text: #333; }
body { font-family: 'Inter', sans-serif; margin: 0; background: var(--bg); color: var(--text); }
.app-container { min-height: 100vh; }
.login-container { max-width: 400px; margin: 100px auto; background: var(--surface); padding: 40px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
.login-container h2 { text-align: center; margin-top: 0; }
form { display: flex; flex-direction: column; gap: 15px; }
input, textarea, select { padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 16px; font-family: inherit; }
button { padding: 12px; border: none; background: var(--primary); color: white; border-radius: 6px; font-size: 16px; cursor: pointer; font-weight: bold; }
button:hover { background: #0069d9; }
.error { background: #fee; color: #c00; padding: 10px; border-radius: 6px; margin-bottom: 15px; font-size: 14px; }
.dashboard header { background: #1a237e; color: white; padding: 15px 40px; display: flex; justify-content: space-between; align-items: center; }
.dashboard header h1 { margin: 0; font-size: 20px; }
.btn-logout { background: transparent; border: 1px solid white; padding: 6px 12px; }
.btn-logout:hover { background: rgba(255,255,255,0.1); }
.dash-controls { margin: 30px 40px; }
.incidents-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; padding: 0 40px 40px; }
.incident-card { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); position: relative; }
.incident-card h3 { margin-top: 0; }
.badge { position: absolute; top: 15px; right: 15px; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
.badge.reported { background: #fff3cd; color: #856404; }
.badge.resolved { background: #d4edda; color: #155724; }
.meta { display: flex; justify-content: space-between; font-size: 12px; color: #888; margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px; }
.create-card { background: white; margin: 0 40px 30px; padding: 20px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
.row { display: flex; gap: 15px; }
.row input { flex: 1; }
`;

fs.writeFileSync(path.join(SRC_DIR, 'App.jsx'), appJsx);
fs.writeFileSync(path.join(SRC_DIR, 'Login.jsx'), loginJsx);
fs.writeFileSync(path.join(SRC_DIR, 'Dashboard.jsx'), dashboardJsx);
fs.writeFileSync(path.join(SRC_DIR, 'CreateIncident.jsx'), createIncidentJsx);
fs.writeFileSync(path.join(SRC_DIR, 'index.css'), cssCode);

// Also patch vite config so we run dev on port 5173
let viteConfig = fs.readFileSync(path.join(UI_DIR, 'vite.config.js'), 'utf8');
viteConfig = viteConfig.replace('export default defineConfig({', 'export default defineConfig({\n  server: { port: 5173 },\n');
fs.writeFileSync(path.join(UI_DIR, 'vite.config.js'), viteConfig);

console.log("React Code Generated successfully!");
