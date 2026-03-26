const COOKIE_NAME = "plushies_session";
const PAYLOAD = "plushies-authenticated";

async function hmac(): Promise<CryptoKey> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createSessionToken(): Promise<string> {
  const key = await hmac();
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(PAYLOAD));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const expected = await createSessionToken();
    // Constant-time comparison to prevent timing attacks
    if (token.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < token.length; i++) {
      diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}

export { COOKIE_NAME };
