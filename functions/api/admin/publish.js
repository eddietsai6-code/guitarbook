import { verifySignedRequest } from "../../_lib/auth.js";
import { publishRelease } from "../../_lib/catalog.js";
import { errorResponse, jsonResponse } from "../../_lib/http.js";

export async function onRequestPost(context) {
  try {
    const verified = await verifySignedRequest({
      request: context.request,
      secret: context.env.CONTENT_PUBLISH_SECRET
    });
    const result = await publishRelease({
      db: context.env.GUITARBOOK_DB,
      bucket: context.env.GUITARBOOK_MEDIA,
      payload: verified.payload,
      nonce: verified.nonce
    });
    return jsonResponse(result, { status: 201, headers: { "cache-control": "no-store" } });
  } catch (error) {
    return errorResponse(error, 400);
  }
}

