import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";

import { createSignature } from "../functions/_lib/auth.js";

export function buildNpxInvocation(args = [], { platform = process.platform, comSpec = process.env.ComSpec || "cmd.exe" } = {}) {
  const normalizedArgs = [...args];
  return platform === "win32"
    ? { command: comSpec, args: ["/d", "/s", "/c", "npx.cmd", ...normalizedArgs] }
    : { command: "npx", args: normalizedArgs };
}

function defaultUpload(upload, { bucket }) {
  const invocation = buildNpxInvocation([
    "--yes", "wrangler@4.110.0", "r2", "object", "put", `${bucket}/${upload.key}`,
    "--file", upload.sourcePath, "--content-type", upload.contentType, "--remote"
  ]);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
    windowsHide: true
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`R2 upload failed: ${upload.key}`);
}

export function createRemotePublisher({ siteUrl, secret, bucket = "guitarbook-media", upload = defaultUpload, fetchImpl = fetch } = {}) {
  return async function publish({ payload, uploads = [] }) {
    if (!siteUrl) throw new Error("A site URL is required before remote publish.");
    if (!secret) throw new Error("A publish secret is required before remote publish.");
    let target;
    try {
      target = new URL("/api/admin/publish-batch", siteUrl);
    } catch {
      throw new Error("Site URL is invalid.");
    }
    for (const descriptor of uploads) await upload(descriptor, { bucket });
    const body = JSON.stringify(payload);
    const timestamp = String(Date.now());
    const nonce = randomBytes(18).toString("base64url");
    const signature = await createSignature({ secret, timestamp, nonce, body });
    const response = await fetchImpl(target, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-guitarbook-timestamp": timestamp,
        "x-guitarbook-nonce": nonce,
        "x-guitarbook-signature": signature
      },
      body
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `Publish API failed with HTTP ${response.status}.`);
    return result;
  };
}

export function createRemoteActivator({ siteUrl, secret, fetchImpl = fetch } = {}) {
  return async function activateRelease(releaseId) {
    if (!siteUrl) throw new Error("A site URL is required before rollback.");
    if (!secret) throw new Error("A publish secret is required before rollback.");
    const target = new URL("/api/admin/activate", siteUrl);
    const body = JSON.stringify({ releaseId });
    const timestamp = String(Date.now());
    const nonce = randomBytes(18).toString("base64url");
    const signature = await createSignature({ secret, timestamp, nonce, body });
    const response = await fetchImpl(target, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-guitarbook-timestamp": timestamp,
        "x-guitarbook-nonce": nonce,
        "x-guitarbook-signature": signature
      },
      body
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || `Rollback API failed with HTTP ${response.status}.`);
    return result;
  };
}
