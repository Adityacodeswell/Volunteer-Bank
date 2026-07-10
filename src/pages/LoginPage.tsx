import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Waves, Mail, Lock, UserCheck, ArrowRight, ShieldCheck, Info } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Button, Input, Modal } from "../components/UI";
import { supabase } from "../supabaseClient";
import { Profile } from "../types";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPasswordState] = useState("");
  const [isVolunteer, setIsVolunteer] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // First login flow state
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tempUser, setTempUser] = useState<Profile | null>(null);

  // Forgot Password state
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isSendingForgot, setIsSendingForgot] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      showToast("Please enter your registered email address", "error");
      return;
    }
    setIsSendingForgot(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      setForgotSuccess(true);
      showToast("Password reset email sent successfully", "success");
    } catch (err: any) {
      showToast(err.message || "Failed to trigger password reset", "error");
    } finally {
      setIsSendingForgot(false);
    }
  };

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
        if (userProfile.must_reset_password === true) {
          // Trigger forced set-password step
          setTempUser(userProfile);
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
    if (newPassword.length < 8) {
      showToast("Password must be at least 8 characters long", "error");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Update Auth password
      const { error: authErr } = await supabase.auth.updateUser({ password: newPassword });
      if (authErr) throw new Error(authErr.message);

      // 2. Clear must_reset_password flag on profiles
      if (tempUser) {
        const { error: profileErr } = await supabase
          .from("profiles")
          .update({ must_reset_password: false })
          .eq("id", tempUser.id);
        if (profileErr) throw new Error(profileErr.message);
      }

      showToast("Password updated. Welcome aboard.", "success");
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
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail("");
                      setForgotSuccess(false);
                      setIsForgotOpen(true);
                    }}
                    className="text-xs text-slate-500 hover:text-cyan transition cursor-pointer font-semibold underline focus:outline-none"
                  >
                    Forgot Password?
                  </button>
                </div>

                <Button type="submit" isLoading={isLoading} className="w-full mt-2">
                  Verify Credentials
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>

              {/* Coordinator contact footer */}
              <div className="mt-8 border-t border-slate-100 pt-6 text-center">
                <p className="text-xs text-slate-500 italic leading-relaxed">
                  Credentials are issued by your regional coordinator. Contact them if you need access.
                </p>
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
                  placeholder="Min. 8 characters"
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

      <Modal
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
        title="Reset Secure Password"
        size="sm"
      >
        {forgotSuccess ? (
          <div className="text-center p-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-full border border-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Waves className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="font-serif font-black text-lg text-deep mb-2">Check Your Inbox</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              A password reset link has been dispatched to <span className="font-bold text-deep">{forgotEmail}</span>. Follow the instructions to create a new secure password.
            </p>
            <Button onClick={() => setIsForgotOpen(false)} className="w-full">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              Enter your registered email address and we'll send you an encrypted link to reset your secure password.
            </p>
            <Input
              label="Registered Email"
              type="email"
              placeholder="name@oceanschool.org"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              required
            />
            <div className="flex gap-2 justify-end mt-4">
              <Button type="button" variant="ghost" onClick={() => setIsForgotOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSendingForgot}>
                Send Reset Link
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
