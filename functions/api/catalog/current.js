import { getCurrentRelease } from "../../_lib/catalog.js";
import { errorResponse, jsonResponse } from "../../_lib/http.js";

export async function onRequestGet(context) {
  try {
    const result = await getCurrentRelease(context.env.GUITARBOOK_DB);
    return jsonResponse(result, {
      headers: { "cache-control": "no-store" }
    });
  } catch (error) {
    return errorResponse(error, 503);
  }
}

