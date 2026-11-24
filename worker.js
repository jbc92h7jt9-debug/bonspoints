// Worker Cloudflare : génération d'images et synchronisation des appareils.
// Secrets : OPENAI_API_KEY, FAMILY_TOKEN. Liaison KV (namespace) nommée : BP
export default {
  async fetch(req, env) {
    const cors = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,PUT,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization"};
    const out = (b, s = 200, t = "text/plain") => new Response(b, {status: s, headers: {...cors, "Content-Type": t}});
    if (req.method === "OPTIONS") return new Response(null, {headers: cors});
    if (req.headers.get("Authorization") !== "Bearer " + env.FAMILY_TOKEN) return out("Non autorisé", 401);
    const p = new URL(req.url).pathname;
    if (p === "/state" || p.startsWith("/img/")) {
      const key = p === "/state" ? "state" : "img:" + p.slice(5);
      if (!/^[\w:-]{1,40}$/.test(key)) return out("Clé invalide", 400);
      if (req.method === "PUT") {
        const b = await req.text();
        if (b.length > 2e6) return out("Trop gros", 413);
        await env.BP.put(key, b);
        return out("ok");
      }
      const v = await env.BP.get(key);
      return v === null ? out("absent", 404) : out(v, 200, p === "/state" ? "application/json" : "text/plain");
    }
    if (req.method !== "POST") return out("Méthode non permise", 405);
    const {prompt} = await req.json();
    if (!prompt || prompt.length > 600) return out("Texte invalide", 400);
    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {"Content-Type": "application/json", "Authorization": "Bearer " + env.OPENAI_API_KEY},
      body: JSON.stringify({model: "gpt-image-1", prompt, size: "1024x1024", quality: "low", n: 1, moderation: "auto"})
    });
    if (!r.ok) return out("Échec", 502);
    const j = await r.json();
    return out(JSON.stringify({image: "data:image/png;base64," + j.data[0].b64_json}), 200, "application/json");
  }
};
