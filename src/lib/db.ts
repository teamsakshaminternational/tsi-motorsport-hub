import { supabase } from "@/integrations/supabase/client";

// The generated types lag behind new tables, so content tables are accessed
// through this loosely typed handle.
export const db = supabase as unknown as {
  from: (table: string) => any;
};

export type Row = Record<string, any>;

export async function fetchList(
  table: string,
  opts: { order?: string; ascending?: boolean; filters?: Record<string, unknown> } = {},
): Promise<Row[]> {
  let q = db.from(table).select("*");
  if (opts.filters) {
    for (const [k, v] of Object.entries(opts.filters)) q = q.eq(k, v);
  }
  q = q.order(opts.order ?? "sort_order", { ascending: opts.ascending ?? true });
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as Row[];
}

export const listQuery = (
  table: string,
  opts: Parameters<typeof fetchList>[1] = {},
) => ({
  queryKey: [table, opts],
  queryFn: () => fetchList(table, opts),
});

export async function fetchPageContent(): Promise<Record<string, string>> {
  const rows = await fetchList("page_content", { order: "key" });
  return Object.fromEntries(rows.map((r) => [r["key"] as string, (r["value"] ?? "") as string]));
}

export const pageContentQuery = {
  queryKey: ["page_content_map"],
  queryFn: fetchPageContent,
};

export function content(map: Record<string, string> | undefined, key: string, fallback: string) {
  const v = map?.[key];
  return v && v.trim().length > 0 ? v : fallback;
}
