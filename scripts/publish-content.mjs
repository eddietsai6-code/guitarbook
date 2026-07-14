import { spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { createSignature } from "../functions/_lib/auth.js";
import { validatePublishPayload } from "../functions/_lib/catalog.js";

const MIME_BY_EXTENSION = new Map([
  [".mp3", "audio/mpeg"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"]
]);

function compactTimestamp(date) {
  return date.toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
}

function safeLocalFile(baseDirectory, fileValue) {
  const raw = String(fileValue || "").trim();
  if (!raw) throw new Error("Every audio and score item needs a file path.");
  const absolutePath = path.resolve(baseDirectory, raw);
  const relativePath = path.relative(baseDirectory, absolutePath);
  if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Content files must stay inside the manifest directory: ${raw}`);
  }
  return absolutePath;
}

function slugPart(value) {
  return String(value || "media")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "media";
}

async function compileMedia(items, kind, manifestDirectory, releaseId, songId) {
  if (!Array.isArray(items)) throw new Error(`${kind} must be an array.`);
  const uploads = [];
  const records = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const filePath = safeLocalFile(manifestDirectory, item.file);
    const extension = path.extname(filePath).toLowerCase();
    const contentType = MIME_BY_EXTENSION.get(extension);
    if (!contentType || (kind === "audio" && contentType !== "audio/mpeg") || (kind === "score" && !contentType.startsWith("image/"))) {
      throw new Error(`Unsupported ${kind} file type: ${extension || "none"}`);
    }
    const bytes = await fs.readFile(filePath);
    if (!bytes.length) throw new Error(`Content file is empty: ${filePath}`);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const name = `${kind}-${String(index + 1).padStart(2, "0")}-${slugPart(path.basename(filePath, extension))}-${sha256.slice(0, 12)}${extension}`;
    const key = `${releaseId}/${songId}/${name}`;
    const title = String(item.title || `${kind === "audio" ? "Audio" : "Score"} ${index + 1}`).trim();
    uploads.push({ filePath, key, sha256, size: bytes.length, contentType });
    records.push({
      ...(kind === "audio" ? { id: String(item.id || `audio-${index + 1}`) } : {}),
      title,
      src: `/media/${key}`
    });
  }
  return { uploads, records };
}

export async function buildPublishPlan(manifestPathValue, options = {}) {
  const manifestPath = path.resolve(manifestPathValue);
  const manifestDirectory = path.dirname(manifestPath);
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  const song = manifest.song || {};
  const now = options.now || new Date();
  const suffix = options.releaseSuffix || randomBytes(6).toString("hex");
  const releaseId = `release-${compactTimestamp(now)}-${suffix}`;

  const audio = await compileMedia(manifest.audio || [], "audio", manifestDirectory, releaseId, song.id);
  const scores = await compileMedia(manifest.scores || [], "score", manifestDirectory, releaseId, song.id);
  const uploads = [...audio.uploads, ...scores.uploads];
  if (!uploads.length) throw new Error("A publication must contain at least one audio or score file.");

  const payload = validatePublishPayload({
    releaseId,
    createdAt: now.toISOString(),
    song: {
      ...song,
      source: song.source || "Teacher Upload",
      category: song.category || "Teaching Piece",
      style: song.style || "Acoustic Guitar",
      techniques: song.techniques || [],
      audio: audio.records,
      scoreImages: scores.records
    },
    media: uploads.map(({ key, sha256, size, contentType }) => ({ key, sha256, size, contentType }))
  });

  return { manifestPath, uploads, payload };
}

function runWranglerUpload({ bucket, upload }) {
  const executable = process.platform === "win32" ? "npx.cmd" : "npx";
  const result = spawnSync(
    executable,
    [
      "--yes",
      "wrangler@4.110.0",
      "r2",
      "object",
      "put",
      `${bucket}/${upload.key}`,
      "--file",
      upload.filePath,
      "--content-type",
      upload.contentType,
      "--remote"
    ],
    { cwd: process.cwd(), env: process.env, stdio: "inherit" }
  );
  if (result.status !== 0) throw new Error(`R2 upload failed: ${upload.key}`);
}

async function signedPost({ siteUrl, endpoint, secret, payload }) {
  const body = JSON.stringify(payload);
  const timestamp = String(Date.now());
  const nonce = randomBytes(18).toString("base64url");
  const signature = await createSignature({ secret, timestamp, nonce, body });
  const response = await fetch(new URL(endpoint, siteUrl), {
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
}

async function loadLocalEnvironment() {
  try {
    const source = await fs.readFile(path.resolve(".env.guitarbook-content"), "utf8");
    for (const line of source.split(/\r?\n/)) {
      const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function main() {
  await loadLocalEnvironment();
  const [commandOrManifest, value] = process.argv.slice(2);
  const secret = process.env.GUITARBOOK_PUBLISH_SECRET;
  const siteUrl = process.env.GUITARBOOK_SITE_URL || "https://guitarbook.pages.dev";
  if (!secret) throw new Error("Set GUITARBOOK_PUBLISH_SECRET before publishing content.");

  if (commandOrManifest === "--activate") {
    if (!value) throw new Error("Usage: npm run content:activate -- <release-id>");
    const result = await signedPost({ siteUrl, endpoint: "/api/admin/activate", secret, payload: { releaseId: value } });
    console.log(`Activated ${result.releaseId}; previous release was ${result.previousReleaseId || "none"}.`);
    return;
  }

  if (!commandOrManifest) throw new Error("Usage: npm run content:publish -- <path-to-song.json>");
  const bucket = process.env.GUITARBOOK_R2_BUCKET || "guitarbook-media";
  const plan = await buildPublishPlan(commandOrManifest);
  for (const upload of plan.uploads) runWranglerUpload({ bucket, upload });
  const result = await signedPost({ siteUrl, endpoint: "/api/admin/publish", secret, payload: plan.payload });
  console.log(`Published ${result.songId} as ${result.releaseId}.`);
  console.log(`${siteUrl.replace(/\/$/, "")}/api/catalog/releases/${result.releaseId}`);
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
