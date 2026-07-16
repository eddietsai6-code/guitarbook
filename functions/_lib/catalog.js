const LEVEL_IDS = new Set(["debut", "g1", "g2", "g3", "g4", "g5", "g6", "g7", "g8"]);
const RELEASE_ID_PATTERN = /^release-[a-z0-9-]{8,96}$/;
const SONG_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_BATCH_MEDIA = 45;

function requiredText(value, field, maxLength = 500) {
  const text = String(value || "").trim();
  if (!text) throw new Error(`${field} is required.`);
  if (text.length > maxLength) throw new Error(`${field} is too long.`);
  return text;
}

function validateStringArray(value, field, maxItems = 50) {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array.`);
  if (value.length > maxItems) throw new Error(`${field} has too many items.`);
  return value.map((item, index) => requiredText(item, `${field}[${index}]`));
}

function validateMediaKey(value) {
  const key = requiredText(value, "media key", 900);
  if (
    key.startsWith("/") ||
    key.includes("\\") ||
    key.includes(":") ||
    key.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error(`Media key is unsafe: ${key}`);
  }
  return key;
}

function validateSongMedia(items, field) {
  if (!Array.isArray(items)) throw new Error(`song.${field} must be an array.`);
  return items.map((item, index) => {
    const src = requiredText(item?.src, `song.${field}[${index}].src`, 1000);
    if (!src.startsWith("/media/")) throw new Error(`song.${field}[${index}].src must use /media/.`);
    validateMediaKey(src.slice("/media/".length));
    return {
      ...item,
      id: item.id ? requiredText(item.id, `song.${field}[${index}].id`, 100) : `${field}-${index + 1}`,
      title: requiredText(item.title, `song.${field}[${index}].title`, 200),
      src
    };
  });
}

function validateSong(song) {
  if (!song || typeof song !== "object" || Array.isArray(song)) throw new Error("song must be an object.");
  const id = requiredText(song.id, "song.id", 160);
  if (!SONG_ID_PATTERN.test(id)) throw new Error("song.id must be a lowercase URL-safe slug.");
  const level = requiredText(song.level, "song.level", 20);
  if (!LEVEL_IDS.has(level)) throw new Error(`song.level is invalid: ${level}`);
  const sortOrder = Number(song.sortOrder);
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 1000000) {
    throw new Error("song.sortOrder must be an integer between 0 and 1000000.");
  }
  const teachingInput = song.teaching || {};
  const teaching = {
    goal: requiredText(teachingInput.goal, "song.teaching.goal"),
    focus: requiredText(teachingInput.focus, "song.teaching.focus"),
    practiceOrder: validateStringArray(teachingInput.practiceOrder, "song.teaching.practiceOrder"),
    commonIssues: validateStringArray(teachingInput.commonIssues, "song.teaching.commonIssues"),
    passStandard: requiredText(teachingInput.passStandard, "song.teaching.passStandard")
  };

  const audio = validateSongMedia(song.audio || [], "audio");
  if (audio.length === 0) throw new Error("song.audio must contain at least one item.");
  const scoreImages = validateSongMedia(song.scoreImages || [], "scoreImages");

  return {
    ...song,
    id,
    title: requiredText(song.title, "song.title", 200),
    artist: requiredText(song.artist, "song.artist", 200),
    level,
    sortOrder,
    source: requiredText(song.source || "Teacher Upload", "song.source", 200),
    category: requiredText(song.category || "Teaching Piece", "song.category", 200),
    style: requiredText(song.style || "Acoustic Guitar", "song.style", 200),
    techniques: validateStringArray(song.techniques || [], "song.techniques"),
    audio,
    scoreImages,
    teaching
  };
}

function validateMediaDescriptors(items, releaseId, songs, { existingMediaKeys = new Set() } = {}) {
  if (!Array.isArray(items) || items.length === 0) throw new Error("media must contain at least one object.");
  if (items.length > MAX_BATCH_MEDIA) throw new Error(`media cannot exceed ${MAX_BATCH_MEDIA} objects per batch.`);
  const media = items.map((item, index) => {
    const size = Number(item?.size);
    if (!Number.isInteger(size) || size <= 0) throw new Error(`media[${index}].size must be a positive integer.`);
    const sha256 = requiredText(item.sha256, `media[${index}].sha256`, 64).toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(sha256)) throw new Error(`media[${index}].sha256 is invalid.`);
    const contentType = requiredText(item.contentType, `media[${index}].contentType`, 100).toLowerCase();
    if (!new Set(["audio/mpeg", "image/png", "image/jpeg", "image/webp"]).has(contentType)) {
      throw new Error(`media[${index}].contentType is not allowed.`);
    }
    const key = validateMediaKey(item.key);
    const owningSong = songs.find((song) => key.startsWith(`${releaseId}/${song.id}/`));
    if (!owningSong) throw new Error(`media[${index}].key must stay inside a published song prefix.`);
    if (!key.split("/").at(-1).includes(sha256.slice(0, 12))) {
      throw new Error(`media[${index}].key must contain its SHA-256 hash prefix.`);
    }
    return { key, size, sha256, contentType };
  });
  const keys = new Set();
  for (const item of media) {
    if (keys.has(item.key)) throw new Error(`media key is duplicated: ${item.key}`);
    keys.add(item.key);
  }
  for (const song of songs) {
    for (const item of [...song.audio, ...song.scoreImages]) {
      const mediaKey = item.src.slice("/media/".length);
      if (!keys.has(mediaKey) && !existingMediaKeys.has(mediaKey)) {
        throw new Error(`Song media URL is not declared in media: ${item.src}`);
      }
    }
  }
  return media;
}

export function validatePublishBatchPayload(payload, options = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Publish payload must be an object.");
  const releaseId = requiredText(payload.releaseId, "releaseId", 120);
  if (!RELEASE_ID_PATTERN.test(releaseId)) throw new Error("releaseId is invalid.");
  const createdAt = requiredText(payload.createdAt, "createdAt", 40);
  if (!Number.isFinite(Date.parse(createdAt))) throw new Error("createdAt must be an ISO timestamp.");
  if (!Array.isArray(payload.songs) || payload.songs.length === 0) throw new Error("songs must contain at least one object.");
  const songs = payload.songs.map(validateSong);
  const songIds = new Set();
  for (const song of songs) {
    if (songIds.has(song.id)) throw new Error(`duplicate song id: ${song.id}`);
    songIds.add(song.id);
  }
  const media = validateMediaDescriptors(payload.media, releaseId, songs, options);
  return { releaseId, createdAt: new Date(createdAt).toISOString(), songs, media };
}

export function validatePublishPayload(payload) {
  const batch = validatePublishBatchPayload({ ...payload, songs: [payload?.song] });
  return { releaseId: batch.releaseId, createdAt: batch.createdAt, song: batch.songs[0], media: batch.media };
}

async function activeReleaseId(db) {
  const row = await db.prepare("SELECT value FROM site_state WHERE key = 'active_release_id'").first();
  return row?.value || null;
}

async function assertUnusedNonce(db, nonce) {
  const existing = await db.prepare("SELECT nonce FROM publish_nonces WHERE nonce = ?").bind(nonce).first();
  if (existing) throw new Error("Publish request nonce has already been used.");
}

async function verifyMediaObjects(bucket, media) {
  for (const descriptor of media) {
    const object = await bucket.head(descriptor.key);
    if (!object) throw new Error(`R2 media object is missing: ${descriptor.key}`);
    if (Number(object.size) !== descriptor.size) throw new Error(`R2 media size does not match: ${descriptor.key}`);
    const storedHash = object.customMetadata?.sha256;
    if (storedHash && storedHash.toLowerCase() !== descriptor.sha256) {
      throw new Error(`R2 media hash does not match: ${descriptor.key}`);
    }
  }
}

export async function publishReleaseBatch({ db, bucket, payload: input, nonce }) {
  if (!db || !bucket) throw new Error("Cloudflare content bindings are not configured.");
  const previousReleaseId = await activeReleaseId(db);
  let existingMediaKeys = new Set();
  let previousSongs = new Map();
  if (input?.reuseExistingAudio) {
    if (!previousReleaseId) throw new Error("Score-only reuse requires an active release.");
    if (!Array.isArray(input.media) || input.media.some((item) => item?.contentType !== "image/png")) {
      throw new Error("Score-only reuse accepts image/png media only.");
    }
    const previousResult = await db.prepare(
      "SELECT song_id, song_json FROM catalog_release_songs WHERE release_id = ?"
    ).bind(previousReleaseId).all();
    previousSongs = new Map((previousResult.results || []).map((row) => [row.song_id, JSON.parse(row.song_json)]));
    for (const song of input.songs || []) {
      const previousSong = previousSongs.get(song?.id);
      if (!previousSong) throw new Error(`Score-only reuse song is not in the active release: ${song?.id || "unknown"}`);
      if (!Array.isArray(song.scoreImages) || song.scoreImages.length === 0) {
        throw new Error(`Score-only reuse requires scoreImages: ${song.id}`);
      }
      const incomingAudio = JSON.stringify((song.audio || []).map(({ id, title, src }) => ({ id, title, src })));
      const previousAudio = JSON.stringify((previousSong.audio || []).map(({ id, title, src }) => ({ id, title, src })));
      if (incomingAudio !== previousAudio) throw new Error(`Score-only reuse cannot change audio: ${song.id}`);
      for (const item of previousSong.audio || []) existingMediaKeys.add(String(item.src || "").slice("/media/".length));
    }
  }
  const payload = validatePublishBatchPayload(input, { existingMediaKeys });
  await assertUnusedNonce(db, nonce);
  await verifyMediaObjects(bucket, payload.media);

  const statements = [
    db.prepare("INSERT INTO catalog_releases (id, created_at, published_at) VALUES (?, ?, ?)")
      .bind(payload.releaseId, payload.createdAt, new Date().toISOString())
  ];
  if (previousReleaseId) {
    statements.push(
      db.prepare(
        "INSERT INTO catalog_release_songs (release_id, song_id, level_id, sort_order, song_json) " +
          "SELECT ?, song_id, level_id, sort_order, song_json FROM catalog_release_songs WHERE release_id = ?"
      ).bind(payload.releaseId, previousReleaseId)
    );
  }
  for (const song of payload.songs) {
    statements.push(
      db.prepare("DELETE FROM catalog_release_songs WHERE release_id = ? AND song_id = ?")
        .bind(payload.releaseId, song.id),
      db.prepare(
        "INSERT INTO catalog_release_songs (release_id, song_id, level_id, sort_order, song_json) VALUES (?, ?, ?, ?, ?)"
      ).bind(payload.releaseId, song.id, song.level, song.sortOrder, JSON.stringify(song))
    );
  }
  statements.push(
    db.prepare(
      "INSERT INTO site_state (key, value, updated_at) VALUES ('active_release_id', ?, ?) " +
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
    ).bind(payload.releaseId, new Date().toISOString()),
    db.prepare("INSERT INTO publish_nonces (nonce, used_at) VALUES (?, ?)")
      .bind(nonce, new Date().toISOString())
  );
  await db.batch(statements);
  return { releaseId: payload.releaseId, previousReleaseId, songIds: payload.songs.map((song) => song.id) };
}

export async function publishRelease({ db, bucket, payload: input, nonce }) {
  const result = await publishReleaseBatch({ db, bucket, payload: { ...input, songs: [input?.song] }, nonce });
  return { ...result, songId: result.songIds[0] };
}

export async function activateRelease({ db, releaseId, nonce }) {
  if (!RELEASE_ID_PATTERN.test(String(releaseId || ""))) throw new Error("releaseId is invalid.");
  await assertUnusedNonce(db, nonce);
  const existing = await db.prepare("SELECT id FROM catalog_releases WHERE id = ?").bind(releaseId).first();
  if (!existing) throw new Error(`Catalog release does not exist: ${releaseId}`);
  const previousReleaseId = await activeReleaseId(db);
  await db.batch([
    db.prepare(
      "INSERT INTO site_state (key, value, updated_at) VALUES ('active_release_id', ?, ?) " +
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
    ).bind(releaseId, new Date().toISOString()),
    db.prepare("INSERT INTO publish_nonces (nonce, used_at) VALUES (?, ?)")
      .bind(nonce, new Date().toISOString())
  ]);
  return { releaseId, previousReleaseId };
}

export async function getCurrentRelease(db) {
  const releaseId = await activeReleaseId(db);
  return releaseId ? { releaseId, manifestUrl: `/api/catalog/releases/${encodeURIComponent(releaseId)}` } : { releaseId: null, manifestUrl: null };
}

export async function getReleaseManifest(db, releaseId) {
  if (!RELEASE_ID_PATTERN.test(String(releaseId || ""))) throw new Error("releaseId is invalid.");
  const release = await db.prepare("SELECT id, created_at, published_at FROM catalog_releases WHERE id = ?")
    .bind(releaseId)
    .first();
  if (!release) return null;
  const result = await db.prepare(
    "SELECT song_json FROM catalog_release_songs WHERE release_id = ? " +
      "ORDER BY CASE level_id WHEN 'debut' THEN 0 WHEN 'g1' THEN 1 WHEN 'g2' THEN 2 WHEN 'g3' THEN 3 " +
      "WHEN 'g4' THEN 4 WHEN 'g5' THEN 5 WHEN 'g6' THEN 6 WHEN 'g7' THEN 7 WHEN 'g8' THEN 8 ELSE 99 END, sort_order, song_id"
  ).bind(releaseId).all();
  return {
    releaseId: release.id,
    createdAt: release.created_at,
    publishedAt: release.published_at,
    songs: (result.results || []).map((row) => JSON.parse(row.song_json))
  };
}
