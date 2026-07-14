import { loadCatalog } from "./catalog-runtime.js";

const staticData = window.GUITAR_LEVEL_DATA;
if (!staticData || !Array.isArray(staticData.levels) || !Array.isArray(staticData.songs)) {
  throw new Error("GuitarBook static catalog failed to load.");
}

const result = await loadCatalog({ staticData });
window.GUITAR_LEVEL_DATA = result.catalog;
document.documentElement.dataset.catalogSource = result.source;

await import("./app.js?v=20260714-content-runtime");

