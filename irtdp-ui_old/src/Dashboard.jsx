
import React, { useState, useEffect } from 'react';
import CreateIncident from './CreateIncident';

function Dashboard({ token, setToken }) {
  const [incidents, setIncidents] = useState([]);
  const [showCreate, setShowCreate] = useState(false);

  const fetchIncidents = async () => {
    try {
      const res = await fetch('http://localhost:8080/api/incidents', {
        headers: { 'Authorization': `Bearer ${token}` }
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
              <span className={`badge ${inc.status}`}>{inc.status}</span>
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
