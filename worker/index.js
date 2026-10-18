const API_BASE = "https://openapi.tripo3d.ai/v3";
const MAX_PROMPT_LENGTH = 900;
// Best-effort per-isolate throttle; add a Cloudflare WAF rate-limit rule for production.
const generationBuckets = new Map();
function rateLimited(request) {
  const key = request.headers.get("CF-Connecting-IP") || "unknown-client";
  const now = Date.now();
  const bucket = (generationBuckets.get(key) || []).filter(time => now - time < 60_000);
  if (bucket.length >= 3) { generationBuckets.set(key, bucket); return true; }
  bucket.push(now);
  generationBuckets.set(key, bucket);
  if (generationBuckets.size > 2000) {
    for (const [client, times] of generationBuckets) if (!times.some(time => now - time < 60_000)) generationBuckets.delete(client);
  }
  return false;
}
const ALLOWED_ORIGIN = (env) => env.ALLOWED_ORIGIN || "https://wonka15.github.io";

function corsHeaders(origin, env) {
  const allowed = ALLOWED_ORIGIN(env);
  return {
    "Access-Control-Allow-Origin": origin === allowed ? allowed : allowed,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
}

function json(data, status, origin, env) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders(origin, env) });
}

function enhancePrompt(raw) {
  const object = String(raw || "").trim().slice(0, MAX_PROMPT_LENGTH);
  return [
    "Create a clean, recognizable low-poly 3D blockout of: " + object + ".",
    "Prioritize accurate overall silhouette, proportions, and the object's defining physical parts.",
    "Use simple geometric forms and intentional low-poly topology, with flat shading and restrained polygon count.",
    "Neutral, untextured geometry for further modeling in Blender or Maya. No environment, ground plane, scenery, text labels, lighting setup, or presentation base.",
    "Keep the object centered, upright when appropriate, and as one coherent asset. Preserve recognizable features rather than abstracting into a generic blob."
  ].join(" ");
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin, env) });
    }
    const url = new URL(request.url);
    if (origin && origin !== ALLOWED_ORIGIN(env)) {
      return json({ error: "Origin not allowed." }, 403, origin, env);
    }
    if (!env.TRIPO_API_KEY) {
      return json({ error: "AI service is not configured yet. Add the TRIPO_API_KEY secret to this Worker." }, 503, origin, env);
    }

    if (request.method === "POST" && url.pathname === "/api/generate") {
      let body;
      try { body = await request.json(); } catch { return json({ error: "Send a JSON body with a prompt." }, 400, origin, env); }
      const prompt = String(body?.prompt || "").trim();
      if (!prompt) return json({ error: "Describe the object you want to build." }, 400, origin, env);
      if (prompt.length > MAX_PROMPT_LENGTH) return json({ error: "Prompt is too long. Keep it under 900 characters." }, 413, origin, env);

      if (rateLimited(request)) return json({ error: "Generation rate limit reached. Wait one minute before starting another model." }, 429, origin, env);
      const upstream = await fetch(API_BASE + "/generation/text-to-model", {
        method: "POST",
        headers: { "Authorization": "Bearer " + env.TRIPO_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "text_to_model",
          prompt: enhancePrompt(prompt),
          model: "P1-20260311",
          face_limit: 5000,
          texture: false,
          pbr: false,
          export_uv: false
        })
      });
      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok || data.code !== 0 || !data.data?.task_id) {
        return json({ error: data.message || data.suggestion || "The 3D provider could not start this generation.", providerCode: data.code ?? null }, upstream.status >= 400 && upstream.status < 500 ? upstream.status : 502, origin, env);
      }
      return json({ taskId: data.data.task_id, provider: "Tripo", status: "queued" }, 202, origin, env);
    }

    const taskMatch = url.pathname.match(/^\/api\/tasks\/([A-Za-z0-9_-]+)$/);
    if (request.method === "GET" && taskMatch) {
      const upstream = await fetch(API_BASE + "/tasks/" + encodeURIComponent(taskMatch[1]), {
        headers: { "Authorization": "Bearer " + env.TRIPO_API_KEY }
      });
      const data = await upstream.json().catch(() => ({}));
      if (!upstream.ok || data.code !== 0 || !data.data) {
        return json({ error: data.message || "Could not check generation status." }, upstream.status >= 400 && upstream.status < 500 ? upstream.status : 502, origin, env);
      }
      const task = data.data;
      const output = task.output || {};
      return json({
        taskId: task.task_id || taskMatch[1],
        status: task.status,
        progress: Number(task.progress || 0),
        modelUrl: task.status === "success" ? (output.pbr_model || output.model_url || output.base_model || "") : "",
        error: task.status === "failed" || task.status === "cancelled" ? (task.message || task.error || "The provider could not generate this object.") : null,
        creditsConsumed: task.credits_consumed ?? null
      }, 200, origin, env);
    }
    return json({ error: "Not found. Use POST /api/generate or GET /api/tasks/:taskId." }, 404, origin, env);
  }
};
