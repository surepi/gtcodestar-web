export async function onRequest({ request, params, env }) {
  if (!env.BACKEND_API_BASE) {
    return jsonError(500, "BACKEND_API_BASE is not configured");
  }

  const backend = String(env.BACKEND_API_BASE).replace(/\/+$/, "");
  const path = Array.isArray(params.path) ? params.path.join("/") : params.path || "";
  const incoming = new URL(request.url);
  const target = new URL(`${backend}/${path}`);
  target.search = incoming.search;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("cf-connecting-ip");
  headers.delete("cf-ipcountry");
  headers.delete("cf-ray");
  headers.delete("cf-visitor");
  headers.set("x-forwarded-host", incoming.host);
  headers.set("x-forwarded-proto", incoming.protocol.replace(":", ""));

  const init = {
    method: request.method,
    headers,
    redirect: "manual",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  try {
    const response = await fetch(target, init);
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) return response;

    const text = await response.text();
    return jsonError(response.status, "后端返回了非 JSON 响应", {
      upstream: backend,
      body: text.slice(0, 200),
    });
  } catch (error) {
    return jsonError(502, "后端接口暂时不可用", {
      upstream: backend,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function jsonError(status, message, details) {
  return new Response(JSON.stringify({ code: 50201, message, details }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
    },
  });
}
