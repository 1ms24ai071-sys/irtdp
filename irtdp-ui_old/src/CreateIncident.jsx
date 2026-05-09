
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
          'Authorization': `Bearer ${token}`
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
