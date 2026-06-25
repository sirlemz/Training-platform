import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import Login from './pages/Login';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminClasses from './pages/admin/AdminClasses';
import AdminClassDetail from './pages/admin/AdminClassDetail';
import AdminTrainees from './pages/admin/AdminTrainees';
import TraineeLayout from './pages/trainee/TraineeLayout';
import TraineeDashboard from './pages/trainee/TraineeDashboard';
import TraineeClass from './pages/trainee/TraineeClass';
import Certificate from './pages/trainee/Certificate';

function RequireAuth({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#64748b' }}>Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'admin' ? '/admin' : '/my'} replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Admin routes */}
          <Route path="/admin" element={<RequireAuth role="admin"><AdminLayout /></RequireAuth>}>
            <Route index element={<AdminDashboard />} />
            <Route path="classes" element={<AdminClasses />} />
            <Route path="classes/:id" element={<AdminClassDetail />} />
            <Route path="trainees" element={<AdminTrainees />} />
          </Route>

          {/* Trainee routes */}
          <Route path="/my" element={<RequireAuth role="trainee"><TraineeLayout /></RequireAuth>}>
            <Route index element={<TraineeDashboard />} />
            <Route path="classes/:id" element={<TraineeClass />} />
            <Route path="classes/:id/certificate" element={<Certificate />} />
          </Route>

          <Route path="*" element={<RootRedirect />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/my'} replace />;
}
