import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

import { verifySignedRequest } from "../functions/_lib/auth.js";
import { buildNpxInvocation, createRemotePublisher } from "../admin/remote-publisher.mjs";

test("remote publisher uploads every immutable descriptor and signs one batch request", async () => {
  const uploads = [];
  let request;
  const publish = createRemotePublisher({
    siteUrl: "https://guitarbook.example",
    secret: "local-secret",
    bucket: "guitarbook-media",
    upload: async (upload) => uploads.push(upload),
    fetchImpl: async (_url, options) => {
      request = options;
      return new Response(JSON.stringify({ releaseId: "release-20260716-batch1234", songIds: ["song-a"] }), { status: 201, headers: { "content-type": "application/json" } });
    }
  });
  const result = await publish({
    payload: { releaseId: "release-20260716-batch1234", songs: [{ id: "song-a" }], media: [] },
    uploads: [{ key: "release-20260716-batch1234/song-a/audio.mp3", sourcePath: "audio.mp3", contentType: "audio/mpeg", size: 10, sha256: "a".repeat(64) }]
  });
  assert.equal(result.releaseId, "release-20260716-batch1234");
  assert.equal(uploads.length, 1);
  const verified = await verifySignedRequest({ request: new Request("https://guitarbook.example/api/admin/publish-batch", request), secret: "local-secret" });
  assert.equal(verified.payload.releaseId, "release-20260716-batch1234");
});

test("remote publisher reports a missing site URL or secret before network work", async () => {
  const publish = createRemotePublisher({ siteUrl: "", secret: "" });
  await assert.rejects(publish({ payload: {}, uploads: [] }), /site URL|secret/i);
});

test("Windows npx invocation uses cmd.exe instead of shell=true", () => {
  const invocation = buildNpxInvocation(["--version"], { platform: "win32", comSpec: "cmd.exe" });
  assert.equal(invocation.command, "cmd.exe");
  assert.deepEqual(invocation.args, ["/d", "/s", "/c", "npx.cmd", "--version"]);
  if (process.platform !== "win32") return;
  const result = spawnSync(invocation.command, invocation.args, { encoding: "utf8", windowsHide: true });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /\d+\.\d+\.\d+/);
});
