// SPDX-License-Identifier: MIT
import type { PlanId } from "./subscriptions";
import { supabase, isSupabaseConfigured } from "../lib/supabase";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  bio?: string;
  githubUsername?: string;
  gitlabUsername?: string;
  plan: PlanId;
  planExpiresAt?: string;
  emailVerified: boolean;
  createdAt: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: "dark" | "light";
  language: "es" | "en";
  fontSize: number;
  highContrast: boolean;
  timezone: string;
  notifications: NotificationPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  projectShared: boolean;
  collaboratorChanges: boolean;
  weeklyDigest: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "dark",
  language: "es",
  fontSize: 13,
  highContrast: false,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  notifications: {
    email: true,
    projectShared: true,
    collaboratorChanges: true,
    weeklyDigest: false,
  },
};

export type AuthProvider = "github" | "gitlab" | "email";

const AUTH_KEY = "simlog.auth";

function getStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function storeUser(user: UserProfile | null) {
  if (user) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_KEY);
  }
}

export interface AuthService {
  user: UserProfile | null;
  isLoading: boolean;
  signInWithGithub: () => Promise<void>;
  signInWithGitlab: () => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

function createOAuthUrl(provider: "github" | "gitlab"): string {
  if (isSupabaseConfigured()) {
    const base = "https://api.supabase.com/auth/v1/authorize";
    const params = new URLSearchParams({
      provider,
      redirect_to: `${window.location.origin}/auth/${provider}/callback`,
    });
    return `${base}?${params.toString()}`;
  }
  const base = provider === "github"
    ? "https://github.com/login/oauth/authorize"
    : "https://gitlab.com/oauth/authorize";
  const clientId = provider === "github"
    ? import.meta.env.VITE_GITHUB_CLIENT_ID || "github_client_id"
    : import.meta.env.VITE_GITLAB_CLIENT_ID || "gitlab_client_id";
  const redirectUri = `${window.location.origin}/auth/${provider}/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: provider === "github" ? "user:email" : "read_user",
    response_type: "code",
  });
  return `${base}?${params.toString()}`;
}

function supabaseToProfile(sbUser: any, sbSession: any): UserProfile {
  const meta = sbUser?.user_metadata || {};
  const identities = sbUser?.identities || [];
  const ghIdentity = identities.find((i: any) => i.provider === "github");
  const glIdentity = identities.find((i: any) => i.provider === "gitlab");
  return {
    id: sbUser?.id || "sb_" + Date.now(),
    email: sbUser?.email || meta?.email || "",
    name: meta?.full_name || meta?.name || sbUser?.email?.split("@")[0] || "Usuario",
    avatar: meta?.avatar_url || meta?.picture,
    bio: "",
    githubUsername: ghIdentity?.identity_data?.user_name || ghIdentity?.identity_data?.login,
    gitlabUsername: glIdentity?.identity_data?.username,
    plan: "free",
    emailVerified: !!sbUser?.email_confirmed_at,
    createdAt: sbUser?.created_at || new Date().toISOString(),
    preferences: { ...DEFAULT_PREFERENCES },
  };
}

export function getStoredAuth(): UserProfile | null {
  return getStoredUser();
}

export function createAuthService(): AuthService {
  let user = getStoredUser();
  let isLoading = false;
  const listeners: Array<() => void> = [];

  function notify() {
    listeners.forEach((l) => l());
  }

  function getState(): AuthService {
    return {
      get user() { return user; },
      get isLoading() { return isLoading; },
      signInWithGithub: async () => {
        if (isSupabaseConfigured()) {
          const { error } = await supabase!.auth.signInWithOAuth({
            provider: "github",
            options: { redirectTo: `${window.location.origin}/auth/github/callback` },
          });
          if (error) console.error("GitHub sign in error:", error);
        } else {
          window.location.href = createOAuthUrl("github");
        }
      },
      signInWithGitlab: async () => {
        if (isSupabaseConfigured()) {
          const { error } = await supabase!.auth.signInWithOAuth({
            provider: "gitlab",
            options: { redirectTo: `${window.location.origin}/auth/gitlab/callback` },
          });
          if (error) console.error("GitLab sign in error:", error);
        } else {
          window.location.href = createOAuthUrl("gitlab");
        }
      },
      sendMagicLink: async (email: string) => {
        if (isSupabaseConfigured()) {
          const { error } = await supabase!.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: true },
          });
          if (error) throw error;
        }
        localStorage.setItem("simlog.magic_email", email);
      },
      signOut: async () => {
        if (isSupabaseConfigured()) {
          await supabase!.auth.signOut();
        }
        user = null;
        storeUser(null);
        notify();
      },
      updateProfile: async (updates) => {
        if (!user) return;
        user = { ...user, ...updates };
        storeUser(user);
        notify();
        if (isSupabaseConfigured()) {
          const { error } = await supabase!.from("profiles").upsert(
            { id: user.id, ...updates },
            { onConflict: "id" }
          );
          if (error) console.error("Profile update error:", error);
        }
      },
      updatePreferences: async (prefs) => {
        if (!user) return;
        user = { ...user, preferences: { ...user.preferences, ...prefs } };
        storeUser(user);
        notify();
      },
      deleteAccount: async () => {
        if (isSupabaseConfigured()) {
          await supabase!.from("profiles").delete().eq("id", user?.id);
          const { error } = await supabase!.rpc("delete_user");
          if (error) console.error("Account deletion error:", error);
        }
        localStorage.clear();
        user = null;
        notify();
      },
      refreshSession: async () => {
        if (isSupabaseConfigured()) {
          const { data: { session } } = await supabase!.auth.getSession();
          if (session?.user) {
            user = supabaseToProfile(session.user, session);
            storeUser(user);
            notify();
          }
        }
        const stored = getStoredUser();
        if (stored) {
          user = stored;
          notify();
        }
      },
    };
  }

  const service = getState();

  return {
    ...service,
    subscribe(listener: () => void) {
      listeners.push(listener);
      return () => {
        const i = listeners.indexOf(listener);
        if (i >= 0) listeners.splice(i, 1);
      };
    },
  } as any;
}

export function handleOAuthCallback(provider: AuthProvider, code: string): UserProfile | null {
  const existing = getStoredUser();
  const profile: UserProfile = existing || {
    id: `${provider}_${code.slice(0, 8)}`,
    email: `${provider}-user@example.com`,
    name: provider === "github" ? "Usuario de GitHub" : "Usuario de GitLab",
    avatar: `https://avatars.githubusercontent.com/u/0?v=4`,
    plan: "free",
    emailVerified: true,
    createdAt: new Date().toISOString(),
    preferences: { ...DEFAULT_PREFERENCES },
  };
  storeUser(profile);
  return profile;
}

export async function handleSupabaseCallback(): Promise<UserProfile | null> {
  if (!isSupabaseConfigured()) return null;
  const { data: { session }, error } = await supabase!.auth.getSession();
  if (error || !session?.user) return null;
  const profile = supabaseToProfile(session.user, session);
  storeUser(profile);
  return profile;
}

export function createDemoUser(): UserProfile {
  const profile: UserProfile = {
    id: "demo_" + Date.now(),
    email: "demo@logicflow.dev",
    name: "Usuario Demo",
    plan: "free",
    emailVerified: true,
    createdAt: new Date().toISOString(),
    preferences: { ...DEFAULT_PREFERENCES },
  };
  storeUser(profile);
  return profile;
}
