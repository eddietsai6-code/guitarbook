export function jsonResponse(value, { status = 200, headers = {} } = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
      ...headers
    }
  });
}

export function errorResponse(error, status = 400) {
  const message = error instanceof Error ? error.message : String(error || "Request failed.");
  return jsonResponse({ error: message }, { status, headers: { "cache-control": "no-store" } });
}

