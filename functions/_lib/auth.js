const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

function bytesToHex(bytes) {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

export async function createSignature({ secret, timestamp, nonce, body }) {
  if (!secret) throw new Error("CONTENT_PUBLISH_SECRET is not configured.");
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${nonce}.${body}`));
  return bytesToHex(new Uint8Array(signature));
}

export async function verifySignedRequest({ request, secret, now = Date.now() }) {
  const timestamp = request.headers.get("x-guitarbook-timestamp") || "";
  const nonce = request.headers.get("x-guitarbook-nonce") || "";
  const suppliedSignature = (request.headers.get("x-guitarbook-signature") || "").toLowerCase();
  const numericTimestamp = Number(timestamp);

  if (!Number.isFinite(numericTimestamp) || Math.abs(now - numericTimestamp) > MAX_CLOCK_SKEW_MS) {
    throw new Error("Publish request timestamp is invalid or expired.");
  }
  if (!/^[A-Za-z0-9_-]{12,128}$/.test(nonce)) throw new Error("Publish request nonce is invalid.");
  if (!/^[a-f0-9]{64}$/.test(suppliedSignature)) throw new Error("Publish request signature is invalid.");

  const body = await request.text();
  if (body.length > 1024 * 1024) throw new Error("Publish request body is too large.");
  const expectedSignature = await createSignature({ secret, timestamp, nonce, body });
  if (!constantTimeEqual(expectedSignature, suppliedSignature)) throw new Error("Publish request signature is invalid.");

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new Error("Publish request body must be valid JSON.");
  }
  return { body, nonce, payload, timestamp: numericTimestamp };
}

