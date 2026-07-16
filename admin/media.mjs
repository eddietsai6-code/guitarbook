import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const MIME_BY_EXTENSION = new Map([
  [".mp3", "audio/mpeg"],
  [".wav", "audio/wav"],
  [".m4a", "audio/mp4"],
  [".pdf", "application/pdf"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"]
]);

const MAX_BYTES = 512 * 1024 * 1024;

function hasSignature(buffer, contentType) {
  if (contentType === "audio/mpeg") return buffer.subarray(0, 3).toString() === "ID3" || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0);
  if (contentType === "audio/wav") return buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WAVE";
  if (contentType === "audio/mp4") return buffer.subarray(4, 8).toString() === "ftyp";
  if (contentType === "application/pdf") return buffer.subarray(0, 5).toString() === "%PDF-";
  if (contentType === "image/png") return buffer.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"));
  if (contentType === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (contentType === "image/webp") return buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP";
  return false;
}

function allowedKind(kind, contentType) {
  return kind === "audio" ? contentType.startsWith("audio/") : kind === "score" ? contentType.startsWith("image/") || contentType === "application/pdf" : false;
}

export async function inspectMedia(filePath, { kind, maxBytes = MAX_BYTES } = {}) {
  const resolvedPath = path.resolve(filePath);
  const extension = path.extname(resolvedPath).toLowerCase();
  const contentType = MIME_BY_EXTENSION.get(extension);
  if (!contentType || !allowedKind(kind, contentType)) throw new Error(`Unsupported ${kind || "media"} format: ${extension || "none"}`);
  const bytes = await fs.readFile(resolvedPath);
  if (!bytes.length) throw new Error("Media file is empty.");
  if (bytes.length > maxBytes) throw new Error(`Media file exceeds ${maxBytes} bytes.`);
  if (!hasSignature(bytes, contentType)) throw new Error(`Media file signature does not match ${contentType}.`);
  return {
    filePath: resolvedPath,
    fileName: path.basename(resolvedPath),
    extension,
    kind,
    contentType,
    size: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    ready: true
  };
}

async function renderPdfWithPoppler(filePath) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "guitarbook-pdf-"));
  const prefix = path.join(directory, "page");
  const executable = process.platform === "win32" ? "pdftoppm.exe" : "pdftoppm";
  const result = spawnSync(executable, ["-png", "-r", "200", filePath, prefix], { stdio: "pipe" });
  if (result.error) throw new Error(`PDF renderer is unavailable: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`PDF rendering failed: ${result.stderr?.toString("utf8") || "unknown renderer error"}`);
  const files = (await fs.readdir(directory)).filter((name) => name.toLowerCase().endsWith(".png")).sort();
  if (!files.length) throw new Error("PDF renderer produced no score pages.");
  return files.map((name) => path.join(directory, name));
}

async function transcodeAudioWithFfmpeg(filePath) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "guitarbook-audio-"));
  const outputPath = path.join(directory, `${path.basename(filePath, path.extname(filePath))}.mp3`);
  const executable = process.env.GUITARBOOK_FFMPEG || (process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg");
  const result = spawnSync(executable, ["-y", "-i", filePath, "-codec:a", "libmp3lame", "-q:a", "2", outputPath], { stdio: "pipe" });
  if (result.error) throw new Error(`Audio transcoding requires ffmpeg: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`Audio transcoding failed: ${result.stderr?.toString("utf8") || "unknown ffmpeg error"}`);
  return outputPath;
}

export async function prepareMediaItems(filePath, { kind, renderPdf = renderPdfWithPoppler, transcodeAudio = transcodeAudioWithFfmpeg } = {}) {
  const source = await inspectMedia(filePath, { kind });
  if (kind === "audio" && source.contentType !== "audio/mpeg") {
    const convertedPath = await transcodeAudio(source.filePath, source);
    const converted = await inspectMedia(convertedPath, { kind: "audio" });
    return [{ ...converted, sourcePath: source.filePath, originalContentType: source.contentType }];
  }
  if (source.contentType !== "application/pdf") return [source];
  const renderedPaths = await renderPdf(source.filePath);
  if (!Array.isArray(renderedPaths) || renderedPaths.length === 0) throw new Error("PDF renderer produced no score pages.");
  return Promise.all(renderedPaths.map((pagePath) => inspectMedia(pagePath, { kind: "score" })));
}

export function buildMediaDescriptor(info, { releaseId, songId, index = 0 } = {}) {
  if (!info?.ready) throw new Error("Media must be ready before it can be published.");
  const safePart = String(info.fileName || "media")
    .replace(path.extname(info.fileName || ""), "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "media";
  const prefix = info.kind === "audio" ? "audio" : "score";
  return {
    key: `${releaseId}/${songId}/${prefix}-${String(index + 1).padStart(2, "0")}-${safePart}-${info.sha256.slice(0, 12)}${info.extension}`,
    sha256: info.sha256,
    size: info.size,
    contentType: info.contentType,
    sourcePath: info.filePath
  };
}
