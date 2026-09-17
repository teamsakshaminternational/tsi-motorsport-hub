import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Download, EyeOff, Linkedin, MessageCircle, Search, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { db, type Row } from "@/lib/db";
import { downloadCsv, initials, whatsappNumber } from "@/lib/alumni";

type View = "requests" | "directory" | "outreach";

type NetworkData = {
  alumni: Row[];
  privateById: Record<string, Row>;
  carsById: Record<string, string[]>;
  generations: Row[];
  outreach: Row[];
};

const rpc = (fn: string, args: Record<string, unknown>) =>
  (
    supabase as unknown as {
      rpc: (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ error: { message: string } | null }>;
    }
  ).rpc(fn, args);

async function fetchNetwork(): Promise<NetworkData> {
  const [a, p, l, g, o] = await Promise.all([
    db.from("alumni").select("*").order("sort_order"),
    db.from("alumni_private").select("*"),
    db.from("alumni_generations").select("alumni_id,generation_id"),
    db.from("generations").select("id,name").order("sort_order"),
    db.from("alumni_outreach").select("*").order("car", { ascending: false }).order("name"),
  ]);
  for (const r of [a, p, l, g, o]) if (r.error) throw r.error;
  const privateById: Record<string, Row> = {};
  for (const row of p.data as Row[]) privateById[row.alumni_id] = row;
  const carsById: Record<string, string[]> = {};
  for (const row of l.data as Row[]) (carsById[row.alumni_id] ??= []).push(row.generation_id);
  return {
    alumni: a.data as Row[],
    privateById,
    carsById,
    generations: g.data as Row[],
    outreach: o.data as Row[],
  };
}

export const alumniNetworkQuery = { queryKey: ["admin-alumni-network"], queryFn: fetchNetwork };

export function usePendingAlumniCount(enabled: boolean) {
  const { data } = useQuery({ ...alumniNetworkQuery, enabled });
  return (data?.alumni ?? []).filter((a) => a.status === "pending").length;
}

export function AlumniNetwork() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery(alumniNetworkQuery);
  const [view, setView] = useState<View>("requests");

  const refresh = () => {
    void qc.invalidateQueries();
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error || !data)
    return <p className="text-sm text-destructive">Couldn't load the alumni network.</p>;

  const pending = data.alumni.filter((a) => a.status === "pending");
  const genName = Object.fromEntries(data.generations.map((g) => [g.id, g.name]));

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl">Alumni network</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Share <span className="text-primary">/alumni/join</span> with alumni. New sign-ups wait
            here for approval. Emails and phone numbers are only visible to admins.
          </p>
        </div>
        <div className="flex rounded border border-border p-0.5 text-xs">
          {(
            [
              ["requests", `Requests (${pending.length})`],
              ["directory", `Directory (${data.alumni.length})`],
              ["outreach", `Outreach list (${data.outreach.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`rounded px-3 py-2 font-display tracking-widest ${
                view === key ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {label.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        {view === "requests" && (
          <Requests data={data} pending={pending} genName={genName} onChange={refresh} />
        )}
        {view === "directory" && <Directory data={data} genName={genName} onChange={refresh} />}
        {view === "outreach" && <Outreach data={data} onChange={refresh} />}
      </div>
    </div>
  );
}

function Face({ row, size = "h-14 w-14" }: { row: Row; size?: string }) {
  return row.photo_url ? (
    <img src={row.photo_url} alt="" className={`${size} shrink-0 rounded-full object-cover`} />
  ) : (
    <span
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-surface-2 font-display text-primary`}
    >
      {initials(row.name)}
    </span>
  );
}

function Detail({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm">{String(value)}</dd>
    </div>
  );
}

function Requests({
  data,
  pending,
  genName,
  onChange,
}: {
  data: NetworkData;
  pending: Row[];
  genName: Record<string, string>;
  onChange: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const byId = Object.fromEntries(data.alumni.map((a) => [a.id, a]));

  async function approve(row: Row) {
    setBusy(row.id);
    const { error } = await rpc("approve_alumni", { p_id: row.id });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${row.name} is now on the alumni wall`);
    onChange();
  }

  async function hide(row: Row) {
    setBusy(row.id);
    const { error } = await db.from("alumni").update({ status: "hidden" }).eq("id", row.id);
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Hidden");
    onChange();
  }

  async function remove(row: Row) {
    if (!confirm(`Delete ${row.name}'s submission? This cannot be undone.`)) return;
    setBusy(row.id);
    const { error } = await db.from("alumni").delete().eq("id", row.id);
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deleted");
    onChange();
  }

  if (pending.length === 0)
    return <p className="text-sm text-muted-foreground">No pending requests. All caught up.</p>;

  return (
    <div className="space-y-4">
      {pending.map((row) => {
        const priv = data.privateById[row.id] ?? {};
        const claimed = row.claims_alumni_id ? byId[row.claims_alumni_id] : null;
        return (
          <article key={row.id} className="rounded border border-border bg-surface p-5">
            <div className="flex flex-wrap items-start gap-4">
              <Face row={row} />
              <div className="min-w-0 flex-1">
                <h3 className="text-xl">{row.name}</h3>
                <p className="text-xs text-muted-foreground">
                  Submitted {row.submitted_at ? new Date(row.submitted_at).toLocaleString() : ""}
                </p>
                {claimed && (
                  <p className="mt-2 flex items-center gap-2 rounded bg-primary/10 px-3 py-2 text-xs text-primary">
                    <Face row={claimed} size="h-7 w-7" />
                    Claims the existing profile “{claimed.name}”. Approving merges them into one.
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  disabled={busy === row.id}
                  onClick={() => void approve(row)}
                  className="inline-flex items-center gap-1.5 rounded bg-primary px-4 py-2 font-display text-xs tracking-widest text-primary-foreground disabled:opacity-50"
                >
                  <Check className="h-4 w-4" /> APPROVE
                </button>
                <button
                  disabled={busy === row.id}
                  onClick={() => void hide(row)}
                  title="Hide (keeps the data)"
                  className="rounded border border-border p-2 hover:border-primary hover:text-primary"
                >
                  <EyeOff className="h-4 w-4" />
                </button>
                <button
                  disabled={busy === row.id}
                  onClick={() => void remove(row)}
                  title="Delete"
                  className="rounded border border-border p-2 hover:border-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Detail label="Email" value={priv.email} />
              <Detail label="Phone" value={priv.phone} />
              <Detail
                label="Cars"
                value={(data.carsById[row.id] ?? []).map((id) => genName[id]).join(", ")}
              />
              <Detail
                label="TSI years"
                value={[row.joined_year, row.graduation_year].filter(Boolean).join(" – ")}
              />
              <Detail label="Department" value={row.subteam} />
              <Detail label="Role in team" value={row.position} />
              <Detail
                label="Now"
                value={[row.current_role_text, row.company].filter(Boolean).join(" @ ")}
              />
              <Detail label="Location" value={[row.city, row.country].filter(Boolean).join(", ")} />
              <Detail label="Industry" value={row.industry} />
              <Detail label="LinkedIn" value={row.linkedin_url} />
              <Detail label="Show email publicly" value={priv.show_email ? "Yes" : "No"} />
              <Detail label="Open to mentoring" value={priv.open_to_mentoring ? "Yes" : "No"} />
            </dl>
            {row.message && (
              <p className="mt-4 border-l-2 border-primary pl-3 text-sm italic text-muted-foreground">
                {row.message}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}

function Directory({
  data,
  genName,
  onChange,
}: {
  data: NetworkData;
  genName: Record<string, string>;
  onChange: () => void;
}) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [editingCars, setEditingCars] = useState<string | null>(null);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.alumni.filter((a) => {
      if (status !== "all" && a.status !== status) return false;
      if (!term) return true;
      const priv = data.privateById[a.id] ?? {};
      return [a.name, a.company, a.city, a.country, priv.email, priv.phone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [data, q, status]);

  async function setStatusFor(row: Row, next: string) {
    const { error } = await db.from("alumni").update({ status: next }).eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    onChange();
  }

  async function toggleCar(alumniId: string, generationId: string, on: boolean) {
    const res = on
      ? await db
          .from("alumni_generations")
          .delete()
          .eq("alumni_id", alumniId)
          .eq("generation_id", generationId)
      : await db
          .from("alumni_generations")
          .insert({ alumni_id: alumniId, generation_id: generationId });
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    onChange();
  }

  function exportCsv() {
    downloadCsv(
      `tsi-alumni-${new Date().toISOString().slice(0, 10)}.csv`,
      rows.map((a) => {
        const priv = data.privateById[a.id] ?? {};
        return {
          name: a.name,
          status: a.status,
          cars: (data.carsById[a.id] ?? []).map((id) => genName[id]).join(" / "),
          department: a.subteam,
          role_in_team: a.position,
          joined: a.joined_year,
          graduated: a.graduation_year ?? a.batch_year,
          job_title: a.current_role_text,
          company: a.company,
          industry: a.industry,
          city: a.city,
          country: a.country,
          linkedin: a.linkedin_url,
          email: priv.email,
          phone: priv.phone,
          email_public: priv.show_email ? "yes" : "no",
          mentor: priv.open_to_mentoring ? "yes" : "no",
        };
      }),
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, company…"
            className="w-72 rounded border border-input bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded border border-input bg-surface px-3 py-2 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="hidden">Hidden</option>
        </select>
        <button
          onClick={exportCsv}
          className="ml-auto inline-flex items-center gap-2 rounded border border-border px-4 py-2 font-display text-xs tracking-widest hover:border-primary hover:text-primary"
        >
          <Download className="h-4 w-4" /> EXPORT CSV
        </button>
      </div>

      <div className="mt-5 overflow-x-auto rounded border border-border">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-surface text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Cars</th>
              <th className="p-3">Now</th>
              <th className="p-3">Contact (private)</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((a) => {
              const priv = data.privateById[a.id] ?? {};
              const cars = data.carsById[a.id] ?? [];
              return (
                <tr key={a.id} className="align-top">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <Face row={a} size="h-9 w-9" />
                      <div>
                        <div className="font-semibold">{a.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {[a.position, a.graduation_year ?? a.batch_year]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    {editingCars === a.id ? (
                      <div className="flex max-w-xs flex-wrap gap-1">
                        {data.generations.map((g) => {
                          const on = cars.includes(g.id);
                          return (
                            <button
                              key={g.id}
                              onClick={() => void toggleCar(a.id, g.id, on)}
                              className={`rounded-full border px-2 py-0.5 text-[11px] ${
                                on
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border"
                              }`}
                            >
                              {g.name}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => setEditingCars(null)}
                          className="text-[11px] text-primary underline"
                        >
                          done
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingCars(a.id)}
                        className="text-left text-xs hover:text-primary"
                        title="Edit cars"
                      >
                        {cars.length ? cars.map((id) => genName[id]).join(", ") : "+ add cars"}
                      </button>
                    )}
                  </td>
                  <td className="p-3 text-xs">
                    {[a.current_role_text, a.company].filter(Boolean).join(" @ ")}
                    <div className="text-muted-foreground">
                      {[a.city, a.country].filter(Boolean).join(", ")}
                    </div>
                    {a.linkedin_url && (
                      <a
                        href={a.linkedin_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex text-primary"
                      >
                        <Linkedin className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </td>
                  <td className="p-3 text-xs">
                    {priv.email && <div>{priv.email}</div>}
                    {priv.phone && (
                      <a
                        href={`https://wa.me/${whatsappNumber(priv.phone)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline"
                      >
                        {priv.phone}
                      </a>
                    )}
                    {priv.open_to_mentoring && (
                      <div className="mt-1 inline-block rounded-full bg-primary/15 px-2 text-[10px] uppercase text-primary">
                        Mentor
                      </div>
                    )}
                  </td>
                  <td className="p-3">
                    <select
                      value={a.status}
                      onChange={(e) => void setStatusFor(a, e.target.value)}
                      className="rounded border border-input bg-surface px-2 py-1 text-xs"
                    >
                      <option value="approved">Approved</option>
                      <option value="pending">Pending</option>
                      <option value="hidden">Hidden</option>
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Outreach({ data, onChange }: { data: NetworkData; onChange: () => void }) {
  const [q, setQ] = useState("");
  const linkedIds = new Set(data.alumni.filter((a) => a.user_id).map((a) => a.id));

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return data.outreach;
    return data.outreach.filter((o) =>
      [o.name, o.car, o.organisation, o.location, o.phone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term)),
    );
  }, [data.outreach, q]);

  const joinLink = typeof window === "undefined" ? "" : `${window.location.origin}/alumni/join`;

  async function invite(o: Row) {
    const first = String(o.name).split(" ")[0];
    const text = `Hi ${first}! This is Team Saksham International. We're building an alumni wall on our new website so current students can see where TSI alumni are now. Could you add yourself? It takes 2 minutes: ${joinLink}`;
    window.open(
      `https://wa.me/${whatsappNumber(o.phone)}?text=${encodeURIComponent(text)}`,
      "_blank",
    );
    const { error } = await db
      .from("alumni_outreach")
      .update({ invited_at: new Date().toISOString() })
      .eq("id", o.id);
    if (!error) onChange();
  }

  if (data.outreach.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        The outreach list is empty. Load the old contact sheet with the private SQL file.
      </p>
    );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="w-72 rounded border border-input bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </label>
        <p className="text-xs text-muted-foreground">
          {data.outreach.filter((o) => o.invited_at).length} of {data.outreach.length} invited
        </p>
        <button
          onClick={() =>
            downloadCsv(
              "tsi-alumni-outreach.csv",
              rows.map(
                ({
                  name,
                  car,
                  organisation,
                  industry,
                  designation,
                  phone,
                  location,
                  invited_at,
                }) => ({
                  name,
                  car,
                  organisation,
                  industry,
                  designation,
                  phone,
                  location,
                  invited_at,
                }),
              ),
            )
          }
          className="ml-auto inline-flex items-center gap-2 rounded border border-border px-4 py-2 font-display text-xs tracking-widest hover:border-primary hover:text-primary"
        >
          <Download className="h-4 w-4" /> EXPORT CSV
        </button>
      </div>
      <div className="mt-5 overflow-x-auto rounded border border-border">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="bg-surface text-[10px] uppercase tracking-widest text-muted-foreground">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Car</th>
              <th className="p-3">Then (from the old sheet)</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Invite</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((o) => (
              <tr key={o.id}>
                <td className="p-3 font-semibold">
                  {o.name}
                  {o.alumni_id && linkedIds.has(o.alumni_id) && (
                    <span className="ml-2 rounded-full bg-primary/15 px-2 text-[10px] uppercase text-primary">
                      joined
                    </span>
                  )}
                </td>
                <td className="p-3 text-xs">{o.car}</td>
                <td className="p-3 text-xs text-muted-foreground">
                  {[o.designation, o.organisation].filter(Boolean).join(" @ ")}
                  {o.location && <div>{o.location}</div>}
                </td>
                <td className="p-3 text-xs">{o.phone}</td>
                <td className="p-3">
                  {o.phone ? (
                    <button
                      onClick={() => void invite(o)}
                      className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 font-display text-[11px] tracking-widest ${
                        o.invited_at
                          ? "border border-border text-muted-foreground"
                          : "bg-[#25D366] text-black"
                      }`}
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      {o.invited_at ? "SENT · RESEND" : "WHATSAPP"}
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">no phone</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
