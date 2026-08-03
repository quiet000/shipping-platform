"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { getMockAdmin } from "@/lib/data/api";
import type { Profile, UserRole } from "@/lib/types";

interface AuthContextValue {
  user: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<Profile>;
  logout: () => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
  can: (permission: string) => boolean;
  setUser: (user: Profile | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PERMISSIONS: Record<UserRole, string[]> = {
  admin: ["*"],
  supervisor: [
    "shipments.view",
    "shipments.create",
    "shipments.update",
    "shipments.bulk",
    "analytics.view",
    "notifications.view",
  ],
  branch_manager: [
    "shipments.view",
    "shipments.create",
    "shipments.update",
    "shipments.update.status",
    "shipments.bulk",
    "analytics.view",
    "notifications.view",
  ],
  driver: ["shipments.view", "shipments.update.status"],
  accountant: ["shipments.view", "analytics.view", "notifications.view"],
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!hasSupabaseEnv) {
      setUser(null);
      setLoading(false);
      return;
    }
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.session.user.id)
          .single();
        setUser((profile as Profile) ?? null);
      }
      setLoading(false);
    });
  }, []);

  const login = async (email: string, password: string): Promise<Profile> => {
    if (!hasSupabaseEnv) {
      const admin = getMockAdmin();
      setUser(admin);
      return admin;
    }
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error("بيانات الدخول غير صحيحة");
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .single();
    const p = (profile as Profile) ?? null;
    if (p && !p.is_active) throw new Error("هذا الحساب موقوف");
    setUser(p);
    return p;
  };

  const logout = async () => {
    if (hasSupabaseEnv) {
      await createClient().auth.signOut();
    }
    setUser(null);
    router.push("/login");
  };

  const hasRole = (roles: UserRole[]) => (user ? roles.includes(user.role) : false);

  const can = (permission: string) => {
    if (!user) return false;
    if (user.role === "admin") return true;
    const granted = PERMISSIONS[user.role] ?? [];
    const custom = user.custom_permissions ?? {};
    if (custom[permission] === true) return true;
    if (custom[permission] === false) return false;
    return granted.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, hasRole, can, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
