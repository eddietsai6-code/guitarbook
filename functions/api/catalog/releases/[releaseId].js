import { getReleaseManifest } from "../../../_lib/catalog.js";
import { errorResponse, jsonResponse } from "../../../_lib/http.js";

export async function onRequestGet(context) {
  try {
    const manifest = await getReleaseManifest(context.env.GUITARBOOK_DB, context.params.releaseId);
    if (!manifest) return jsonResponse({ error: "Catalog release not found." }, { status: 404 });
    return jsonResponse(manifest, {
      headers: { "cache-control": "public, max-age=31536000, immutable" }
    });
  } catch (error) {
    return errorResponse(error, 400);
  }
}

