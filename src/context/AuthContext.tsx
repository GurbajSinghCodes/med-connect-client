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
import { getPushToken } from "../lib/notifications";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  isPharmacy: boolean;
  isPatient: boolean;
  openRequestCount: number;
  setOpenRequestCount: React.Dispatch<React.SetStateAction<number>>;
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

  requestOtp: (
    email: string,
    purpose?: "verification" | "login" | "reset",
  ) => Promise<{ message: string }>;

  verifyOtp: (data: {
    email: string;
    code: string;
    purpose?: string;
    role?: Role;
    name?: string;
    phone?: string;
    countryCode?: string;
    password?: string;
    pharmacyName?: string;
    address?: string;
    longitude?: number;
    latitude?: number;
  }) => Promise<User>;

  resetPassword: (
    email: string,
    code: string,
    newPassword: string,
  ) => Promise<{ message: string }>;

  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [openRequestCount, setOpenRequestCount] = useState(0);
  const registerPushToken = useCallback(async () => {
    try {
      const token = await getPushToken();
      if (token) {
        await api.updateFcmToken(token);
        console.log("[push] token registered with backend");
      }
    } catch (err) {
      console.warn("[push] register failed:", err);
    }
  }, []);
  useEffect(() => {
    if (isLoading || !user) return;

    const fetchCount = async () => {
      try {
        if (user.role === "pharmacy") {
          const list = await api.getNearbyRequests();
          setOpenRequestCount(list.filter((r) => r.status === "open").length);
        } else {
          const list = await api.getMyRequests();
          setOpenRequestCount(list.filter((r) => r.status === "open").length);
        }
      } catch {
        // ignore — next poll will retry
      }
    };

    fetchCount(); // initial
    const id = setInterval(fetchCount, 30000);
    return () => clearInterval(id);
  }, [user, isLoading]);
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
          try {
            const fresh = await api.getMe();
            setUser(fresh);
            await setStoredUser(fresh);
            registerPushToken();
          } catch {
            await clearToken();
            await clearStoredUser();
            setUser(null);
          }
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, [registerPushToken]);

  const persistAuth = useCallback(
    async (res: AuthResponse) => {
      const { token, ...userData } = res;
      await setToken(token);
      await setStoredUser(userData as User);
      setUser(userData as User);
      registerPushToken();
      return userData as User;
    },
    [registerPushToken],
  );

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

  const requestOtp = useCallback(
    async (
      email: string,
      purpose: "verification" | "login" | "reset" = "verification",
    ) => {
      return api.requestOtp(email, purpose);
    },
    [],
  );

  const verifyOtp = useCallback(
    async (data: {
      email: string;
      code: string;
      purpose?: string;
      role?: Role;
      name?: string;
      phone?: string;
      countryCode?: string;
      password?: string;
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

  const resetPassword = useCallback(
    async (email: string, code: string, newPassword: string) => {
      return api.resetPassword(email, code, newPassword);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Backend may be unreachable — still clear local state
    }
    await clearToken();
    await clearStoredUser();
    setOpenRequestCount(0);
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
    requestOtp,
    verifyOtp,
    openRequestCount,
    setOpenRequestCount,
    resetPassword,
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
