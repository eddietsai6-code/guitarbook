import { randomBytes } from "node:crypto";

import { validatePublishBatchPayload } from "../functions/_lib/catalog.js";
import { buildMediaDescriptor, prepareMediaItems } from "./media.mjs";

function compactTimestamp(date) {
  return date.toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
}

function publishSong(song) {
  if (song.status === "trash") return false;
  if (!song.teaching?.goal || !song.teaching?.focus || !song.teaching?.passStandard || !song.teaching?.practiceOrder?.length) {
    throw new Error(`Song ${song.title || song.id} is missing required teaching content.`);
  }
  if (!Array.isArray(song.audio) || song.audio.length === 0) throw new Error(`Song ${song.title || song.id} needs at least one audio version.`);
  if (!Array.isArray(song.scoreImages)) throw new Error(`Song ${song.title || song.id} scoreImages must be an array.`);
  return true;
}

async function compileItems(items, kind, releaseId, songId) {
  const records = [];
  const uploads = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const infos = await prepareMediaItems(item.filePath || item.sourcePath, { kind });
    for (let pageIndex = 0; pageIndex < infos.length; pageIndex += 1) {
      const info = infos[pageIndex];
      const descriptor = buildMediaDescriptor(info, { releaseId, songId, index: uploads.length });
      uploads.push(descriptor);
      records.push({
        ...(kind === "audio" ? { id: String(item.id || `audio-${index + 1}`) } : {}),
        title: String(item.title || `${kind === "audio" ? "Audio" : "Page"} ${index + pageIndex + 1}`),
        src: `/media/${descriptor.key}`
      });
    }
  }
  return { records, uploads };
}

export async function buildWorkspacePublishPlan(workspace, options = {}) {
  const now = options.now || new Date();
  const suffix = String(options.releaseSuffix || randomBytes(6).toString("hex"));
  const releaseId = `release-${compactTimestamp(now)}-${suffix}`;
  const sourceSongs = (workspace?.songs || []).filter(publishSong);
  if (!sourceSongs.length) throw new Error("There are no publishable songs in the workspace.");

  const songs = [];
  const uploads = [];
  for (const sourceSong of sourceSongs) {
    const audio = await compileItems(sourceSong.audio, "audio", releaseId, sourceSong.id);
    const scores = await compileItems(sourceSong.scoreImages, "score", releaseId, sourceSong.id);
    uploads.push(...audio.uploads, ...scores.uploads);
    songs.push({
      ...sourceSong,
      audio: audio.records,
      scoreImages: scores.records,
      status: undefined,
      createdAt: undefined,
      updatedAt: undefined,
      firstPublishedAt: undefined,
      lastPublishedAt: undefined
    });
  }

  const payload = validatePublishBatchPayload({
    releaseId,
    createdAt: now.toISOString(),
    songs,
    media: uploads.map(({ key, sha256, size, contentType }) => ({ key, sha256, size, contentType }))
  });
  return { payload, uploads };
}
