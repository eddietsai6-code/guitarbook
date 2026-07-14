import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { buildPublishPlan } from "../scripts/publish-content.mjs";

test("buildPublishPlan compiles grade, position, hashes, and immutable R2 keys", async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "guitarbook-publisher-"));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));

  await fs.writeFile(path.join(directory, "solo.mp3"), Buffer.from("audio fixture"));
  await fs.writeFile(path.join(directory, "page.png"), Buffer.from("png fixture"));
  const manifestPath = path.join(directory, "song.json");
  await fs.writeFile(
    manifestPath,
    JSON.stringify({
      song: {
        id: "teacher-g3-new-song",
        title: "New Song",
        artist: "Teacher",
        level: "g3",
        sortOrder: 45,
        source: "Teacher Upload",
        category: "Teaching Piece",
        style: "Acoustic",
        techniques: ["fingerstyle"],
        teaching: {
          goal: "Learn it",
          focus: "Time",
          practiceOrder: ["Read", "Play"],
          commonIssues: ["Rushing"],
          passStandard: "Play steadily"
        }
      },
      audio: [{ id: "solo", title: "Solo", file: "./solo.mp3" }],
      scores: [{ title: "Page 1", file: "./page.png" }]
    })
  );

  const plan = await buildPublishPlan(manifestPath, {
    now: new Date("2026-07-14T12:00:00.000Z"),
    releaseSuffix: "abcdef123456"
  });

  assert.equal(plan.payload.song.level, "g3");
  assert.equal(plan.payload.song.sortOrder, 45);
  assert.match(plan.payload.releaseId, /^release-20260714-120000-abcdef123456$/);
  assert.equal(plan.uploads.length, 2);
  assert.equal(plan.uploads[0].contentType, "audio/mpeg");
  assert.equal(plan.uploads[1].contentType, "image/png");
  assert.ok(plan.uploads.every((item) => item.key.startsWith(`${plan.payload.releaseId}/teacher-g3-new-song/`)));
  assert.ok(plan.uploads.every((item) => /^[a-f0-9]{64}$/.test(item.sha256)));
  assert.ok(plan.payload.song.audio[0].src.startsWith("/media/"));
  assert.ok(plan.payload.song.scoreImages[0].src.startsWith("/media/"));
});

test("buildPublishPlan rejects paths outside the manifest directory", async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "guitarbook-publisher-"));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  const manifestPath = path.join(directory, "song.json");
  await fs.writeFile(
    manifestPath,
    JSON.stringify({
      song: { id: "unsafe", title: "Unsafe", artist: "Teacher", level: "g1", sortOrder: 1 },
      audio: [{ id: "solo", title: "Solo", file: "../outside.mp3" }],
      scores: []
    })
  );

  await assert.rejects(buildPublishPlan(manifestPath), /inside the manifest directory/i);
});
