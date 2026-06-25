import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function TraineeLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-text">TGS BPO</div>
          <div className="sidebar-logo-sub">Training Platform</div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section">My Training</div>
          <NavLink to="/my" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="icon">🏠</span> My Classes
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <div>
              <div className="sidebar-user-name">{user?.name}</div>
              <div className="sidebar-user-role">Trainee</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 8, color: 'rgba(255,255,255,.6)', borderColor: 'rgba(255,255,255,.15)' }} onClick={() => { logout(); navigate('/login'); }}>
            Sign Out
          </button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
