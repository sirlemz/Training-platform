import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api';

export default function TraineeDashboard() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.myClasses().then(data => { setClasses(data); setLoading(false); });
  }, []);

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Welcome, {user?.name?.split(' ')[0]} 👋</div>
      </div>

      <div className="page-content">
        <p style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
          Complete your assigned training modules in sequence. Videos can be re-watched; assessments allow one attempt.
        </p>

        {loading ? (
          <p style={{ color: 'var(--muted)' }}>Loading your classes…</p>
        ) : classes.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📚</div>
            <div className="empty-text">No classes assigned yet</div>
            <div className="empty-sub">Your administrator will assign you to a training class soon.</div>
          </div>
        ) : (
          <div className="class-grid">
            {classes.map(cls => {
              const pct = cls.totalModules > 0 ? Math.round((cls.completedModules / cls.totalModules) * 100) : 0;
              const done = cls.totalModules > 0 && cls.completedModules === cls.totalModules;
              return (
                <div key={cls.id} className="class-card" onClick={() => navigate(`/my/classes/${cls.id}`)}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div className="class-card-name" style={{ marginBottom: 0 }}>{cls.name}</div>
                    {done && <span className="badge b-ok">✓ Complete</span>}
                  </div>
                  <div className="class-card-desc">{cls.description || 'No description'}</div>
                  <div className="class-card-meta">
                    <span>📦 {cls.totalModules} module{cls.totalModules !== 1 ? 's' : ''}</span>
                    <span>{cls.completedModules} completed</span>
                  </div>
                  <div>
                    <div className="pbar">
                      <div className={`pfill${pct === 100 ? ' ok' : ''}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{pct}% complete</div>
                  </div>
                  {done && (
                    <button className="btn btn-ok btn-sm" style={{ marginTop: 10, width: '100%' }} onClick={e => { e.stopPropagation(); navigate(`/my/classes/${cls.id}/certificate`); }}>
                      🏆 View Certificate
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
