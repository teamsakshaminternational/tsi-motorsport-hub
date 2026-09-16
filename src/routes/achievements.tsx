import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Reveal } from "@/components/Reveal";
import { listQuery, type Row } from "@/lib/db";

export const Route = createFileRoute("/achievements")({
  head: () => ({
    meta: [
      { title: "Achievements — Team Saksham International" },
      {
        name: "description",
        content:
          "Competition results, awards and milestones earned by Team Saksham International at Baja SAE events.",
      },
      { property: "og:title", content: "Achievements — Team Saksham International" },
      {
        property: "og:description",
        content: "Every podium, award and milestone from TSI's Baja SAE seasons.",
      },
    ],
  }),
  component: Achievements,
});

function Achievements() {
  const { data: items = [], isLoading } = useQuery(listQuery("achievements"));

  return (
    <div>
      <PageHeader eyebrow="Track record" title="Achievements">
        Results, awards and milestones from the seasons we have raced.
      </PageHeader>

      <section className="section-x mx-auto max-w-5xl py-16 md:py-24">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Achievements will appear here once they are added in the admin panel.
          </p>
        )}
        <ol className="relative space-y-8 border-l border-border pl-6">
          {items.map((a: Row, i: number) => (
            <Reveal as="li" key={a.id} delay={i * 70}>
              <span className="absolute -left-[9px] mt-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary" />
              <div className="rounded border border-border bg-surface p-6 transition-colors hover:border-primary">
                <div className="flex flex-wrap items-center gap-3">
                  <Trophy className="h-4 w-4 text-primary" />
                  <p className="font-mono text-xs uppercase tracking-widest text-primary">
                    {[a.event, a.year].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <h2 className="mt-3 text-2xl">{a.title}</h2>
                {a.position && (
                  <p className="mt-1 font-display text-3xl text-primary">{a.position}</p>
                )}
                {a.description && (
                  <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
                    {a.description}
                  </p>
                )}
                {a.image_url && (
                  <img
                    src={a.image_url}
                    alt={a.title}
                    loading="lazy"
                    className="mt-4 h-56 w-full rounded object-cover"
                  />
                )}
              </div>
            </Reveal>
          ))}
        </ol>
      </section>
    </div>
  );
}
