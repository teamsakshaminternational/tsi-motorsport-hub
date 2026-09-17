import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Reveal } from "@/components/Reveal";
import { listQuery, type Row } from "@/lib/db";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Team — Team Saksham International" },
      {
        name: "description",
        content:
          "Meet the members of Team Saksham International, grouped by subteam: drivetrain, suspension, chassis, electronics and management.",
      },
      { property: "og:title", content: "Team — Team Saksham International" },
      {
        property: "og:description",
        content: "The students behind TSI, subteam by subteam.",
      },
    ],
  }),
  component: Team,
});

function initials(name: unknown) {
  return String(name ?? "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function MemberCard({ m }: { m: Row }) {
  return (
    <div className="group h-full overflow-hidden rounded border border-border bg-surface transition-colors hover:border-primary">
      {m.photo_url ? (
        <img
          src={m.photo_url}
          alt={m.name}
          loading="lazy"
          className="aspect-3/4 w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="flex aspect-3/4 items-center justify-center bg-surface-2 font-display text-4xl text-primary">
          {initials(m.name)}
        </div>
      )}
      <div className="p-4">
        <h3 className="text-base leading-tight">{m.name}</h3>
        {m.position && (
          <p className="mt-1 text-xs uppercase tracking-widest text-primary">{m.position}</p>
        )}
      </div>
    </div>
  );
}

function Team() {
  const { data: subteams = [], isLoading } = useQuery(listQuery("subteams"));
  const { data: members = [] } = useQuery(listQuery("members"));

  const grouped = useMemo(() => {
    const map: Record<string, Row[]> = {};
    for (const m of members as Row[]) {
      (map[m.subteam_id ?? "none"] ??= []).push(m);
    }
    return map;
  }, [members]);

  const unassigned = grouped["none"] ?? [];

  return (
    <div>
      <PageHeader eyebrow="The crew" title="Our team">
        The students who design, build, test and race the car every season.
      </PageHeader>

      <div className="section-x mx-auto max-w-7xl space-y-16 py-16 md:py-24">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && subteams.length === 0 && members.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Team members will appear here once they are added in the admin panel.
          </p>
        )}

        {subteams.map((s: Row) => {
          const list = grouped[s.id] ?? [];
          if (list.length === 0) return null;
          return (
            <section key={s.id}>
              <Reveal>
                <h2 className="border-b border-border pb-3 text-2xl md:text-4xl">
                  {s.name}
                  <span className="ml-3 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-2 align-middle font-mono text-xs text-primary-foreground">
                    {list.length}
                  </span>
                </h2>
                {s.description && (
                  <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{s.description}</p>
                )}
              </Reveal>
              <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                {list.map((m: Row, i: number) => (
                  <Reveal key={m.id} delay={Math.min(i, 8) * 60}>
                    <MemberCard m={m} />
                  </Reveal>
                ))}
              </div>
            </section>
          );
        })}

        {unassigned.length > 0 && (
          <section>
            <Reveal>
              <h2 className="border-b border-border pb-3 text-2xl md:text-4xl">Team</h2>
            </Reveal>
            <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {unassigned.map((m: Row, i: number) => (
                <Reveal key={m.id} delay={Math.min(i, 8) * 60}>
                  <MemberCard m={m} />
                </Reveal>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
