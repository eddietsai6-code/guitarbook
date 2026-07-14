function mediaKey(context) {
  const segments = Array.isArray(context.params.path) ? context.params.path : [context.params.path];
  if (!segments.length || segments.some((part) => !part || part === "." || part === ".." || String(part).includes("\\"))) {
    throw new Error("Media path is invalid.");
  }
  return segments.map((part) => String(part)).join("/");
}

function fallbackContentType(key) {
  if (key.endsWith(".mp3")) return "audio/mpeg";
  if (key.endsWith(".png")) return "image/png";
  if (/\.jpe?g$/i.test(key)) return "image/jpeg";
  if (key.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

function objectHeaders(object, key) {
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("content-type", headers.get("content-type") || fallbackContentType(key));
  headers.set("etag", object.httpEtag);
  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("x-content-type-options", "nosniff");
  if (object.range) {
    const offset = object.range.offset || 0;
    const length = object.range.length || object.size;
    headers.set("content-length", String(length));
    headers.set("content-range", `bytes ${offset}-${offset + length - 1}/${object.size}`);
  } else {
    headers.set("content-length", String(object.size));
  }
  return headers;
}

export async function onRequestGet(context) {
  try {
    const key = mediaKey(context);
    const range = context.request.headers.get("range");
    const object = await context.env.GUITARBOOK_MEDIA.get(key, range ? { range: context.request.headers } : undefined);
    if (!object) return new Response("Not found", { status: 404 });
    return new Response(object.body, {
      status: object.range ? 206 : 200,
      headers: objectHeaders(object, key)
    });
  } catch {
    return new Response("Invalid media request", { status: 400 });
  }
}

export async function onRequestHead(context) {
  try {
    const key = mediaKey(context);
    const object = await context.env.GUITARBOOK_MEDIA.head(key);
    if (!object) return new Response(null, { status: 404 });
    return new Response(null, { status: 200, headers: objectHeaders(object, key) });
  } catch {
    return new Response(null, { status: 400 });
  }
}

