import test from "node:test";
import assert from "node:assert/strict";

import { publishReleaseBatch, validatePublishBatchPayload } from "../functions/_lib/catalog.js";

function song(id, releaseId, index) {
  const audioHash = String.fromCharCode(97 + index).repeat(64);
  const key = `${releaseId}/${id}/audio-01-${audioHash.slice(0, 12)}.mp3`;
  return {
    id,
    title: `Song ${index + 1}`,
    artist: "Teacher",
    level: index ? "g4" : "g3",
    sortOrder: index,
    source: "Teacher Upload",
    category: "Solo",
    style: "Acoustic",
    techniques: [],
    audio: [{ id: "solo", title: "Solo", src: `/media/${key}` }],
    scoreImages: [],
    teaching: { goal: "Goal", focus: "Focus", practiceOrder: ["Read"], commonIssues: [], passStandard: "Play" }
  };
}

function payload() {
  const releaseId = "release-20260716-batch1234";
  const first = song("morning-sketch", releaseId, 0);
  const second = song("evening-study", releaseId, 1);
  const media = [first, second].map((item, index) => ({
    key: item.audio[0].src.slice("/media/".length),
    sha256: String.fromCharCode(97 + index).repeat(64),
    size: 100 + index,
    contentType: "audio/mpeg"
  }));
  return { releaseId, createdAt: "2026-07-16T12:00:00.000Z", songs: [first, second], media };
}

class Statement {
  constructor(sql, db) { this.sql = sql; this.db = db; this.params = []; }
  bind(...params) { this.params = params; return this; }
  async first() {
    if (this.sql.includes("publish_nonces")) return this.db.nonceUsed ? { nonce: "used" } : null;
    if (this.sql.includes("site_state")) return { value: this.db.activeReleaseId };
    return this.db.releaseExists && this.sql.includes("catalog_releases") ? { id: this.params[0] } : null;
  }
  async all() {
    if (this.sql.includes("catalog_release_songs")) return { results: this.db.previousSongs || [] };
    return { results: [] };
  }
}

class Db {
  constructor() { this.activeReleaseId = "release-old"; this.releaseExists = true; this.nonceUsed = false; this.previousSongs = []; this.batches = []; }
  prepare(sql) { return new Statement(sql, this); }
  async batch(statements) { this.batches.push(statements); return statements.map(() => ({ success: true })); }
}

test("validatePublishBatchPayload accepts audio-only songs and rejects duplicate IDs", () => {
  const valid = payload();
  assert.equal(validatePublishBatchPayload(valid).songs.length, 2);
  assert.equal(validatePublishBatchPayload(valid).songs[0].scoreImages.length, 0);
  assert.throws(() => validatePublishBatchPayload({ ...valid, songs: [valid.songs[0], valid.songs[0]] }), /duplicate.*song/i);
});

test("validatePublishBatchPayload rejects more than 45 media objects", () => {
  const value = payload();
  assert.throws(() => validatePublishBatchPayload({ ...value, media: Array.from({ length: 46 }, () => ({})) }), /45/);
});

test("publishReleaseBatch verifies every media object before one atomic D1 batch", async () => {
  const db = new Db();
  const value = payload();
  const bucket = { head: async (key) => {
    const item = value.media.find((descriptor) => descriptor.key === key);
    return item ? { size: item.size, customMetadata: { sha256: item.sha256 } } : null;
  } };
  const result = await publishReleaseBatch({ db, bucket, payload: value, nonce: "nonce-batch-123456" });
  assert.deepEqual(result.songIds, ["morning-sketch", "evening-study"]);
  assert.equal(db.batches.length, 1);
  assert.equal(db.batches[0].filter((statement) => statement.sql.includes("INSERT INTO catalog_release_songs") && statement.sql.includes("VALUES")).length, 2);
});

test("publishReleaseBatch leaves D1 untouched when one media object is missing", async () => {
  const db = new Db();
  await assert.rejects(publishReleaseBatch({ db, bucket: { head: async () => null }, payload: payload(), nonce: "nonce-batch-123457" }), /missing/i);
  assert.equal(db.batches.length, 0);
});

test("publishReleaseBatch reuses active audio without re-uploading it for score-only batches", async () => {
  const db = new Db();
  const oldAudioKey = "release-old/morning-sketch/audio-01-aaaaaaaaaaaa.mp3";
  const newReleaseId = "release-20260717-score-only";
  const scoreKey = `${newReleaseId}/morning-sketch/score-01-page-bbbbbbbbbbbb.png`;
  const previousSong = song("morning-sketch", "release-old", 0);
  previousSong.audio[0].src = `/media/${oldAudioKey}`;
  db.previousSongs = [{ song_id: previousSong.id, song_json: JSON.stringify(previousSong) }];
  const scoreSong = { ...previousSong, scoreImages: [{ title: "Page 1", src: `/media/${scoreKey}` }] };
  const payload = {
    releaseId: newReleaseId,
    createdAt: "2026-07-17T12:00:00.000Z",
    reuseExistingAudio: true,
    songs: [scoreSong],
    media: [{ key: scoreKey, sha256: "b".repeat(64), size: 200, contentType: "image/png" }]
  };
  const headed = [];
  const result = await publishReleaseBatch({
    db,
    bucket: { head: async (key) => { headed.push(key); return { size: 200, customMetadata: { sha256: "b".repeat(64) } }; } },
    payload,
    nonce: "nonce-score-only-123456"
  });
  assert.equal(result.releaseId, newReleaseId);
  assert.deepEqual(headed, [scoreKey]);
  assert.equal(db.batches.length, 1);
  const songInsert = db.batches[0].find((statement) => statement.sql.includes("INSERT INTO catalog_release_songs") && statement.sql.includes("VALUES"));
  assert.match(songInsert.params[4], new RegExp(oldAudioKey));
  assert.match(songInsert.params[4], new RegExp(scoreKey));
});

test("publishReleaseBatch rejects changed audio in score-only reuse mode", async () => {
  const db = new Db();
  const previousSong = song("morning-sketch", "release-old", 0);
  db.previousSongs = [{ song_id: previousSong.id, song_json: JSON.stringify(previousSong) }];
  const scoreKey = "release-20260717-score-only/morning-sketch/score-01-page-bbbbbbbbbbbb.png";
  const changedSong = { ...previousSong, audio: [{ ...previousSong.audio[0], src: "/media/release-old/morning-sketch/audio-01-cccccccccccc.mp3" }], scoreImages: [{ title: "Page 1", src: `/media/${scoreKey}` }] };
  await assert.rejects(
    publishReleaseBatch({
      db,
      bucket: { head: async () => ({ size: 200, customMetadata: { sha256: "b".repeat(64) } }) },
      payload: { releaseId: "release-20260717-score-only-2", createdAt: "2026-07-17T12:00:00.000Z", reuseExistingAudio: true, songs: [changedSong], media: [{ key: scoreKey, sha256: "b".repeat(64), size: 200, contentType: "image/png" }] },
      nonce: "nonce-score-only-123457"
    }),
    /cannot change audio/i
  );
  assert.equal(db.batches.length, 0);
});
