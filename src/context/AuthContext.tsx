import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Profile } from "../types";
import { supabase } from "../supabaseClient";

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<Profile>;
  logout: () => Promise<void>;
  setPassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize from session and listen for changes
  useEffect(() => {
    let active = true;

    async function initSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();
          if (active) setUser(profile);
        } else {
          if (active) setUser(null);
        }
      } catch (err) {
        console.error("Error fetching session:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        if (active) setUser(profile);
      } else {
        if (active) setUser(null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<Profile> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("No user returned");

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();

    if (profileErr || !profile) {
      throw new Error("Account profile not found. Contact your coordinator.");
    }
    setUser(profile);
    return profile;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const setPassword = useCallback(async (password: string): Promise<void> => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw new Error(error.message);
    if (!user) return;
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ must_reset_password: false })
      .eq("id", user.id);
    if (updateErr) throw new Error(updateErr.message);

    setUser((prev) => (prev ? { ...prev, must_reset_password: false } : null));
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setPassword }}>
      {children}
    </AuthContext.Provider>
  );
};
