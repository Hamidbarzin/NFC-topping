/**
 * Normalize user-entered URLs for storage (adds https if missing).
 * Returns null for empty or invalid input.
 */
export function normalizeOptionalUrl(input: string | null | undefined): string | null {
  if (input === null || input === undefined) return null;
  const t = String(input).trim();
  if (!t) return null;
  try {
    const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`;
    const u = new URL(withProto);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.href;
  } catch {
    return null;
  }
}
