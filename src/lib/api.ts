import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { API_URL } from "./config";

const TOKEN_KEY = "@medconnect:token";
const USER_KEY = "@medconnect:user";
const DEVICE_ID_KEY = "@medconnect:deviceId";

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

export const getDeviceId = async (): Promise<string> => {
  let id = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = Crypto.randomUUID();
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
};

export type Role = "patient" | "pharmacy";

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
  needsPharmacyProfile?: boolean;
}

export interface AuthResponse extends User {
  token: string;
  needsPharmacyProfile?: boolean;
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
    pharmacy: {
      _id: string;
      name: string;
      address: string;
      location?: { type: "Point"; coordinates: [number, number] };
    };
    markedAt: string;
    distanceMeters?: number;
  }[];
  fulfilledBy?: {
    _id: string;
    name: string;
    address: string;
    location?: { type: "Point"; coordinates: [number, number] };
  };
  fulfilledAt?: string;
  fulfilledByDistance?: number;
  contactPhone?: string;
  contactCountryCode?: string;
  prescriptionImages?: string[];
  flaggedBy?: { pharmacy: string; reason: string; flaggedAt: string }[];
  needsReupload?: boolean;
  reuploadRequestedAt?: string;
  distanceMeters?: number;
  isChosen?: boolean;
  iAccepted?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Pharmacy {
  _id: string;
  owner: string;
  name: string;
  address: string;
  location: { type: "Point"; coordinates: [number, number] };
  openingTime?: string;
  closingTime?: string;
  contactNumber?: string;
  contactCountryCode?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PharmacyPublic {
  _id: string;
  name: string;
  address: string;
  location: { type: "Point"; coordinates: [number, number] };
  openingTime?: string;
  closingTime?: string;
  contactNumber?: string;
  contactCountryCode?: string;
  isOpenNow?: boolean | null;
}

interface RequestOptions {
  auth?: boolean;
  guest?: boolean;
}

class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
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

  const url = `${API_URL}${path}`;
  console.log(`[api] → ${method} ${url}`, body ?? "");

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err: any) {
    console.error(
      `[api] ✗ ${method} ${url} — fetch threw:`,
      err?.message || err,
    );
    throw new ApiError(err?.message || "Network error", 0);
  }

  const data = await res.json().catch(() => ({}));

  console.log(
    `[api] ← ${method} ${path} ${res.status}`,
    typeof data === "object" ? data : "",
  );

  if (!res.ok) {
    const message = (data as any)?.message || `Request failed (${res.status})`;
    const code = (data as any)?.code;
    throw new ApiError(message, res.status, code);
  }

  return data as T;
}

export const api = {
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

  login: (email: string, password: string) =>
    request<AuthResponse>(
      "POST",
      "/api/auth/login",
      { email, password },
      { guest: false },
    ),

  getMe: () => request<User>("GET", "/api/auth/me"),

  updateProfile: (data: {
    name?: string;
    phone?: string;
    countryCode?: string;
  }) => request<User>("PUT", "/api/auth/profile", data),

  updateLocation: (longitude: number, latitude: number) =>
    request<{ message: string; location: any }>("PUT", "/api/auth/location", {
      longitude,
      latitude,
    }),

  updateFcmToken: (fcmToken: string) =>
    request<{ message: string }>("PUT", "/api/auth/fcm-token", { fcmToken }),

  deactivateAccount: () =>
    request<{ message: string }>("PATCH", "/api/auth/deactivate"),

  deleteAccount: () => request<{ message: string }>("DELETE", "/api/auth/me"),

  logout: () => request<{ message: string }>("POST", "/api/auth/logout"),

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
    countryCode?: string;
    password?: string;
    pharmacyName?: string;
    address?: string;
    longitude?: number;
    latitude?: number;
  }) =>
    request<AuthResponse>("POST", "/api/auth/otp/verify", data, {
      guest: false,
    }),

  resetPassword: (email: string, code: string, newPassword: string) =>
    request<{ message: string }>(
      "POST",
      "/api/auth/otp/reset-password",
      { email, code, newPassword },
      { guest: false },
    ),

  googleAuth: (data: { idToken: string }) =>
    request<AuthResponse>("POST", "/api/auth/google", data, { guest: false }),

  createRequest: (data: {
    medicineName: string;
    description?: string;
    urgency?: "general" | "urgent";
    longitude: number;
    latitude: number;
    guestFcmToken?: string;
    prescriptionImages?: string[];
    contactPhone?: string;
    contactCountryCode?: string;
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

  flagRequest: (id: string, reason: string) =>
    request<{ flaggedBy: number; needsReupload: boolean }>(
      "PATCH",
      `/api/requests/${id}/flag`,
      { reason },
      { guest: false },
    ),

  reuploadPrescription: (id: string, images: string[]) =>
    request<Request>("POST", `/api/requests/${id}/reupload`, { images }),

  getMyPharmacy: () =>
    request<Pharmacy>("GET", "/api/pharmacy/me", undefined, { guest: false }),

  updatePharmacy: (data: {
    name?: string;
    address?: string;
    contactNumber?: string;
    openingTime?: string;
    closingTime?: string;
    isActive?: boolean;
    longitude?: number;
    latitude?: number;
  }) => request<Pharmacy>("PUT", "/api/pharmacy/me", data, { guest: false }),

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

  listNearbyPharmacies: (
    longitude: number,
    latitude: number,
    maxDistance?: number,
  ) =>
    request<PharmacyPublic[]>(
      "GET",
      `/api/pharmacies/nearby?longitude=${longitude}&latitude=${latitude}${maxDistance ? `&maxDistance=${maxDistance}` : ""}`,
      undefined,
      { auth: false, guest: false },
    ),

  getPublicPharmacy: (id: string) =>
    request<PharmacyPublic>("GET", `/api/pharmacies/${id}`, undefined, {
      auth: false,
      guest: false,
    }),
};

export { ApiError };
