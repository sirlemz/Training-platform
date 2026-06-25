import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api';

export default function Certificate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cert, setCert] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getCertificate(id)
      .then(setCert)
      .catch(e => setError(e.message));
  }, [id]);

  if (error) return (
    <div className="cert-page">
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, textAlign: 'center', maxWidth: 400 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontWeight: 700, color: 'var(--pri)', marginBottom: 8 }}>Certificate Not Available</div>
        <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 20 }}>{error}</div>
        <button className="btn btn-pri" onClick={() => navigate(`/my/classes/${id}`)}>Back to Class</button>
      </div>
    </div>
  );

  if (!cert) return <div className="cert-page"><div style={{ color: '#fff' }}>Loading…</div></div>;

  const completedDate = cert.completedAt
    ? new Date(cert.completedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="cert-page">
      <div>
        <div className="cert-card">
          <div className="cert-seal">🏆</div>
          <div className="cert-title">Certificate of Completion</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>This is to certify that</div>
          <div className="cert-name">{cert.traineeName}</div>
          <div className="cert-text">has successfully completed all modules in</div>
          <div className="cert-class">{cert.className}</div>
          <div className="cert-badge">✓ All Modules Completed</div>
          <div style={{ width: 180, height: 1, background: 'var(--bdr)', margin: '0 auto 20px' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div style={{ width: 120, height: 2, background: 'var(--pri)', marginBottom: 4 }} />
              <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>TGS BPO Inc.</div>
            </div>
            <div className="cert-date">Completed: {completedDate}</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className="btn btn-ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }} onClick={() => navigate('/my')}>
            ← Back to My Classes
          </button>
          <button className="btn btn-acc" onClick={() => window.print()}>
            🖨️ Print Certificate
          </button>
        </div>
      </div>
    </div>
  );
}
