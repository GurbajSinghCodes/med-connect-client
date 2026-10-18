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
  type User,
} from "../lib/api";
import { getPushToken } from "../lib/notifications";

interface AuthContextValue {
  user: User | null;
  needsPharmacyProfile: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  isPharmacy: boolean;
  isPatient: boolean;

  openRequestCount: number;
  setOpenRequestCount: React.Dispatch<React.SetStateAction<number>>;

  login: (email: string, password: string) => Promise<User>;
  requestOtp: (
    email: string,
    purpose?: "verification" | "login" | "reset",
  ) => Promise<{ message: string }>;
  verifyOtp: (data: {
    email: string;
    code: string;
    purpose?: string;
    name?: string;
    phone?: string;
    countryCode?: string;
    password?: string;
  }) => Promise<User>;
  googleAuth: (data: { idToken: string }) => Promise<User>;
  resetPassword: (
    email: string,
    code: string,
    newPassword: string,
  ) => Promise<{ message: string }>;

  completePharmacyProfile: (data: {
    ownerName?: string;
    phone?: string;
    pharmacyName: string;
    address: string;
    longitude: number;
    latitude: number;
  }) => Promise<void>;

  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [needsPharmacyProfile, setNeedsPharmacyProfile] = useState(false);
  const [openRequestCount, setOpenRequestCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

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

  // Rehydrate on launch
  useEffect(() => {
    (async () => {
      try {
        const [token, storedUser] = await Promise.all([
          getToken(),
          getStoredUser(),
        ]);
        if (token && storedUser) {
          if (storedUser.role !== "pharmacy") {
            // Patients can't sign in — clear session
            await clearToken();
            await clearStoredUser();
          } else {
            setUser(storedUser);
            try {
              const fresh = await api.getMe();
              const { needsPharmacyProfile: needsProfile, ...userData } =
                fresh as any;
              setUser(userData as User);
              await setStoredUser(userData as User);
              setNeedsPharmacyProfile(!!needsProfile);
              if (!needsProfile) registerPushToken();
            } catch {
              await clearToken();
              await clearStoredUser();
              setUser(null);
              setNeedsPharmacyProfile(false);
            }
          }
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, [registerPushToken]);

  const persistAuth = useCallback(
    async (res: AuthResponse) => {
      const { token, needsPharmacyProfile: needsProfile, ...userData } = res;
      await setToken(token);
      await setStoredUser(userData as User);
      setUser(userData as User);
      setNeedsPharmacyProfile(!!needsProfile);
      if (!needsProfile) registerPushToken();
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
      name?: string;
      phone?: string;
      countryCode?: string;
      password?: string;
    }) => {
      const res = await api.verifyOtp(data as any);
      return persistAuth(res);
    },
    [persistAuth],
  );

  const googleAuth = useCallback(
    async (data: { idToken: string }) => {
      const res = await api.googleAuth(data);
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

  const refreshUser = useCallback(async () => {
    try {
      const fresh = await api.getMe();
      const { needsPharmacyProfile: needsProfile, ...userData } = fresh as any;
      setUser(userData as User);
      await setStoredUser(userData as User);
      setNeedsPharmacyProfile(!!needsProfile);
      if (!needsProfile) registerPushToken();
    } catch (err) {
      console.warn("[auth] refreshUser failed:", err);
    }
  }, [registerPushToken]);

  const completePharmacyProfile = useCallback(
    async (data: {
      ownerName?: string;
      phone?: string;
      pharmacyName: string;
      address: string;
      longitude: number;
      latitude: number;
    }) => {
      console.log("[profile-complete] step 1: updateProfile", {
        name: data.ownerName,
        phone: data.phone,
      });
      if (data.ownerName || data.phone) {
        await api.updateProfile({
          name: data.ownerName,
          phone: data.phone,
        });
        console.log("[profile-complete] step 1: ok");
      } else {
        console.log("[profile-complete] step 1: skipped");
      }

      console.log("[profile-complete] step 2: updatePharmacy", {
        name: data.pharmacyName,
        address: data.address,
        coordinates: [data.longitude, data.latitude],
      });
      await api.updatePharmacy({
        name: data.pharmacyName,
        address: data.address,
        contactNumber: data.phone,
        longitude: data.longitude,
        latitude: data.latitude,
      });
      console.log("[profile-complete] step 2: ok");

      console.log("[profile-complete] step 3: flip flag to false");
      setNeedsPharmacyProfile(false);

      console.log("[profile-complete] step 4: refreshUser (background)");
      try {
        await refreshUser();
        console.log("[profile-complete] step 4: ok");
      } catch (err) {
        console.warn(
          "[profile-complete] step 4: refresh failed (non-fatal):",
          err,
        );
      }

      console.log("[profile-complete] DONE");
    },
    [refreshUser],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {}
    await clearToken();
    await clearStoredUser();
    setUser(null);
    setNeedsPharmacyProfile(false);
    setOpenRequestCount(0);
  }, []);

  const value: AuthContextValue = {
    user,
    needsPharmacyProfile,
    isLoading,
    isAuthenticated: !!user,
    isGuest: !user,
    isPharmacy: user?.role === "pharmacy",
    isPatient: user?.role === "patient",
    openRequestCount,
    setOpenRequestCount,
    login,
    requestOtp,
    verifyOtp,
    googleAuth,
    resetPassword,
    completePharmacyProfile,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
