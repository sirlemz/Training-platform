import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.role === 'admin' ? '/admin' : '/my', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-text">TGS BPO</div>
          <div style={{ fontSize: 11, opacity: .4, marginBottom: 2 }}>INCORPORATED</div>
          <div className="login-logo-sub">Training Platform</div>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="fg">
              <label className="lbl">Email Address</label>
              <input className="inp" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required autoFocus />
            </div>
            <div className="fg" style={{ marginBottom: 20 }}>
              <label className="lbl">Password</label>
              <input className="inp" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            {error && (
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#dc2626' }}>
                {error}
              </div>
            )}
            <button className="btn btn-acc btn-lg" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.4)', fontSize: 12, marginTop: 16 }}>
          Contact your administrator for access credentials.
        </p>
      </div>
    </div>
  );
}
