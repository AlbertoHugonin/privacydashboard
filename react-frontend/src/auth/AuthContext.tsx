import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiJson } from "../api/client";
import type { Me } from "../types/api";

type AuthContextValue = {
  user: Me | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<Me | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchMe(): Promise<Me> {
  return apiJson<Me>("/api/user/me");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const me = await fetchMe();
      setUser(me);
      return me;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const login = async (username: string, password: string) => {
    const form = new URLSearchParams();
    form.set("username", username);
    form.set("password", password);

    try {
      await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form,
        credentials: "include",
        redirect: "manual",
      });
    } catch {
      throw new Error(
        "Cannot reach backend. Ensure Spring Boot is running (default: http://localhost:11002) and restart `npm run dev` if you changed the backend port.",
      );
    }

    const me = await refresh();
    if (!me) {
      throw new Error("Login failed");
    }
  };

  const logout = async () => {
    try {
      await fetch("/logout", {
        method: "POST",
        credentials: "include",
        redirect: "manual",
      });
    } finally {
      setUser(null);
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, logout, refresh }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return value;
}
