import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Waves, Key, Mail, Lock, UserCheck, ArrowRight, ShieldCheck, Info } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Button, Input } from "../components/UI";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, setPassword, apiFetch } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPasswordState] = useState("");
  const [isVolunteer, setIsVolunteer] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // First login flow state
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tempUserToken, setTempUserToken] = useState<any>(null);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast("Please enter both email and password", "error");
      return;
    }

    setIsLoading(true);
    try {
      const userProfile = await login(email, password);
      
      // Determine if volunteer first login
      if (userProfile.role === "volunteer") {
        // Fetch volunteer detail to check pending status
        const token = localStorage.getItem("osi_auth_token");
        const headers = { Authorization: `Bearer ${token}` };
        const volRes = await fetch(`/api/volunteers/${userProfile.id}`, { headers });
        const volData = await volRes.json();
        
        if (volData.status === "pending") {
          // Trigger forced set-password step
          setTempUserToken(userProfile);
          setShowPasswordReset(true);
          showToast("First-time login detected! Please establish your new secure password.", "info");
          setIsLoading(false);
          return;
        }
        
        showToast("Logged in successfully! Welcome to your Depth Gauge.", "success");
        navigate("/volunteer");
      } else if (userProfile.role === "staff") {
        showToast("Welcome back, Coordinator. Fetching your volunteer rosters.", "success");
        navigate("/staff");
      } else if (userProfile.role === "admin") {
        showToast("System Admin validated. Opening Master Activity Log.", "success");
        navigate("/admin");
      }
    } catch (err: any) {
      showToast(err.message || "Invalid credentials. Please verify your details.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      showToast("Please fill in both password fields", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }
    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters long", "error");
      return;
    }

    setIsLoading(true);
    try {
      // Call password reset endpoint (using Auth context apiFetch)
      await setPassword(newPassword);
      
      // Update volunteer status to active
      const token = localStorage.getItem("osi_auth_token");
      await fetch(`/api/volunteers/${tempUserToken.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ status: "active" })
      });

      showToast("Security credentials verified! Redirecting to depth portal.", "success");
      navigate("/volunteer");
    } catch (err: any) {
      showToast(err.message || "Failed to update security credentials", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 font-sans">
      {/* Narrative Panel */}
      <div className="md:w-1/2 bg-deep text-white p-12 flex flex-col justify-between relative overflow-hidden">
        {/* Background bubbles */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-20 left-10 w-40 h-40 rounded-full border border-white" />
          <div className="absolute top-80 right-20 w-64 h-64 rounded-full border border-white" />
          <div className="absolute bottom-10 left-30 w-16 h-16 rounded-full border border-white" />
        </div>

        <div className="flex items-center gap-2.5 relative z-10">
          <Waves className="w-8 h-8 text-cyan animate-pulse" />
          <div>
            <span className="font-serif font-black text-lg tracking-tight block leading-none">OCEAN SCHOOL INDIA</span>
            <span className="text-[10px] font-semibold text-aqua uppercase tracking-widest block leading-none mt-0.5">Volunteer Bank</span>
          </div>
        </div>

        <div className="my-12 relative z-10">
          <h2 className="font-serif font-black text-3xl sm:text-4xl leading-tight">
            Scientific Marine <br />
            Restoration Starts Here
          </h2>
          <p className="text-slate-300 text-sm mt-4 max-w-md leading-relaxed">
            Coordinators and active field volunteers leverage this platform to log site activities, map mangrove saplings, verify dive safety profiles, and coordinate creek cleanups in real-time.
          </p>

          <div className="mt-8 flex flex-col gap-4 text-xs text-aqua/90">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Full compliance with Certificate of Social Work standards.</span>
            </div>
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 shrink-0" />
              <span>Durable data integrity and coordinator assignment mapping.</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-400 relative z-10">
          &copy; 2026 Ocean School India. Serving Mumbai & Lakshadweep.
        </div>
      </div>

      {/* Auth Panel */}
      <div className="md:w-1/2 bg-white flex items-center justify-center p-8 sm:p-12 lg:p-20">
        <div className="max-w-md w-full">
          {!showPasswordReset ? (
            <>
              {/* Form Header */}
              <div className="mb-8">
                <h1 className="font-serif font-black text-3xl text-deep tracking-tight">Access Console</h1>
                <p className="text-slate-400 text-sm mt-1">Please log in to manage or review coastal activities.</p>
              </div>

              {/* Roles Toggle */}
              <div className="grid grid-cols-2 bg-slate-100 p-1.5 rounded-xl mb-6">
                <button
                  type="button"
                  onClick={() => setIsVolunteer(true)}
                  className={`py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition cursor-pointer ${
                    isVolunteer ? "bg-white text-deep shadow-sm" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  I'm a Volunteer
                </button>
                <button
                  type="button"
                  onClick={() => setIsVolunteer(false)}
                  className={`py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition cursor-pointer ${
                    !isVolunteer ? "bg-white text-deep shadow-sm" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  I'm Staff / Admin
                </button>
              </div>

              {/* Credentials reminder */}
              {isVolunteer && (
                <div className="mb-6 p-4 rounded-lg bg-sky-50 border border-sky-100 flex gap-3 text-xs text-sky-800 leading-relaxed">
                  <Info className="w-4 h-4 text-cyan shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Volunteer Intake Reminder:</span> Self-registration is disabled. Your email and secure password must be issued by your regional coordinator.
                  </div>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
                <Input
                  label="Registered Email Address"
                  type="email"
                  placeholder="name@oceanschool.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <Input
                  label="Secure Password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPasswordState(e.target.value)}
                  required
                />

                <div className="text-right">
                  <span className="text-xs text-slate-400 hover:text-cyan transition cursor-help">
                    Forgot password? Contact coordinator.
                  </span>
                </div>

                <Button type="submit" isLoading={isLoading} className="w-full mt-2">
                  Verify Credentials
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>

              {/* Demo Helper box */}
              <div className="mt-8 border-t border-slate-100 pt-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Sandbox Test Credentials:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono bg-slate-50 p-3 rounded-lg text-slate-600">
                  <div>
                    <span className="font-bold text-deep">Admin:</span><br />
                    email: <span className="select-all">admin@oceanschool.org</span><br />
                    pass: <span className="select-all">admin123</span>
                  </div>
                  <div>
                    <span className="font-bold text-deep">Staff (Neha):</span><br />
                    email: <span className="select-all">neha@oceanschool.org</span><br />
                    pass: <span className="select-all">staff123</span>
                  </div>
                  <div className="sm:col-span-2 border-t border-slate-200/50 pt-2 mt-1">
                    <span className="font-bold text-deep">Volunteer (Sneha - Active):</span><br />
                    email: <span className="select-all">sneha.patel@gmail.com</span> / pass: <span className="select-all">vol123</span>
                  </div>
                  <div className="sm:col-span-2 border-t border-slate-200/50 pt-1">
                    <span className="font-bold text-deep">Volunteer (Kabir - Pending / Temp Pass):</span><br />
                    email: <span className="select-all">kabir.m@yahoo.com</span> / pass: <span className="select-all">vol123</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Forced Password Reset Step */}
              <div className="mb-6">
                <Waves className="w-12 h-12 text-cyan mx-auto mb-4 animate-bounce" />
                <h1 className="font-serif font-black text-2xl text-deep text-center tracking-tight">Establish Secure Password</h1>
                <p className="text-slate-500 text-xs text-center mt-2 leading-relaxed max-w-sm mx-auto">
                  To protect our marine research data and volunteer registry, you are required to change your coordinator-issued temporary password on your very first login.
                </p>
              </div>

              <form onSubmit={handlePasswordResetSubmit} className="flex flex-col gap-4">
                <Input
                  label="Create New Password"
                  type="password"
                  placeholder="Min. 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />

                <Input
                  label="Confirm New Password"
                  type="password"
                  placeholder="Re-type password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />

                <Button type="submit" isLoading={isLoading} className="w-full mt-4">
                  Set Password & Enter Portal
                  <ShieldCheck className="w-4 h-4" />
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
