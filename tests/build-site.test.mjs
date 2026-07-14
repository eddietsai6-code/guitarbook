import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { buildSite } from "../scripts/build-site.mjs";

test("buildSite emits only the public static surface", async (context) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "guitarbook-build-"));
  context.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, "assets"));
  await fs.mkdir(path.join(root, "scores"));
  await fs.mkdir(path.join(root, "tests"));
  await fs.writeFile(path.join(root, "index.html"), "<h1>GuitarBook</h1>");
  await fs.writeFile(path.join(root, "_routes.json"), "{}");
  await fs.writeFile(path.join(root, "assets", "app.js"), "console.log('app')");
  await fs.writeFile(path.join(root, "scores", "page.png"), "png");
  await fs.writeFile(path.join(root, "README.md"), "private build notes");
  await fs.writeFile(path.join(root, "tests", "site.test.js"), "test");
  await fs.writeFile(path.join(root, "source.pdf"), "pdf");

  const outputRoot = path.join(root, "dist");
  const result = await buildSite({ sourceRoot: root, outputRoot });
  const topLevel = (await fs.readdir(outputRoot)).sort();

  assert.deepEqual(topLevel, ["_routes.json", "assets", "index.html", "scores"]);
  assert.equal(result.fileCount, 4);
  assert.equal(await fs.readFile(path.join(outputRoot, "index.html"), "utf8"), "<h1>GuitarBook</h1>");
  await assert.rejects(fs.access(path.join(outputRoot, "README.md")));
  await assert.rejects(fs.access(path.join(outputRoot, "source.pdf")));
});
