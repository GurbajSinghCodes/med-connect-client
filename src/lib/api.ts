import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";

// --- Config ---

/**
 * Derives the backend URL from the Expo dev server.
 * When the app loads from the laptop at 192.168.1.22:8081,
 * we talk to the backend at 192.168.1.22:5000.
 */
const getBaseUrl = (): string => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:5000`;
  }
  return "http://localhost:5000";
};

const BASE_URL = getBaseUrl();

// --- Storage keys ---

const TOKEN_KEY = "@medconnect:token";
const USER_KEY = "@medconnect:user";
const DEVICE_ID_KEY = "@medconnect:deviceId";

// --- Token / user persistence ---

export const getToken = () => AsyncStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) =>
  AsyncStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => AsyncStorage.removeItem(TOKEN_KEY);

export const getStoredUser = async (): Promise<User | null> => {
  const raw = await AsyncStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const setStoredUser = (user: User) =>
  AsyncStorage.setItem(USER_KEY, JSON.stringify(user));

export const clearStoredUser = () => AsyncStorage.removeItem(USER_KEY);

// --- Device ID (for guest requests) ---

export const getDeviceId = async (): Promise<string> => {
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = Crypto.randomUUID();
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
};

// --- Types ---

export type Role = "patient" | "pharmacy";
export interface PharmacyPublic {
  _id: string;
  name: string;
  address: string;
  location: { type: "Point"; coordinates: [number, number] };
  openingTime?: string;
  closingTime?: string;
  contactNumber?: string;
  isOpenNow?: boolean | null;
}
export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  countryCode?: string;
  location?: { type: "Point"; coordinates: [number, number] };
  emailVerified?: boolean;
  hasFcmToken?: boolean;
}

export interface AuthResponse extends User {
  token: string;
  isNewUser?: boolean;
}

export interface Request {
  _id: string;
  patient?: string;
  guestDeviceId?: string;
  medicineName: string;
  description?: string;
  urgency: "general" | "urgent";
  location: { type: "Point"; coordinates: [number, number] };
  status: "open" | "fulfilled" | "cancelled";
  currentTier: number;
  notifiedPharmacies: string[];
  availableAt: {
    pharmacy: { _id: string; name: string; address: string; location: any };
    markedAt: string;
  }[];
  fulfilledBy?: { _id: string; name: string; address: string };
  fulfilledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Pharmacy {
  _id: string;
  owner: string;
  name: string;
  address: string;
  location: { type: "Point"; coordinates: [number, number] };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- Core request helper ---

interface RequestOptions {
  /** Set to false to skip attaching the Bearer token. Default: true */
  auth?: boolean;
  /** Set to false to skip attaching the X-Device-Id header. Default: true */
  guest?: boolean;
}

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const { auth = true, guest = true } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth) {
    const token = await getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  if (guest) {
    headers["X-Device-Id"] = await getDeviceId();
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = (data as any)?.message || `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }

  return data as T;
}

// --- Endpoints ---

export const api = {
  // --- Auth ---
  registerPatient: (data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    countryCode?: string;
  }) =>
    request<AuthResponse>("POST", "/api/auth/register/patient", data, {
      guest: false,
    }),

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
  }) =>
    request<AuthResponse>("POST", "/api/auth/register/pharmacy", data, {
      guest: false,
    }),
  listNearbyPharmacies: (
    longitude: number,
    latitude: number,
    maxDistance?: number,
  ) =>
    request<PharmacyPublic[]>(
      "GET",
      `/api/pharmacies/nearby?longitude=${longitude}&latitude=${latitude}${
        maxDistance ? `&maxDistance=${maxDistance}` : ""
      }`,
      undefined,
      { auth: false, guest: false },
    ),

  getPublicPharmacy: (id: string) =>
    request<PharmacyPublic>("GET", `/api/pharmacies/${id}`, undefined, {
      auth: false,
      guest: false,
    }),
  login: (email: string, password: string) =>
    request<AuthResponse>(
      "POST",
      "/api/auth/login",
      { email, password },
      { guest: false },
    ),

  getMe: () => request<User>("GET", "/api/auth/me"),

  updateLocation: (longitude: number, latitude: number) =>
    request<{ message: string; location: any }>("PUT", "/api/auth/location", {
      longitude,
      latitude,
    }),

  updateFcmToken: (fcmToken: string) =>
    request<{ message: string }>("PUT", "/api/auth/fcm-token", { fcmToken }),

  logout: () => request<{ message: string }>("POST", "/api/auth/logout"),

  // --- OTP ---
  requestOtp: (
    email: string,
    purpose: "verification" | "login" | "reset" = "verification",
  ) =>
    request<{ message: string; email: string; purpose: string }>(
      "POST",
      "/api/auth/otp/request",
      { email, purpose },
      { guest: false },
    ),

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
  }) =>
    request<AuthResponse>("POST", "/api/auth/otp/verify", data, {
      guest: false,
    }),

  // --- Requests ---
  createRequest: (data: {
    medicineName: string;
    description?: string;
    urgency?: "general" | "urgent";
    longitude: number;
    latitude: number;
    guestFcmToken?: string;
  }) => request<Request>("POST", "/api/requests", data),

  getMyRequests: () => request<Request[]>("GET", "/api/requests/my"),

  getRequest: (id: string) => request<Request>("GET", `/api/requests/${id}`),

  cancelRequest: (id: string) =>
    request<Request>("PATCH", `/api/requests/${id}/cancel`),

  fulfillRequest: (id: string, pharmacyId: string) =>
    request<Request>("PATCH", `/api/requests/${id}/fulfill`, { pharmacyId }),

  getNearbyRequests: () =>
    request<Request[]>("GET", "/api/requests/nearby", undefined, {
      guest: false,
    }),

  markAvailable: (id: string) =>
    request<Request>("PATCH", `/api/requests/${id}/available`, undefined, {
      guest: false,
    }),

  // --- Pharmacy profile ---
  getMyPharmacy: () =>
    request<Pharmacy>("GET", "/api/pharmacy/me", undefined, { guest: false }),

  updatePharmacy: (data: { name?: string; address?: string }) =>
    request<Pharmacy>("PUT", "/api/pharmacy/me", data, { guest: false }),

  updatePharmacyLocation: (longitude: number, latitude: number) =>
    request<Pharmacy>(
      "PUT",
      "/api/pharmacy/location",
      { longitude, latitude },
      { guest: false },
    ),

  togglePharmacyActive: () =>
    request<Pharmacy>("PUT", "/api/pharmacy/toggle-active", undefined, {
      guest: false,
    }),
};

export { ApiError };
