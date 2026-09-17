import { db, type Row } from "@/lib/db";

export type AlumniProfile = Row & {
  id: string;
  name: string;
  status: "pending" | "approved" | "hidden";
};

export type AlumniDirectory = {
  alumni: AlumniProfile[];
  generations: Row[];
  /** alumni id -> generation ids */
  cars: Record<string, string[]>;
  /** alumni id -> public email (only for people who opted in) */
  emails: Record<string, string>;
};

/** Everything the public alumni wall needs, in one query batch. */
export async function fetchAlumniDirectory(): Promise<AlumniDirectory> {
  const [alumniRes, gensRes, linksRes, contactsRes] = await Promise.all([
    db.from("alumni").select("*").eq("status", "approved").order("sort_order"),
    db.from("generations").select("id,name,year,sort_order,cover_image_url").order("sort_order"),
    db.from("alumni_generations").select("alumni_id,generation_id"),
    db.from("alumni_public_contacts").select("alumni_id,email"),
  ]);
  for (const res of [alumniRes, gensRes]) if (res.error) throw res.error;

  const cars: Record<string, string[]> = {};
  for (const link of (linksRes.data ?? []) as Row[]) {
    (cars[link.alumni_id] ??= []).push(link.generation_id);
  }
  const emails: Record<string, string> = {};
  for (const c of (contactsRes.data ?? []) as Row[]) if (c.email) emails[c.alumni_id] = c.email;

  return {
    alumni: (alumniRes.data ?? []) as AlumniProfile[],
    generations: (gensRes.data ?? []) as Row[],
    cars,
    emails,
  };
}

export const alumniDirectoryQuery = {
  queryKey: ["alumni-directory"],
  queryFn: fetchAlumniDirectory,
};

export function initials(name: unknown) {
  return (
    String(name ?? "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

export function normaliseLinkedIn(value: string) {
  const v = value.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v.replace(/^\/+/, "")}`;
}

export function isLinkedInUrl(value: string) {
  return /^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\//i.test(value);
}

/** Gmail compose link — works on any device, unlike mailto: which needs a mail app set up. */
export function gmailCompose(email: string, subject?: string) {
  const su = subject ? `&su=${encodeURIComponent(subject)}` : "";
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}${su}`;
}

/** "www.site.com" -> "https://www.site.com" so it doesn't open as a page on our own site. */
export function externalUrl(value: unknown) {
  const v = String(value ?? "").trim();
  if (!v) return "";
  if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
  return `https://${v.replace(/^\/+/, "")}`;
}

export function whatsappNumber(phone: unknown) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
}

export function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => cell(r[h])).join(","))].join(
    "\n",
  );
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const COUNTRIES = [
  "India",
  "United States",
  "Germany",
  "United Kingdom",
  "Canada",
  "Australia",
  "United Arab Emirates",
  "Singapore",
  "Netherlands",
  "France",
  "Italy",
  "Sweden",
  "Japan",
  "Ireland",
  "Switzerland",
  "Spain",
  "Austria",
  "Belgium",
  "Denmark",
  "Finland",
  "Norway",
  "Poland",
  "Portugal",
  "Czechia",
  "Saudi Arabia",
  "Qatar",
  "Oman",
  "Kuwait",
  "Bahrain",
  "Malaysia",
  "Thailand",
  "Indonesia",
  "Vietnam",
  "Philippines",
  "South Korea",
  "China",
  "Hong Kong",
  "Taiwan",
  "New Zealand",
  "South Africa",
  "Nigeria",
  "Kenya",
  "Egypt",
  "Israel",
  "Turkey",
  "Russia",
  "Brazil",
  "Mexico",
  "Chile",
  "Argentina",
  "Sri Lanka",
  "Nepal",
  "Bangladesh",
];

export const INDUSTRIES = [
  "Automotive",
  "Electric vehicles",
  "Aerospace",
  "Motorsport",
  "Manufacturing",
  "Energy",
  "Consulting",
  "Finance",
  "Software / IT",
  "Data & AI",
  "Academia / Research",
  "Startup / Founder",
  "Government / Defence",
  "Product management",
  "Other",
];
