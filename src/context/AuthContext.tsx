import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Profile } from "../types";

interface AuthContextType {
  user: Profile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<Profile>;
  logout: () => void;
  setPassword: (password: string) => Promise<boolean>;
  apiFetch: (url: string, options?: RequestInit) => Promise<any>;
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
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize from LocalStorage
  useEffect(() => {
    const storedToken = localStorage.getItem("osi_auth_token");
    const storedUser = localStorage.getItem("osi_auth_user");
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<Profile> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Login failed");
    }

    localStorage.setItem("osi_auth_token", data.token);
    localStorage.setItem("osi_auth_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("osi_auth_token");
    localStorage.removeItem("osi_auth_user");
    setToken(null);
    setUser(null);
  }, []);

  const apiFetch = useCallback(async (url: string, options: RequestInit = {}): Promise<any> => {
    const activeToken = token || localStorage.getItem("osi_auth_token");
    const headers = {
      ...(options.headers || {}),
      "Content-Type": "application/json",
      ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {})
    };

    const res = await fetch(url, { ...options, headers });
    const data = await res.json();

    if (!res.ok) {
      if (res.status === 401) {
        logout();
      }
      throw new Error(data.error || "API call failed");
    }
    return data;
  }, [token, logout]);

  const setPassword = useCallback(async (password: string): Promise<boolean> => {
    await apiFetch("/api/auth/set-password", {
      method: "POST",
      body: JSON.stringify({ password })
    });
    return true;
  }, [apiFetch]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, setPassword, apiFetch }}>
      {children}
    </AuthContext.Provider>
  );
};
