import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { buildWorkspacePublishPlan } from "../admin/publisher.mjs";

test("workspace publisher builds an audio-only immutable batch", async (context) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "guitarbook-admin-publisher-"));
  context.after(() => fs.rm(directory, { recursive: true, force: true }));
  const audioPath = path.join(directory, "solo.mp3");
  await fs.writeFile(audioPath, Buffer.concat([Buffer.from("ID3"), Buffer.alloc(10)]));

  const workspace = {
    songs: [{
      id: "morning-sketch",
      title: "Morning Sketch",
      artist: "Teacher",
      slug: "morning-sketch",
      level: "g3",
      sortOrder: 20,
      source: "Teacher Upload",
      category: "Solo",
      style: "Acoustic",
      techniques: ["fingerstyle"],
      teaching: { goal: "Learn the melody", focus: "Steady pulse", practiceOrder: ["Read", "Loop"], commonIssues: ["Rushing"], passStandard: "Play through" },
      audio: [{ id: "solo", title: "Solo", filePath: audioPath, kind: "audio" }],
      scoreImages: [],
      status: "draft"
    }]
  };

  const plan = await buildWorkspacePublishPlan(workspace, { now: new Date("2026-07-16T12:00:00.000Z"), releaseSuffix: "batch1234" });
  assert.match(plan.payload.releaseId, /^release-20260716-120000-batch1234$/);
  assert.equal(plan.payload.songs.length, 1);
  assert.equal(plan.payload.media.length, 1);
  assert.equal(plan.uploads.length, 1);
  assert.match(plan.payload.songs[0].audio[0].src, /^\/media\/release-20260716-120000-batch1234\//);
  assert.deepEqual(plan.payload.songs[0].scoreImages, []);
});

test("workspace publisher blocks a draft with missing teaching content or audio", async () => {
  await assert.rejects(
    buildWorkspacePublishPlan({ songs: [{ id: "unfinished", title: "Unfinished", artist: "Teacher", level: "g1", status: "draft", teaching: {}, audio: [], scoreImages: [] }] }),
    /teaching|audio/i
  );
});
