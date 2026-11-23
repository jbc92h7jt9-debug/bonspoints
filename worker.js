// Serveur intermédiaire Cloudflare Worker. Secrets à définir : OPENAI_API_KEY, FAMILY_TOKEN
export default {
  async fetch(req, env) {
    const cors = {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, Authorization"};
    if (req.method === "OPTIONS") return new Response(null, {headers: cors});
    if (req.headers.get("Authorization") !== "Bearer " + env.FAMILY_TOKEN) return new Response("Non autorisé", {status: 401, headers: cors});
    const {prompt} = await req.json();
    if (!prompt || prompt.length > 600) return new Response("Texte invalide", {status: 400, headers: cors});
    const r = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {"Content-Type": "application/json", "Authorization": "Bearer " + env.OPENAI_API_KEY},
      body: JSON.stringify({model: "gpt-image-1", prompt, size: "1024x1024", quality: "low", n: 1, moderation: "auto"})
    });
    if (!r.ok) return new Response("Échec", {status: 502, headers: cors});
    const j = await r.json();
    return new Response(JSON.stringify({image: "data:image/png;base64," + j.data[0].b64_json}), {headers: {...cors, "Content-Type": "application/json"}});
  }
};
