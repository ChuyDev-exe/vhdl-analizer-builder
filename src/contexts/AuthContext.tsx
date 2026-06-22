import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { UserProfile, UserPreferences, AuthService } from "../services/auth";
import { createAuthService, DEFAULT_PREFERENCES } from "../services/auth";

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithGithub: () => Promise<void>;
  signInWithGitlab: () => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const authRef = useState(() => createAuthService())[0];
  const [user, setUser] = useState<UserProfile | null>(authRef.user);
  const [isLoading, setIsLoading] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const unsub = (authRef as any).subscribe?.(() => {
      setUser(authRef.user);
      setVersion((v) => v + 1);
    });
    return () => unsub?.();
  }, [authRef]);

  const signInWithGithub = useCallback(() => authRef.signInWithGithub(), [authRef]);
  const signInWithGitlab = useCallback(() => authRef.signInWithGitlab(), [authRef]);
  const sendMagicLink = useCallback((email: string) => authRef.sendMagicLink(email), [authRef]);
  const signOut = useCallback(async () => {
    await authRef.signOut();
    setUser(null);
  }, [authRef]);
  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    await authRef.updateProfile(updates);
  }, [authRef]);
  const updatePreferences = useCallback(async (prefs: Partial<UserPreferences>) => {
    await authRef.updatePreferences(prefs);
  }, [authRef]);
  const deleteAccount = useCallback(async () => {
    await authRef.deleteAccount();
    setUser(null);
  }, [authRef]);
  const refreshSession = useCallback(async () => {
    await authRef.refreshSession();
  }, [authRef]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        signInWithGithub,
        signInWithGitlab,
        sendMagicLink,
        signOut,
        updateProfile,
        updatePreferences,
        deleteAccount,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
