import { createFileRoute, Link } from "@tanstack/react-router";
import { HydrationBoundary, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Copy, Linkedin, Mail, MapPin, Search, X } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Reveal } from "@/components/Reveal";
import { alumniDirectoryQuery, externalUrl, gmailCompose, initials, type AlumniProfile } from "@/lib/alumni";
import type { Row } from "@/lib/db";
import { preloadQueries } from "@/lib/preload";
import { Thumb } from "@/components/Thumb";

export const Route = createFileRoute("/alumni")({
  head: () => ({
    meta: [
      { title: "Alumni Network — Team Saksham International" },
      {
        name: "description",
        content:
          "The engineers who built Team Saksham International's cars — which car they worked on, and where they are now.",
      },
      { property: "og:title", content: "TSI Alumni Network" },
      {
        property: "og:description",
        content: "Every TSI car, the people who built it, and where they are now.",
      },
      { property: "og:image", content: "/og-image.jpg" },
    ],
  }),
  loader: ({ context }) => preloadQueries(context.queryClient, [alumniDirectoryQuery]),
  component: AlumniPage,
});

function AlumniPage() {
  const state = Route.useLoaderData();
  return (
    <HydrationBoundary state={state}>
      <Alumni />
    </HydrationBoundary>
  );
}

type GroupMode = "car" | "year";

function Alumni() {
  const { data, isLoading } = useQuery(alumniDirectoryQuery);
  const [query, setQuery] = useState("");
  const [car, setCar] = useState<string | null>(null);
  const [country, setCountry] = useState("");
  const [mode, setMode] = useState<GroupMode>("car");
  const [open, setOpen] = useState<AlumniProfile | null>(null);

  const alumni = useMemo(() => data?.alumni ?? [], [data]);
  const generations = useMemo(() => data?.generations ?? [], [data]);
  const cars = useMemo(() => data?.cars ?? {}, [data]);
  const emails = data?.emails ?? {};
  const genName = useMemo(
    () => Object.fromEntries(generations.map((g: Row) => [g.id, g.name as string])),
    [generations],
  );

  const countries = useMemo(
    () => [...new Set(alumni.map((a) => a.country).filter(Boolean))].sort() as string[],
    [alumni],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return alumni.filter((a) => {
      if (car && !(cars[a.id] ?? []).includes(car)) return false;
      if (country && a.country !== country) return false;
      if (!q) return true;
      return [a.name, a.company, a.current_role_text, a.city, a.position, a.subteam]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [alumni, cars, car, country, query]);

  const groups = useMemo(() => {
    if (mode === "year") {
      const map = new Map<string, AlumniProfile[]>();
      for (const a of filtered) {
        const key = a.graduation_year ? `Class of ${a.graduation_year}` : "Earlier members";
        map.set(key, [...(map.get(key) ?? []), a]);
      }
      return [...map.entries()].sort((x, y) => {
        if (x[0] === "Earlier members") return 1;
        if (y[0] === "Earlier members") return -1;
        return y[0].localeCompare(x[0]);
      });
    }
    const out: [string, AlumniProfile[]][] = [];
    for (const g of [...generations].reverse()) {
      if (car && g.id !== car) continue;
      const list = filtered.filter((a) => (cars[a.id] ?? []).includes(g.id));
      if (list.length) out.push([g.name, list]);
    }
    const noCar = filtered.filter((a) => !(cars[a.id] ?? []).length);
    if (noCar.length) out.push(["Earlier members", noCar]);
    return out;
  }, [mode, filtered, generations, cars, car]);

  return (
    <div>
      <PageHeader eyebrow="Alumni network" title="The people who built TSI">
        Every car carries the work of the batches before it. Here is where they are now.
      </PageHeader>

      <section className="border-b border-border bg-surface">
        <div className="section-x mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6 py-8">
          <dl className="flex gap-10">
            <Stat value={alumni.length} label="Alumni" />
            <Stat value={countries.length} label="Countries" />
            <Stat value={generations.length} label="Cars" />
          </dl>
          <Link
            to="/alumni/join"
            className="group inline-flex items-center gap-2 rounded bg-primary px-6 py-3 font-display text-sm tracking-widest text-primary-foreground"
          >
            ARE YOU A TSI ALUM? JOIN THE NETWORK
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </section>

      <div className="section-x mx-auto max-w-7xl py-10 md:py-14">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, company, city…"
              className="w-full rounded border border-input bg-surface py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            {countries.length > 0 && (
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="rounded border border-input bg-surface px-3 py-2.5 text-sm outline-none focus:border-primary"
              >
                <option value="">All countries</option>
                {countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
            <div className="flex rounded border border-input p-0.5 text-xs">
              {(["car", "year"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`rounded px-3 py-2 font-display tracking-widest ${
                    mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  BY {m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>

        {generations.length > 0 && (
          <div className="hide-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
            <Chip active={car === null} onClick={() => setCar(null)}>
              All cars
            </Chip>
            {generations.map((g: Row) => (
              <Chip
                key={g.id}
                active={car === g.id}
                onClick={() => setCar(car === g.id ? null : g.id)}
              >
                {g.name}
              </Chip>
            ))}
          </div>
        )}

        {isLoading && <p className="mt-10 text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && filtered.length === 0 && (
          <p className="mt-10 text-sm text-muted-foreground">No alumni match these filters yet.</p>
        )}

        <div className="mt-10 space-y-14">
          {groups.map(([title, list]) => (
            <section key={title}>
              <Reveal>
                <h2 className="flex items-center gap-3 border-b border-border pb-3 text-2xl md:text-4xl">
                  {title}
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 font-mono text-xs text-primary-foreground">
                    {list.length}
                  </span>
                </h2>
              </Reveal>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {list.map((a) => (
                  <AlumniCard
                    key={`${title}-${a.id}`}
                    a={a}
                    carNames={
                      (cars[a.id] ?? []).map((id) => genName[id]).filter(Boolean) as string[]
                    }
                    email={emails[a.id]}
                    onOpen={() => setOpen(a)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {open && (
        <ProfileDialog
          a={open}
          carNames={(cars[open.id] ?? []).map((id) => genName[id]).filter(Boolean) as string[]}
          email={emails[open.id]}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-muted-foreground">{label}</dt>
      <dd className="font-display text-4xl text-primary">{value}</dd>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-4 py-1.5 font-display text-xs tracking-widest transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:border-primary hover:text-primary"
      }`}
    >
      {children.toUpperCase()}
    </button>
  );
}

function Avatar({ a, size }: { a: AlumniProfile; size: string }) {
  return a.photo_url ? (
    <Thumb
      src={a.photo_url}
      alt={a.name}
      className={`${size} shrink-0 rounded-full object-cover ring-2 ring-border transition-all group-hover:ring-primary`}
    />
  ) : (
    <div
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-surface-2 font-display text-xl text-primary ring-2 ring-border group-hover:ring-primary`}
    >
      {initials(a.name)}
    </div>
  );
}

function jobLine(a: AlumniProfile) {
  return [a.current_role_text, a.company].filter(Boolean).join(" @ ");
}

function place(a: AlumniProfile) {
  return [a.city, a.country].filter(Boolean).join(", ");
}

function AlumniCard({
  a,
  carNames,
  email,
  onOpen,
}: {
  a: AlumniProfile;
  carNames: string[];
  email?: string | undefined;
  onOpen: () => void;
}) {
  return (
    <div className="group flex h-full gap-4 rounded border border-border bg-surface p-4 transition-colors hover:border-primary">
      <button onClick={onOpen} className="shrink-0" aria-label={`Open ${a.name}'s profile`}>
        <Avatar a={a} size="h-16 w-16" />
      </button>
      <div className="min-w-0 flex-1">
        <button onClick={onOpen} className="text-left">
          <h3 className="text-base leading-tight hover:text-primary">{a.name}</h3>
        </button>
        {a.position && (
          <p className="mt-0.5 text-xs uppercase tracking-widest text-primary">{a.position}</p>
        )}
        {jobLine(a) && <p className="mt-1 line-clamp-2 text-sm">{jobLine(a)}</p>}
        {place(a) && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {place(a)}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {carNames.map((n) => (
            <span
              key={n}
              className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase text-muted-foreground"
            >
              {n}
            </span>
          ))}
          <span className="ml-auto flex gap-2">
            {a.linkedin_url && (
              <a
                href={externalUrl(a.linkedin_url)}
                target="_blank"
                rel="noreferrer"
                aria-label={`${a.name} on LinkedIn`}
                className="text-muted-foreground hover:text-primary"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            )}
            {email && (
              <button
                onClick={onOpen}
                aria-label={`Email ${a.name}`}
                title="Show email"
                className="text-muted-foreground hover:text-primary"
              >
                <Mail className="h-4 w-4" />
              </button>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

function ProfileDialog({
  a,
  carNames,
  email,
  onClose,
}: {
  a: AlumniProfile;
  carNames: string[];
  email?: string | undefined;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const [copied, setCopied] = useState(false);
  const years = [a.joined_year, a.graduation_year].filter(Boolean).join(" – ");

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm sm:items-center sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="group relative w-full max-w-lg rounded-t-lg border border-border bg-surface p-6 sm:rounded-lg"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full border border-border p-1.5 hover:border-primary hover:text-primary"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-5 pr-8">
          <Avatar a={a} size="h-24 w-24" />
          <div className="min-w-0">
            <h3 className="text-2xl leading-tight">{a.name}</h3>
            {a.position && (
              <p className="mt-1 text-xs uppercase tracking-widest text-primary">{a.position}</p>
            )}
            {(a.subteam || years) && (
              <p className="mt-1 text-xs text-muted-foreground">
                {[a.subteam, years].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>

        {carNames.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {carNames.map((n) => (
              <span
                key={n}
                className="rounded-full bg-primary/15 px-3 py-1 font-mono text-xs uppercase text-primary"
              >
                {n}
              </span>
            ))}
          </div>
        )}

        {(jobLine(a) || a.industry || place(a)) && (
          <div className="mt-5 space-y-1 border-t border-border pt-5 text-sm">
            {jobLine(a) && <p className="text-base">{jobLine(a)}</p>}
            {a.industry && <p className="text-muted-foreground">{a.industry}</p>}
            {place(a) && (
              <p className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {place(a)}
              </p>
            )}
          </div>
        )}

        {a.message && (
          <blockquote className="mt-5 border-l-2 border-primary pl-4 text-sm italic text-muted-foreground">
            “{a.message}”
          </blockquote>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          {a.linkedin_url && (
            <a
              href={externalUrl(a.linkedin_url)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2 font-display text-xs tracking-widest text-primary-foreground"
            >
              <Linkedin className="h-4 w-4" /> LINKEDIN
            </a>
          )}
          {email && (
            <a
              href={gmailCompose(email)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded border border-border px-4 py-2 font-display text-xs tracking-widest hover:border-primary hover:text-primary"
            >
              <Mail className="h-4 w-4" /> EMAIL IN GMAIL
            </a>
          )}
        </div>
        {email && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded border border-border px-3 py-2 text-sm">
            <span className="select-all break-all">{email}</span>
            <button
              onClick={() => {
                void navigator.clipboard.writeText(email).then(() => setCopied(true));
              }}
              className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
