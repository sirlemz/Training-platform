import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-text">TGS BPO</div>
          <div className="sidebar-logo-sub">Training Platform · Admin</div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section">Navigation</div>
          <NavLink to="/admin" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="icon">📊</span> Dashboard
          </NavLink>
          <NavLink to="/admin/classes" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="icon">🎓</span> Classes
          </NavLink>
          <NavLink to="/admin/trainees" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="icon">👥</span> Trainees
          </NavLink>
          <NavLink to="/admin/assessments" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            <span className="icon">📋</span> Assessments
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <div>
              <div className="sidebar-user-name">{user?.name}</div>
              <div className="sidebar-user-role">Administrator</div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 8, color: 'rgba(255,255,255,.6)', borderColor: 'rgba(255,255,255,.15)' }} onClick={handleLogout}>
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
