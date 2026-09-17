import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";
import { db, fetchList, type Row } from "@/lib/db";

const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 16 }, (_, i) => String(THIS_YEAR + 1 - i));
/** Used when the admin doesn't know someone's year; they fill it in when they claim the profile. */
const EARLIER = "earlier";
const classLabel = (year: string) => (year === EARLIER ? "an earlier batch" : `the class of ${year}`);

/**
 * End-of-season tool: tick the members who are graduating, pick their year and
 * the car(s) they built, and move them to the alumni wall in one go.
 */
export function GraduateMembers() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [year, setYear] = useState(String(THIS_YEAR));
  const [cars, setCars] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ["graduate-members"],
    enabled: open,
    queryFn: async () => {
      const [members, subteams, generations] = await Promise.all([
        fetchList("members"),
        fetchList("subteams"),
        fetchList("generations"),
      ]);
      return { members, subteams, generations };
    },
  });

  const subteamName = useMemo(
    () => Object.fromEntries((data?.subteams ?? []).map((s: Row) => [s.id, s.name])),
    [data],
  );

  const toggle = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  async function graduate() {
    if (!data || selected.length === 0) return;
    if (
      !confirm(
        `Move ${selected.length} member${selected.length === 1 ? "" : "s"} to the alumni wall as ${classLabel(year)}? They will be removed from the current team page.`,
      )
    )
      return;
    setBusy(true);
    let moved = 0;
    try {
      const { data: last } = await db
        .from("alumni")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      let order = (last?.sort_order ?? 0) + 1;
      for (const id of selected) {
        const m = data.members.find((x: Row) => x.id === id);
        if (!m) continue;
        const { data: created, error } = await db
          .from("alumni")
          .insert({
            name: m.name,
            batch_year: year === EARLIER ? "Earlier batch" : year,
            graduation_year: year === EARLIER ? null : Number(year),
            position: m.position,
            subteam: m.subteam_id ? (subteamName[m.subteam_id] ?? null) : null,
            photo_url: m.photo_url,
            linkedin_url: m.linkedin_url,
            status: "approved",
            sort_order: order++,
          })
          .select("id")
          .single();
        if (error) throw error;
        if (cars.length) {
          const link = await db
            .from("alumni_generations")
            .insert(cars.map((generation_id) => ({ alumni_id: created.id, generation_id })));
          if (link.error) throw link.error;
        }
        const del = await db.from("members").delete().eq("id", id);
        if (del.error) throw del.error;
        moved++;
      }
      toast.success(`${moved} moved to the alumni wall`);
      setSelected([]);
      setOpen(false);
    } catch (err) {
      toast.error(
        `Stopped after ${moved}: ${err instanceof Error ? err.message : "something went wrong"}`,
      );
    } finally {
      setBusy(false);
      void qc.invalidateQueries();
    }
  }

  if (!open) {
    return (
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded border border-primary/40 bg-primary/5 p-4">
        <p className="text-sm">
          <span className="font-semibold">End of the season?</span> Move graduating members to the
          alumni wall in one go.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 font-display text-xs tracking-widest text-primary-foreground"
        >
          <GraduationCap className="h-4 w-4" /> GRADUATE MEMBERS
        </button>
      </div>
    );
  }

  const members: Row[] = data?.members ?? [];

  return (
    <div className="mb-10 rounded border border-primary/40 bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-2xl">
          <GraduationCap className="h-6 w-6 text-primary" /> Graduate members
        </h2>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-muted-foreground hover:text-primary"
        >
          Close
        </button>
      </div>

      {!data ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <p className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">
            1. Who is graduating?
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() =>
                setSelected(selected.length === members.length ? [] : members.map((m) => m.id))
              }
              className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-primary"
            >
              {selected.length === members.length ? "Clear all" : "Select all"}
            </button>
            {members.map((m) => {
              const on = selected.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => setSelected(toggle(selected, m.id))}
                  className={`rounded-full border px-3 py-1.5 text-xs ${
                    on ? "border-primary bg-primary text-primary-foreground" : "border-border"
                  }`}
                >
                  {m.name}
                  {m.subteam_id && (
                    <span className="ml-1 opacity-70">· {subteamName[m.subteam_id]}</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-end gap-6">
            <label className="block">
              <span className="text-xs uppercase tracking-widest text-muted-foreground">
                2. Graduation year
              </span>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="mt-2 block rounded border border-input bg-background px-3 py-2 text-sm"
              >
                {YEARS.map((y) => (
                  <option key={y}>{y}</option>
                ))}
                <option value={EARLIER}>Earlier batch (year unknown)</option>
              </select>
            </label>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                3. Car(s) they built
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {data.generations.map((g: Row) => {
                  const on = cars.includes(g.id);
                  return (
                    <button
                      key={g.id}
                      onClick={() => setCars(toggle(cars, g.id))}
                      className={`rounded-full border px-3 py-1.5 text-xs ${
                        on ? "border-primary bg-primary text-primary-foreground" : "border-border"
                      }`}
                    >
                      {g.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <button
            disabled={busy || selected.length === 0}
            onClick={() => void graduate()}
            className="mt-6 rounded bg-primary px-6 py-3 font-display text-sm tracking-widest text-primary-foreground disabled:opacity-50"
          >
            {busy ? "MOVING…" : `MOVE ${selected.length} TO ALUMNI (${year === EARLIER ? "EARLIER BATCH" : `CLASS OF ${year}`})`}
          </button>
          <p className="mt-2 text-xs text-muted-foreground">
            Their name, role, department, photo and LinkedIn are copied over. They can later claim
            and update their profile from the alumni join page. &quot;Earlier batch&quot; people show under
            Earlier members in the by-year view until they add their graduation year.
          </p>
        </>
      )}
    </div>
  );
}
