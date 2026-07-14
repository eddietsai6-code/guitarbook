import test from "node:test";
import assert from "node:assert/strict";

import {
  CATALOG_CACHE_KEY,
  compareCatalogSongs,
  loadCatalog,
  mergeCatalog
} from "../assets/catalog-runtime.js";

function staticCatalog() {
  return {
    levels: [
      { id: "debut", label: "Debut", order: 0 },
      { id: "g3", label: "Grade 3", order: 3 }
    ],
    songs: [
      { id: "static-b", title: "B", artist: "Artist", level: "g3", audio: [], scoreImages: [] },
      { id: "static-a", title: "A", artist: "Artist", level: "g3", audio: [], scoreImages: [] }
    ]
  };
}

function dynamicSong(overrides = {}) {
  return {
    id: "dynamic-song",
    title: "Dynamic Song",
    artist: "Teacher",
    level: "g3",
    sortOrder: 20,
    source: "Teacher Upload",
    category: "Teaching Piece",
    style: "Acoustic",
    techniques: ["fingerstyle"],
    audio: [{ id: "solo", title: "Solo", src: "/media/releases/r2/solo.mp3" }],
    scoreImages: [{ title: "Page 1", src: "/media/releases/r2/score-01.png" }],
    teaching: {
      goal: "Learn the piece",
      focus: "Steady pulse",
      practiceOrder: ["Read", "Play"],
      commonIssues: ["Rushing"],
      passStandard: "Play steadily"
    },
    ...overrides
  };
}

function memoryStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    }
  };
}

test("mergeCatalog keeps static order and appends dynamic songs by assigned position", () => {
  const merged = mergeCatalog(staticCatalog(), {
    releaseId: "release-2",
    songs: [dynamicSong({ id: "later", sortOrder: 90 }), dynamicSong({ id: "earlier", sortOrder: 10 })]
  });

  assert.deepEqual(
    merged.songs.filter((song) => song.level === "g3").sort(compareCatalogSongs).map((song) => song.id),
    ["static-b", "static-a", "earlier", "later"]
  );
  assert.equal(merged.releaseId, "release-2");
  assert.equal(merged.songs.find((song) => song.id === "earlier").catalogOrigin, "dynamic");
});

test("mergeCatalog protects static songs from a dynamic id collision", () => {
  const merged = mergeCatalog(staticCatalog(), {
    releaseId: "release-3",
    songs: [dynamicSong({ id: "static-a", title: "Replacement" })]
  });

  assert.equal(merged.songs.filter((song) => song.id === "static-a").length, 1);
  assert.equal(merged.songs.find((song) => song.id === "static-a").title, "A");
});

test("loadCatalog resolves the active immutable release and caches it", async () => {
  const storage = memoryStorage();
  const requests = [];
  const fetchImpl = async (url) => {
    requests.push(url);
    if (url === "/api/catalog/current") {
      return Response.json({ releaseId: "release-4", manifestUrl: "/api/catalog/releases/release-4" });
    }
    return Response.json({ releaseId: "release-4", songs: [dynamicSong()] });
  };

  const result = await loadCatalog({ staticData: staticCatalog(), fetchImpl, storage });

  assert.deepEqual(requests, ["/api/catalog/current", "/api/catalog/releases/release-4"]);
  assert.equal(result.source, "network");
  assert.equal(result.catalog.songs.length, 3);
  assert.equal(JSON.parse(storage.getItem(CATALOG_CACHE_KEY)).releaseId, "release-4");
});

test("loadCatalog uses the last valid manifest when the API is unavailable", async () => {
  const storage = memoryStorage({
    [CATALOG_CACHE_KEY]: JSON.stringify({ releaseId: "cached-release", songs: [dynamicSong({ id: "cached" })] })
  });

  const result = await loadCatalog({
    staticData: staticCatalog(),
    storage,
    fetchImpl: async () => {
      throw new Error("offline");
    }
  });

  assert.equal(result.source, "cache");
  assert.equal(result.catalog.songs.at(-1).id, "cached");
});

test("loadCatalog leaves the static catalog usable when network and cache are unavailable", async () => {
  const result = await loadCatalog({
    staticData: staticCatalog(),
    storage: memoryStorage(),
    fetchImpl: async () => new Response("unavailable", { status: 503 })
  });

  assert.equal(result.source, "static");
  assert.deepEqual(result.catalog.songs.map((song) => song.id), ["static-b", "static-a"]);
});

