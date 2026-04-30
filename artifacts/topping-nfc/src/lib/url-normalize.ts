/** Normalize optional URL from user input (adds https if missing). */
export function normalizeUserUrl(input: string): string | null {
  const t = input.trim();
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

/**
 * Build href for the general external-contact field: full URLs as-is;
 * legacy plain phone values still open WhatsApp.
 */
export function externalContactHref(raw: string): string {
  const t = raw.trim();
  if (!t) return "#";
  if (/^https?:\/\//i.test(t)) return t;
  const digits = t.replace(/\D/g, "");
  if (digits.length >= 10) return `https://wa.me/${digits}`;
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
}
