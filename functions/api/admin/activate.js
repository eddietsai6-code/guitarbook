import { verifySignedRequest } from "../../_lib/auth.js";
import { activateRelease } from "../../_lib/catalog.js";
import { errorResponse, jsonResponse } from "../../_lib/http.js";

export async function onRequestPost(context) {
  try {
    const verified = await verifySignedRequest({
      request: context.request,
      secret: context.env.CONTENT_PUBLISH_SECRET
    });
    const result = await activateRelease({
      db: context.env.GUITARBOOK_DB,
      releaseId: verified.payload?.releaseId,
      nonce: verified.nonce
    });
    return jsonResponse(result, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return errorResponse(error, 400);
  }
}
