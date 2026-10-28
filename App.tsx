import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ActiveEvaluationProvider } from './context/ActiveEvaluationContext';
import { AppLayout } from './layouts/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ResumesPage } from './pages/ResumesPage';
import { SkillsPage } from './pages/SkillsPage';
import { EvidencePage } from './pages/EvidencePage';
import { JobsPage } from './pages/JobsPage';
import { ReadinessPage } from './pages/ReadinessPage';
import { GapsPage } from './pages/GapsPage';
import { RoadmapPage } from './pages/RoadmapPage';
import { SimulatorPage } from './pages/SimulatorPage';
import { GraphPage } from './pages/GraphPage';
import { ProgressPage } from './pages/ProgressPage';
import { HistoryPage } from './pages/HistoryPage';
import { AdminPage } from './pages/AdminPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { ProfilePage } from './pages/ProfilePage';

const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-bg flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-emerald border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ActiveEvaluationProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin-login" element={<AdminLoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Authenticated Application routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/resumes" element={<ResumesPage />} />
              <Route path="/skills" element={<SkillsPage />} />
              <Route path="/evidence" element={<EvidencePage />} />
              <Route path="/jobs" element={<JobsPage />} />
              <Route path="/readiness" element={<ReadinessPage />} />
              <Route path="/gaps" element={<GapsPage />} />
              <Route path="/roadmap" element={<RoadmapPage />} />
              <Route path="/simulator" element={<SimulatorPage />} />
              <Route path="/graph" element={<GraphPage />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ActiveEvaluationProvider>
    </AuthProvider>
  );
};

export default App;
