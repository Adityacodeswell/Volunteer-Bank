import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Waves, ShieldAlert, ArrowRight, UserCheck, ShieldCheck } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useToast } from "../context/ToastContext";
import { Button, Input } from "../components/UI";

export default function Bootstrap() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [checking, setChecking] = useState(true);
  const [adminExists, setAdminExists] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Inline validation errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    async function checkAdmin() {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "admin")
          .limit(1);

        if (error) {
          console.error("Error checking admin status:", error);
        } else if (data && data.length > 0) {
          setAdminExists(true);
        }
      } catch (err) {
        console.error("Failed to verify admin state", err);
      } finally {
        setChecking(false);
      }
    }
    checkAdmin();
  }, []);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Invalid email format";
    }
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBootstrapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast("Please correct the form errors", "error");
      return;
    }

    setLoading(true);

    try {
      // 1. Sign up user via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) {
        throw new Error(authError.message);
      }

      if (!authData?.user) {
        throw new Error("Unable to create user authentication.");
      }

      // 2. Insert into profiles table
      const { error: profileError } = await supabase.from("profiles").insert({
        id: authData.user.id,
        role: "admin",
        full_name: fullName,
        email,
        phone: "",
        must_reset_password: false,
        created_at: new Date().toISOString(),
      });

      if (profileError) {
        throw new Error(profileError.message);
      }

      showToast("Admin account created successfully! Please sign in.", "success");
      navigate("/login");
    } catch (err: any) {
      showToast(err.message || "An error occurred during bootstrap.", "error");
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Waves className="w-10 h-10 text-cyan animate-spin mx-auto mb-4" />
          <p className="font-serif font-bold text-deep text-lg">Inspecting System Registry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 font-sans">
      {/* Narrative Panel */}
      <div className="md:w-1/2 bg-deep text-white p-12 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-20 left-10 w-40 h-40 rounded-full border border-white" />
          <div className="absolute top-80 right-20 w-64 h-64 rounded-full border border-white" />
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
            System Initialization <br />
            & Bootstrapping
          </h2>
          <p className="text-slate-300 text-sm mt-4 max-w-md leading-relaxed">
            Configure the baseline Administrator account. Once configured, this route will automatically lock to prevent unauthorized privilege escalation.
          </p>
        </div>

        <div className="text-xs text-slate-400 relative z-10">
          &copy; 2026 Ocean School India. Secure Shell Environment.
        </div>
      </div>

      {/* Auth Panel */}
      <div className="md:w-1/2 bg-white flex items-center justify-center p-8 sm:p-12 lg:p-20">
        <div className="max-w-md w-full">
          {adminExists ? (
            <div className="text-center p-6 bg-slate-50 border border-slate-100 rounded-2xl shadow-sm">
              <ShieldAlert className="w-16 h-16 text-coral mx-auto mb-4" />
              <h1 className="font-serif font-black text-2xl text-deep tracking-tight mb-2">Access Locked</h1>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                An administrator account has already been configured on this system. The bootstrap route is now locked to protect registry integrity.
              </p>
              <Link to="/login">
                <Button className="w-full">
                  Return to Login
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="font-serif font-black text-3xl text-deep tracking-tight">First-Time Setup</h1>
                <p className="text-slate-400 text-sm mt-1">Deploy the initial Administrator identity to initialize database tables.</p>
              </div>

              <form onSubmit={handleBootstrapSubmit} className="flex flex-col gap-4">
                <Input
                  label="Administrator Full Name"
                  placeholder="e.g. Admiral Kulkarni"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  error={errors.fullName}
                  required
                />

                <Input
                  label="Primary Contact Email"
                  type="email"
                  placeholder="admin@oceanschool.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={errors.email}
                  required
                />

                <Input
                  label="Master Account Password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
                  required
                />

                <Input
                  label="Confirm Password"
                  type="password"
                  placeholder="Re-type password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={errors.confirmPassword}
                  required
                />

                <Button type="submit" isLoading={loading} className="w-full mt-4">
                  Configure Admin Profile
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
