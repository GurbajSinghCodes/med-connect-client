import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  api,
  clearStoredUser,
  clearToken,
  getStoredUser,
  getToken,
  setStoredUser,
  setToken,
  type AuthResponse,
  type Role,
  type User,
} from "../lib/api";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  isPharmacy: boolean;
  isPatient: boolean;
  login: (email: string, password: string) => Promise<User>;
  registerPatient: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    countryCode?: string;
  }) => Promise<User>;

  registerPharmacy: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    countryCode?: string;
    pharmacyName: string;
    address: string;
    longitude: number;
    latitude: number;
  }) => Promise<User>;
  verifyOtp: (data: {
    email: string;
    code: string;
    purpose?: string;
    role?: Role;
    name?: string;
    phone?: string;
    pharmacyName?: string;
    address?: string;
    longitude?: number;
    latitude?: number;
  }) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rehydrate on app launch
  useEffect(() => {
    (async () => {
      try {
        const [token, storedUser] = await Promise.all([
          getToken(),
          getStoredUser(),
        ]);
        if (token && storedUser) {
          setUser(storedUser);
          // Refresh silently in the background — ignore failures
          try {
            const fresh = await api.getMe();
            setUser(fresh);
            await setStoredUser(fresh);
          } catch {
            // Token expired or invalid — clear local state
            await clearToken();
            await clearStoredUser();
            setUser(null);
          }
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persistAuth = useCallback(async (res: AuthResponse) => {
    const { token, ...userData } = res;
    await setToken(token);
    await setStoredUser(userData as User);
    setUser(userData as User);
    return userData as User;
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.login(email, password);
      return persistAuth(res);
    },
    [persistAuth],
  );

  const registerPatient = useCallback(
    async (data: {
      name: string;
      email: string;
      password: string;
      phone?: string;
      countryCode?: string;
    }) => {
      const res = await api.registerPatient(data);
      return persistAuth(res);
    },
    [persistAuth],
  );

  const registerPharmacy = useCallback(
    async (data: {
      name: string;
      email: string;
      password: string;
      phone?: string;
      countryCode?: string;
      pharmacyName: string;
      address: string;
      longitude: number;
      latitude: number;
    }) => {
      const res = await api.registerPharmacy(data);
      return persistAuth(res);
    },
    [persistAuth],
  );

  const verifyOtp = useCallback(
    async (data: {
      email: string;
      code: string;
      purpose?: string;
      role?: Role;
      name?: string;
      phone?: string;
      pharmacyName?: string;
      address?: string;
      longitude?: number;
      latitude?: number;
    }) => {
      const res = await api.verifyOtp(data);
      return persistAuth(res);
    },
    [persistAuth],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Backend may be unreachable — still clear local state
    }
    await clearToken();
    await clearStoredUser();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const fresh = await api.getMe();
      setUser(fresh);
      await setStoredUser(fresh);
    } catch {
      // ignore — leave existing state
    }
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isGuest: !user,
    isPharmacy: user?.role === "pharmacy",
    isPatient: user?.role === "patient",
    login,
    registerPatient,
    registerPharmacy,
    verifyOtp,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
