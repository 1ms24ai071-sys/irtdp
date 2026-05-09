
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
