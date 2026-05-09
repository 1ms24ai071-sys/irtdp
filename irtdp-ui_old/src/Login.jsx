
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
