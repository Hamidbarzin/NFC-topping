type VCardContact = {
  fullName: string;
  organization?: string;
  phone?: string;
  email?: string;
  website?: string;
  addressLine?: string;
  note?: string;
};

function ensureProtocol(url: string): string {
  const t = url.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

export function buildVCard(contact: VCardContact): string {
  const fullName = contact.fullName.trim() || "Contact";
  const org = contact.organization?.trim() || fullName;
  const phone = contact.phone?.trim() || "";
  const email = contact.email?.trim() || "";
  const website = ensureProtocol(contact.website || "");
  const addressLine = contact.addressLine?.trim() || "";
  const note = contact.note?.trim() || "";

  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${fullName}`,
    `ORG:${org}`,
    phone ? `TEL;TYPE=CELL:${phone}` : "",
    email ? `EMAIL:${email}` : "",
    website ? `URL:${website}` : "",
    addressLine ? `ADR:;;${addressLine};;;;` : "",
    note ? `NOTE:${note}` : "",
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\n");
}
