import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { Waves } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { Button } from "./components/UI";

// Pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import VolunteerPortal from "./pages/VolunteerPortal";
import StaffDashboard from "./pages/StaffDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Bootstrap from "./pages/Bootstrap";
import JoinPage from "./pages/JoinPage";

// Protected Route Guard
function ProtectedRoute({ children, role }: { children: React.ReactNode; role: "admin" | "staff" | "volunteer" }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Waves className="w-10 h-10 text-cyan animate-spin mx-auto mb-4" />
          <p className="font-serif font-bold text-deep text-lg">Synchronizing Credentials...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== role) {
    // Role divergence: redirect to authorized desk
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    if (user.role === "staff") return <Navigate to="/staff" replace />;
    return <Navigate to="/volunteer" replace />;
  }

  return <>{children}</>;
}

// Public-Only Route Guard
function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user) {
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    if (user.role === "staff") return <Navigate to="/staff" replace />;
    return <Navigate to="/volunteer" replace />;
  }

  return <>{children}</>;
}

// 404 Lost at Sea fallback
function LostAtSea() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-center p-6 font-sans">
      <div className="max-w-md">
        <Waves className="w-16 h-16 text-cyan animate-bounce mx-auto mb-6" />
        <h1 className="font-serif font-black text-3xl text-deep mb-3 tracking-tight">LOST AT SEA</h1>
        <p className="text-slate-400 font-mono text-[10px] tracking-widest uppercase mb-4">Coordinate Error 404</p>
        <p className="text-sm text-slate-500 mb-8 leading-relaxed">
          The baseline sector or coordinate parameter you requested is outside of our active marine protection logbooks. Please return to harbor safely.
        </p>
        <Button onClick={() => navigate("/")} className="px-6 py-2.5">
          Return to Harbor
        </Button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route 
              path="/" 
              element={
                <PublicOnlyRoute>
                  <LandingPage />
                </PublicOnlyRoute>
              } 
            />
            <Route path="/join" element={<JoinPage />} />
            <Route 
              path="/login" 
              element={
                <PublicOnlyRoute>
                  <LoginPage />
                </PublicOnlyRoute>
              } 
            />
            <Route 
              path="/bootstrap" 
              element={
                <PublicOnlyRoute>
                  <Bootstrap />
                </PublicOnlyRoute>
              } 
            />

            {/* Protected Role Dashboards */}
            <Route 
              path="/volunteer" 
              element={
                <ProtectedRoute role="volunteer">
                  <VolunteerPortal />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/staff" 
              element={
                <ProtectedRoute role="staff">
                  <StaffDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute role="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />

            {/* Fallback 404 */}
            <Route path="*" element={<LostAtSea />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
