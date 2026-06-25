import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [classes, setClasses] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.stats().then(setStats);
    api.getClasses().then(setClasses);
  }, []);

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Dashboard</div>
        <div className="topbar-actions">
          <button className="btn btn-pri btn-sm" onClick={() => navigate('/admin/classes')}>
            + New Class
          </button>
        </div>
      </div>

      <div className="page-content">
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-num">{stats?.trainees ?? '—'}</div>
            <div className="stat-label">Total Trainees</div>
          </div>
          <div className="stat-card ok">
            <div className="stat-num">{stats?.classes ?? '—'}</div>
            <div className="stat-label">Active Classes</div>
          </div>
          <div className="stat-card acc">
            <div className="stat-num">{stats?.completions ?? '—'}</div>
            <div className="stat-label">Class Completions</div>
          </div>
        </div>

        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--pri)' }}>Recent Classes</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/classes')}>View All</button>
        </div>

        {classes.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🎓</div>
            <div className="empty-text">No classes yet</div>
            <div className="empty-sub">Create your first class to get started</div>
            <button className="btn btn-pri" style={{ marginTop: 16 }} onClick={() => navigate('/admin/classes')}>
              Create Class
            </button>
          </div>
        ) : (
          <div className="class-grid">
            {classes.slice(0, 6).map(cls => (
              <div key={cls.id} className="class-card" onClick={() => navigate(`/admin/classes/${cls.id}`)}>
                <div className="class-card-name">{cls.name}</div>
                <div className="class-card-desc">{cls.description || 'No description'}</div>
                <div className="class-card-meta">
                  <span>📦 {cls.moduleCount} module{cls.moduleCount !== 1 ? 's' : ''}</span>
                  <span>👥 {cls.traineeCount} trainee{cls.traineeCount !== 1 ? 's' : ''}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
