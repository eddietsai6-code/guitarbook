import test from "node:test";
import assert from "node:assert/strict";

import {
  activateRelease,
  publishRelease,
  validatePublishPayload
} from "../functions/_lib/catalog.js";
import { createSignature, verifySignedRequest } from "../functions/_lib/auth.js";

class FakeStatement {
  constructor(sql, db) {
    this.sql = sql;
    this.db = db;
    this.params = [];
  }

  bind(...params) {
    this.params = params;
    return this;
  }

  async first() {
    if (this.sql.includes("publish_nonces")) return this.db.nonceExists ? { nonce: "used" } : null;
    if (this.sql.includes("site_state")) return this.db.activeReleaseId ? { value: this.db.activeReleaseId } : null;
    if (this.sql.includes("catalog_releases")) return this.db.releaseExists ? { id: this.params[0] } : null;
    return null;
  }
}

class FakeDb {
  constructor() {
    this.activeReleaseId = "release-old";
    this.releaseExists = true;
    this.nonceExists = false;
    this.batches = [];
  }

  prepare(sql) {
    return new FakeStatement(sql, this);
  }

  async batch(statements) {
    this.batches.push(statements.map((statement) => ({ sql: statement.sql, params: statement.params })));
    return statements.map(() => ({ success: true }));
  }
}

function validPayload() {
  const releaseId = "release-20260714-abcdef123456";
  const songId = "teacher-g3-new-song";
  const audioHash = "a".repeat(64);
  const scoreHash = "b".repeat(64);
  const audioKey = `${releaseId}/${songId}/audio-01-solo-${audioHash.slice(0, 12)}.mp3`;
  const scoreKey = `${releaseId}/${songId}/score-01-page-${scoreHash.slice(0, 12)}.png`;
  return {
    releaseId,
    createdAt: "2026-07-14T12:00:00.000Z",
    song: {
      id: songId,
      title: "New Song",
      artist: "Teacher",
      level: "g3",
      sortOrder: 30,
      source: "Teacher Upload",
      category: "Teaching Piece",
      style: "Acoustic",
      techniques: ["fingerstyle"],
      audio: [{ id: "solo", title: "Solo", src: `/media/${audioKey}` }],
      scoreImages: [{ title: "Page 1", src: `/media/${scoreKey}` }],
      teaching: {
        goal: "Learn it",
        focus: "Time",
        practiceOrder: ["Read", "Play"],
        commonIssues: ["Rushing"],
        passStandard: "Play steadily"
      }
    },
    media: [
      {
        key: audioKey,
        sha256: audioHash,
        size: 1200,
        contentType: "audio/mpeg"
      },
      {
        key: scoreKey,
        sha256: scoreHash,
        size: 2300,
        contentType: "image/png"
      }
    ]
  };
}

test("validatePublishPayload accepts grade and explicit position but rejects unsafe paths", () => {
  const payload = validPayload();
  assert.equal(validatePublishPayload(payload).song.level, "g3");
  assert.equal(validatePublishPayload(payload).song.sortOrder, 30);

  assert.throws(
    () => validatePublishPayload({ ...payload, song: { ...payload.song, level: "grade-99" } }),
    /level/i
  );
  assert.throws(
    () => validatePublishPayload({ ...payload, media: [{ ...payload.media[0], key: "C:/private/song.mp3" }] }),
    /key/i
  );
  const wrongHashKey = payload.media[0].key.replace("aaaaaaaaaaaa", "cccccccccccc");
  assert.throws(
    () => validatePublishPayload({
      ...payload,
      song: { ...payload.song, audio: [{ ...payload.song.audio[0], src: `/media/${wrongHashKey}` }] },
      media: [{ ...payload.media[0], key: wrongHashKey }, payload.media[1]]
    }),
    /hash/i
  );
});

test("signed requests enforce timestamp and signature", async () => {
  const secret = "test-secret-value";
  const body = JSON.stringify(validPayload());
  const timestamp = String(Date.now());
  const nonce = "nonce-1234567890";
  const signature = await createSignature({ secret, timestamp, nonce, body });

  const verified = await verifySignedRequest({
    secret,
    request: new Request("https://example.test/api/admin/publish", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-guitarbook-timestamp": timestamp,
        "x-guitarbook-nonce": nonce,
        "x-guitarbook-signature": signature
      },
      body
    }),
    now: Number(timestamp)
  });

  assert.equal(verified.nonce, nonce);
  assert.deepEqual(verified.payload, validPayload());
});

test("publishRelease verifies R2 media before committing one atomic D1 batch", async () => {
  const db = new FakeDb();
  const payload = validPayload();
  const bucket = {
    async head(key) {
      const descriptor = payload.media.find((item) => item.key === key);
      return descriptor ? { size: descriptor.size, customMetadata: { sha256: descriptor.sha256 } } : null;
    }
  };

  const result = await publishRelease({ db, bucket, payload, nonce: "nonce-1234567890" });

  assert.equal(result.releaseId, payload.releaseId);
  assert.equal(result.previousReleaseId, "release-old");
  assert.equal(db.batches.length, 1);
  assert.ok(db.batches[0].some((entry) => entry.sql.includes("INSERT INTO catalog_release_songs") && entry.sql.includes("SELECT")));
  assert.ok(db.batches[0].some((entry) => entry.sql.includes("site_state")));
});

test("publishRelease refuses to switch D1 when an R2 object is missing", async () => {
  const db = new FakeDb();

  await assert.rejects(
    publishRelease({ db, bucket: { head: async () => null }, payload: validPayload(), nonce: "nonce-1234567890" }),
    /missing/i
  );
  assert.equal(db.batches.length, 0);
});

test("activateRelease records a rollback as one atomic pointer update", async () => {
  const db = new FakeDb();
  const result = await activateRelease({ db, releaseId: "release-target-20260714", nonce: "nonce-rollback-1" });

  assert.equal(result.releaseId, "release-target-20260714");
  assert.equal(result.previousReleaseId, "release-old");
  assert.equal(db.batches.length, 1);
  assert.ok(db.batches[0].some((entry) => entry.sql.includes("site_state")));
});
