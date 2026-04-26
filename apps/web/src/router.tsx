import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import AdminLayout from './components/layout/AdminLayout';
import UsersPage from './pages/admin/UsersPage';
import DepartmentsPage from './pages/admin/DepartmentsPage';
import LabelsPage from './pages/admin/LabelsPage';
import QuickRepliesPage from './pages/admin/QuickRepliesPage';
import WhatsAppSettingsPage from './pages/admin/WhatsAppSettingsPage';

function RequireAuth({ children }: { children: JSX.Element }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }: { children: JSX.Element }) {
  const user = useAuthStore((s) => s.user);
  if (!user || user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <ChatPage />
      </RequireAuth>
    ),
  },
  {
    path: '/admin',
    element: (
      <RequireAuth>
        <RequireAdmin>
          <AdminLayout />
        </RequireAdmin>
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/users" replace /> },
      { path: 'users', element: <UsersPage /> },
      { path: 'departments', element: <DepartmentsPage /> },
      { path: 'labels', element: <LabelsPage /> },
      { path: 'quick-replies', element: <QuickRepliesPage /> },
      { path: 'whatsapp', element: <WhatsAppSettingsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
