import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PUBLIC_ENTRIES = ["index.html", "assets", "scores", "_routes.json"];
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function countFiles(directory) {
  let count = 0;
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    count += entry.isDirectory() ? await countFiles(entryPath) : 1;
  }
  return count;
}

async function assertNoForbiddenFiles(directory) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await assertNoForbiddenFiles(entryPath);
    } else if (/\.(?:pdf|tmp|log)$/i.test(entry.name)) {
      throw new Error(`Forbidden file entered the public build: ${entryPath}`);
    }
  }
}

export async function buildSite({ sourceRoot = projectRoot, outputRoot = path.join(sourceRoot, "dist") } = {}) {
  const resolvedSource = path.resolve(sourceRoot);
  const resolvedOutput = path.resolve(outputRoot);
  if (resolvedOutput === resolvedSource || !resolvedOutput.startsWith(`${resolvedSource}${path.sep}`)) {
    throw new Error("Build output must be a child of the project root.");
  }

  await fs.rm(resolvedOutput, { recursive: true, force: true });
  await fs.mkdir(resolvedOutput, { recursive: true });
  for (const entry of PUBLIC_ENTRIES) {
    await fs.cp(path.join(resolvedSource, entry), path.join(resolvedOutput, entry), { recursive: true, force: true });
  }
  await assertNoForbiddenFiles(resolvedOutput);
  return { outputRoot: resolvedOutput, fileCount: await countFiles(resolvedOutput) };
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  buildSite()
    .then((result) => console.log(`Built ${result.fileCount} public files in ${result.outputRoot}.`))
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}

