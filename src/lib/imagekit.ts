import { getToken } from "./api";
import { API_URL } from "./config";

interface AuthParams {
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
  urlEndpoint: string;
}

async function fetchAuth(): Promise<AuthParams> {
  const authToken = await getToken();
  const res = await fetch(`${API_URL}/api/imagekit/auth`, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ImageKit auth failed: ${text}`);
  }
  return res.json();
}

export async function uploadToImageKit(uri: string): Promise<string> {
  const auth = await fetchAuth();

  const formData = new FormData();
  formData.append("file", {
    uri,
    type: "image/jpeg",
    name: `prescription_${Date.now()}.jpg`,
  } as any);
  formData.append("fileName", `prescription_${Date.now()}.jpg`);
  formData.append("publicKey", auth.publicKey);
  formData.append("signature", auth.signature);
  formData.append("expire", String(auth.expire));
  formData.append("token", auth.token);
  formData.append("folder", "/prescriptions");
  formData.append("useUniqueFileName", "true");

  const res = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`ImageKit upload failed: ${errBody}`);
  }

  const data = await res.json();
  return data.url as string;
}
