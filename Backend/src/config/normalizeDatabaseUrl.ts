/**
 * Managed Postgres (Railway, Neon, Supabase, etc.) usually requires TLS.
 * Append sslmode=require when missing so `pg` / Prisma adapter can connect.
 */
export function normalizePostgresDatabaseUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed || /sslmode=/i.test(trimmed)) return trimmed;

  const hostish = trimmed.toLowerCase();
  const looksManaged =
    /\b(railway\.internal|\.rlwy\.net|neon\.tech|supabase\.co|aiven\.io|render\.com|amazonaws\.com)\b/i.test(
      hostish,
    );

  if (!looksManaged) return trimmed;

  return trimmed + (trimmed.includes("?") ? "&" : "?") + "sslmode=require";
}
