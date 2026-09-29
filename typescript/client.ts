export type Bbox = [number, number, number, number]; // south, west, north, east
export function featureQuery(category: string, bbox: number[], limit = 100): string {
  const selectors: Record<string, string> = { cafes: '["amenity"="cafe"]', buildings: '["building"]', parks: '["leisure"="park"]' };
  const [s, w, n, e] = bbox;
  if (!Object.hasOwn(selectors, category) || bbox.length !== 4 || !bbox.every(Number.isFinite) || s < -85 || n > 85 || w < -180 || e > 180 || n <= s || e <= w || n - s > .5 || e - w > .5 || !Number.isInteger(limit) || limit < 1 || limit > 500) {
    throw new Error("Choose cafes/buildings/parks, an ordered bbox at most 0.5 degrees per axis, and limit 1..500.");
  }
  return `[out:json][timeout:30];nwr${selectors[category]}(${bbox.join(",")});out geom ${limit};`;
}

export function createClient(env = process.env) {
  const base = new URL(env.MAPSOURCE_BASE_URL || "https://api.mapsource.io");
  if (base.username || base.password || base.search || base.hash || base.pathname !== "/" || (base.protocol !== "https:" && !(base.protocol === "http:" && ["127.0.0.1", "localhost"].includes(base.hostname)))) throw new Error("Use an HTTPS API origin (or loopback HTTP for development).");
  async function request(path: string, options: { method?: string; body?: string; authenticated?: boolean } = {}) {
    const target = new URL(path, base);
    if (target.origin !== base.origin || !target.pathname.startsWith("/api/")) throw new Error("Only Mapsource API paths are permitted.");
    const headers: Record<string, string> = { accept: "application/json" };
    if (options.authenticated !== false) {
      if (!env.MAPSOURCE_API_KEY) throw new Error("Set MAPSOURCE_API_KEY in your environment; obtain a subscription at https://mapsource.io/pricing.");
      headers.authorization = `Bearer ${env.MAPSOURCE_API_KEY}`;
    }
    if (options.body !== undefined) headers["content-type"] = "text/plain";
    const response = await fetch(target, { method: options.method || "GET", headers, ...(options.body !== undefined ? { body: options.body } : {}), redirect: "error", signal: AbortSignal.timeout(40_000) });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Mapsource HTTP ${response.status}; Retry-After=${response.headers.get("retry-after") || "none"}. No automatic retry or payment was attempted.`);
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Empty response.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.length;
        if (size > 16 * 1024 * 1024) { await reader.cancel(); throw new Error("Example response ceiling: 16 MiB. Narrow the query."); }
        chunks.push(chunk.value);
      }
    } finally { reader.releaseLock(); }
    return { body: Buffer.concat(chunks), headers: response.headers };
  }
  async function json(path: string, options: Parameters<typeof request>[1] = {}) {
    return JSON.parse((await request(path, options)).body.toString("utf8"));
  }
  async function features(category: string, bbox: number[], limit = 100) {
    const query = featureQuery(category, bbox, limit);
    const status = await json("/api/status", { authenticated: false });
    const fixture = status.engine?.mode === "fixture";
    if (status.engine?.mode !== "overpass" || !status.engine?.ready) {
      if (!(fixture && env.ALLOW_FIXTURE === "true")) throw new Error("Planet-backed queries are not ready. Check https://mapsource.io/status. ALLOW_FIXTURE=true explicitly permits test objects only.");
    }
    const result = await request("/api/interpreter", { method: "POST", body: query });
    // Recheck the response mode in case the engine changed after the status probe.
    if (result.headers.get("x-overpass-engine-mode") !== "overpass" && env.ALLOW_FIXTURE !== "true") throw new Error("Query was not served by the planet engine.");
    const data = JSON.parse(result.body.toString("utf8"));
    if (!Array.isArray(data.elements) || data.remark) throw new Error("Incomplete Overpass response. Narrow the bounds.");
    return { engineMode: result.headers.get("x-overpass-engine-mode"), data };
  }
  async function elevation(lat: number, lon: number) {
    if (!Number.isFinite(lat) || Math.abs(lat) > 85.05112878 || !Number.isFinite(lon) || Math.abs(lon) > 180) throw new Error("Invalid coordinates.");
    return json(`/api/elevation?lat=${lat}&lon=${lon}`);
  }
  return { request, json, features, elevation };
}
