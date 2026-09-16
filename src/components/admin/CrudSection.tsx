import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { db, fetchList, listQuery, type Row } from "@/lib/db";
import { uploadImage } from "@/lib/upload";

export type FieldType = "text" | "textarea" | "number" | "image" | "checkbox" | "select" | "date";

export type Field = {
  name: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  /** For `select`: table to read options from. */
  optionsTable?: string;
  optionsLabel?: string;
  placeholder?: string;
};

type Props = {
  table: string;
  title: string;
  description?: string;
  fields: Field[];
  /** Column used as the card title in the list. */
  labelField?: string;
  /** Column used to group the list (usually a foreign key). */
  groupBy?: string;
};

function emptyDraft(fields: Field[]): Row {
  const draft: Row = {};
  for (const f of fields) draft[f.name] = f.type === "checkbox" ? false : "";
  return draft;
}

export function CrudSection({
  table,
  title,
  description,
  fields,
  labelField = "name",
  groupBy,
}: Props) {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery(listQuery(table));
  const [editing, setEditing] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);

  const selectTables = useMemo(
    () => fields.filter((f) => f.type === "select" && f.optionsTable).map((f) => f.optionsTable!),
    [fields],
  );
  const { data: optionData = {} } = useQuery({
    queryKey: ["options", selectTables],
    enabled: selectTables.length > 0,
    queryFn: async () => {
      const out: Record<string, Row[]> = {};
      for (const t of selectTables) out[t] = await fetchList(t);
      return out;
    },
  });

  function refresh() {
    void qc.invalidateQueries();
  }

  async function save() {
    if (!editing) return;
    for (const f of fields) {
      if (f.required && !editing[f.name]) {
        toast.error(`${f.label} is required`);
        return;
      }
    }
    setBusy(true);
    const payload: Row = {};
    for (const f of fields) {
      let value = editing[f.name];
      if (value === "") value = null;
      if (f.type === "number") value = value === null ? 0 : Number(value);
      payload[f.name] = value;
    }
    const { id } = editing;
    const res = id
      ? await db.from(table).update(payload).eq("id", id)
      : await db
          .from(table)
          .insert({ ...payload, sort_order: rows.length });
    setBusy(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success(id ? "Saved" : "Added");
    setEditing(null);
    refresh();
  }

  async function remove(row: Row) {
    if (!confirm(`Delete "${row[labelField] ?? "this item"}"? This cannot be undone.`)) return;
    const { error } = await db.from(table).delete().eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deleted");
    refresh();
  }

  async function move(row: Row, direction: -1 | 1) {
    const siblings = (rows as Row[]).filter((r) =>
      groupBy ? r[groupBy] === row[groupBy] : true,
    );
    const index = siblings.findIndex((r) => r.id === row.id);
    const target = siblings[index + direction];
    if (!target) return;
    const a = await db.from(table).update({ sort_order: target.sort_order }).eq("id", row.id);
    const b = await db.from(table).update({ sort_order: row.sort_order }).eq("id", target.id);
    if (a.error || b.error) {
      toast.error("Could not reorder");
      return;
    }
    refresh();
  }

  async function onFile(field: Field, file: File) {
    setBusy(true);
    try {
      const url = await uploadImage(file, table);
      setEditing((prev) => ({ ...(prev ?? {}), [field.name]: url }));
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const optionLabelFor = (f: Field, value: unknown) => {
    const list = optionData[f.optionsTable ?? ""] ?? [];
    const match = list.find((o) => o.id === value);
    return match ? match[f.optionsLabel ?? "name"] : null;
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        <button
          onClick={() => setEditing(emptyDraft(fields))}
          className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 font-display text-xs tracking-widest text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> ADD
        </button>
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Nothing here yet.</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {(rows as Row[]).map((row) => (
            <li
              key={row.id}
              className="flex items-center gap-3 rounded border border-border bg-surface p-3"
            >
              {(row.photo_url || row.image_url || row.logo_url || row.cover_image_url) && (
                <img
                  src={row.photo_url || row.image_url || row.logo_url || row.cover_image_url}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {row[labelField] ?? row.title ?? row.name ?? row.id}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {[
                    row.position,
                    row.year,
                    row.batch_year,
                    row.tier,
                    row.event,
                    row.caption,
                    groupBy ? optionLabelFor(fields.find((f) => f.name === groupBy)!, row[groupBy]) : null,
                    "published" in row ? (row.published ? "Published" : "Draft") : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  aria-label="Move up"
                  onClick={() => move(row, -1)}
                  className="rounded border border-border p-2 hover:border-primary hover:text-primary"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  aria-label="Move down"
                  onClick={() => move(row, 1)}
                  className="rounded border border-border p-2 hover:border-primary hover:text-primary"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  aria-label="Edit"
                  onClick={() => setEditing({ ...row })}
                  className="rounded border border-border p-2 hover:border-primary hover:text-primary"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  aria-label="Delete"
                  onClick={() => remove(row)}
                  className="rounded border border-border p-2 hover:border-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/80 p-4 backdrop-blur-sm">
          <div className="my-8 w-full max-w-2xl rounded border border-border bg-surface p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl">
                {editing.id ? "Edit" : "New"} — {title}
              </h3>
              <button
                onClick={() => setEditing(null)}
                aria-label="Close"
                className="rounded border border-border p-2 hover:border-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {fields.map((f) => {
                const value = editing[f.name] ?? "";
                const set = (v: unknown) =>
                  setEditing((prev) => ({ ...(prev ?? {}), [f.name]: v }));
                const inputClass =
                  "w-full rounded border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";
                return (
                  <div key={f.name}>
                    <label className="mb-1 block text-xs uppercase tracking-widest text-muted-foreground">
                      {f.label}
                      {f.required && <span className="text-primary"> *</span>}
                    </label>

                    {f.type === "textarea" ? (
                      <textarea
                        rows={6}
                        value={value}
                        placeholder={f.placeholder}
                        onChange={(e) => set(e.target.value)}
                        className={inputClass}
                      />
                    ) : f.type === "checkbox" ? (
                      <input
                        type="checkbox"
                        checked={Boolean(editing[f.name])}
                        onChange={(e) => set(e.target.checked)}
                        className="h-5 w-5 accent-[var(--primary)]"
                      />
                    ) : f.type === "select" ? (
                      <select
                        value={value ?? ""}
                        onChange={(e) => set(e.target.value || null)}
                        className={inputClass}
                      >
                        <option value="">— none —</option>
                        {(optionData[f.optionsTable ?? ""] ?? []).map((o) => (
                          <option key={o.id} value={o.id}>
                            {o[f.optionsLabel ?? "name"]}
                          </option>
                        ))}
                      </select>
                    ) : f.type === "image" ? (
                      <div className="space-y-2">
                        {value && (
                          <img src={value} alt="" className="h-28 w-auto rounded object-cover" />
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void onFile(f, file);
                          }}
                          className="block w-full text-xs text-muted-foreground"
                        />
                        <input
                          type="url"
                          value={value}
                          placeholder="or paste an image URL"
                          onChange={(e) => set(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    ) : (
                      <input
                        type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                        value={value}
                        placeholder={f.placeholder}
                        onChange={(e) => set(e.target.value)}
                        className={inputClass}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={save}
                disabled={busy}
                className="rounded bg-primary px-5 py-2 font-display text-xs tracking-widest text-primary-foreground disabled:opacity-60"
              >
                {busy ? "WORKING…" : "SAVE"}
              </button>
              <button
                onClick={() => setEditing(null)}
                className="rounded border border-border px-5 py-2 font-display text-xs tracking-widest"
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
