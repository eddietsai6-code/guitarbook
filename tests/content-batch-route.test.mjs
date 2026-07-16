import test from "node:test";
import assert from "node:assert/strict";

import { onRequestPost } from "../functions/api/admin/publish-batch.js";

test("publish-batch rejects an unauthenticated request before using bindings", async () => {
  const response = await onRequestPost({
    request: new Request("https://guitarbook.example/api/admin/publish-batch", { method: "POST", body: "{}" }),
    env: {}
  });
  assert.equal(response.status, 400);
  assert.match(await response.text(), /timestamp|expired|invalid/i);
});
