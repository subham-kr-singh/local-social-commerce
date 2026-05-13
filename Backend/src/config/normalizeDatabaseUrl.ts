/**
 * Managed Postgres (Railway, Neon, Supabase, etc.) usually requires TLS.
 * Append sslmode=require when missing so `pg` / Prisma adapter can connect.
 *
 * Supabase: add connect_timeout so slow TLS / cold starts fail with a clear timeout
 * instead of hanging; prefer IPv4 via `dns.setDefaultResultOrder` in prisma.config / server.
 */
export function normalizePostgresDatabaseUrl(url: string): string {
  let out = url.trim();
  if (!out) return out;

  const hostish = out.toLowerCase();
  const looksManaged =
    /\b(railway\.internal|\.rlwy\.net|neon\.tech|supabase\.co|aiven\.io|render\.com|amazonaws\.com)\b/i.test(
      hostish,
    );
  if (!looksManaged) return out;

  if (!/sslmode=/i.test(out)) {
    out += (out.includes("?") ? "&" : "?") + "sslmode=require";
  }
  if ((/supabase\.co/i.test(out) || /\.neon\.tech\b/i.test(out)) && !/connect_timeout=/i.test(out)) {
    out += "&connect_timeout=40";
  }
  return out;
}
