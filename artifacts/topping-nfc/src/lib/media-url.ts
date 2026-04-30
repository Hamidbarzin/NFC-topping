/**
 * Absolute URL for <img src> in the browser. Relative `/uploads/...` paths resolve against the page origin.
 */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (url == null) return "";
  const u = String(url).trim();
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("//") && typeof window !== "undefined") {
    return `${window.location.protocol}${u}`;
  }
  if (typeof window !== "undefined" && u.startsWith("/")) {
    return `${window.location.origin}${u}`;
  }
  return u;
}
