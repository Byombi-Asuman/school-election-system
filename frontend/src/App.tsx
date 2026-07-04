import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { ProtectedRoute } from './components/layout/ProtectedRoute';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Admin pages
import AdminDashboardPage from './pages/admin/DashboardPage';
import ElectionsPage from './pages/admin/ElectionsPage';
import ElectionDetailPage from './pages/admin/ElectionDetailPage';
import CandidatesPage from './pages/admin/CandidatesPage';
import StudentsPage from './pages/admin/StudentsPage';
import OtpPage from './pages/admin/OtpPage';
import ResultsPage from './pages/admin/ResultsPage';
import ReportsPage from './pages/admin/ReportsPage';
import AnnouncementsPage from './pages/admin/AnnouncementsPage';
import AuditLogsPage from './pages/admin/AuditLogsPage';
import SettingsPage from './pages/admin/SettingsPage';

// Student pages
import StudentDashboardPage from './pages/student/DashboardPage';
import VotingPage from './pages/student/VotingPage';
import StudentResultsPage from './pages/student/ResultsPage';
import StudentCandidacyPage from './pages/student/CandidacyPage';
import StudentProfilePage from './pages/student/ProfilePage';

const HomeRedirect: React.FC = () => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'STUDENT' ? '/student/dashboard' : '/admin/dashboard'} replace />;
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { fontSize: '14px', borderRadius: '10px' },
          success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Admin & Election Admin routes */}
        <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ELECTION_ADMIN']}><AdminDashboardPage /></ProtectedRoute>} />
        <Route path="/admin/elections" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ELECTION_ADMIN']}><ElectionsPage /></ProtectedRoute>} />
        <Route path="/admin/elections/:id" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ELECTION_ADMIN']}><ElectionDetailPage /></ProtectedRoute>} />
        <Route path="/admin/candidates" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ELECTION_ADMIN']}><CandidatesPage /></ProtectedRoute>} />
        <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ELECTION_ADMIN']}><StudentsPage /></ProtectedRoute>} />
        <Route path="/admin/otp" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ELECTION_ADMIN']}><OtpPage /></ProtectedRoute>} />
        <Route path="/admin/results" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ELECTION_ADMIN']}><ResultsPage /></ProtectedRoute>} />
        <Route path="/admin/results/:id" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ELECTION_ADMIN']}><ResultsPage /></ProtectedRoute>} />
        <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ELECTION_ADMIN']}><ReportsPage /></ProtectedRoute>} />
        <Route path="/admin/announcements" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN', 'ELECTION_ADMIN']}><AnnouncementsPage /></ProtectedRoute>} />
        <Route path="/admin/audit-logs" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><AuditLogsPage /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']}><SettingsPage /></ProtectedRoute>} />

        {/* Student routes */}
        <Route path="/student/dashboard" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboardPage /></ProtectedRoute>} />
        <Route path="/student/vote" element={<ProtectedRoute allowedRoles={['STUDENT']}><VotingPage /></ProtectedRoute>} />
        <Route path="/student/results" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentResultsPage /></ProtectedRoute>} />
        <Route path="/student/candidacy" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentCandidacyPage /></ProtectedRoute>} />
        <Route path="/student/profile" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentProfilePage /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
