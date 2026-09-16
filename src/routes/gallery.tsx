import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Reveal } from "@/components/Reveal";
import { Lightbox } from "@/components/Lightbox";
import { listQuery, type Row } from "@/lib/db";

export const Route = createFileRoute("/gallery")({
  head: () => ({
    meta: [
      { title: "Gallery — Cars of Team Saksham International" },
      {
        name: "description",
        content:
          "Photo gallery of every Team Saksham International buggy, grouped by generation, from CAD to competition.",
      },
      { property: "og:title", content: "Gallery — Cars of Team Saksham International" },
      {
        property: "og:description",
        content: "Every TSI buggy generation in photos: build, testing and race day.",
      },
    ],
  }),
  component: Gallery,
});

function Gallery() {
  const { data: generations = [], isLoading } = useQuery(listQuery("generations"));
  const { data: photos = [] } = useQuery(listQuery("generation_photos"));
  const [active, setActive] = useState<{ gen: string; index: number } | null>(null);

  const byGeneration = useMemo(() => {
    const map: Record<string, Row[]> = {};
    for (const p of photos as Row[]) {
      (map[p.generation_id] ??= []).push(p);
    }
    return map;
  }, [photos]);

  const activeItems = active ? (byGeneration[active.gen] ?? []) : [];

  return (
    <div>
      <PageHeader eyebrow="The machines" title="Gallery">
        Every generation of our buggy, from the first weld to the finish line.
      </PageHeader>

      <div className="section-x mx-auto max-w-7xl py-16 md:py-24">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && generations.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Car generations will appear here once they are added in the admin panel.
          </p>
        )}

        <div className="space-y-20">
          {generations.map((g: Row) => {
            const gPhotos = byGeneration[g.id] ?? [];
            return (
              <section key={g.id} id={g.id}>
                <Reveal>
                  <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
                    <div>
                      {g.year && (
                        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
                          {g.year}
                        </p>
                      )}
                      <h2 className="mt-1 text-3xl md:text-5xl">{g.name}</h2>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">
                      {gPhotos.length} photo{gPhotos.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  {g.description && (
                    <p className="mt-4 max-w-3xl text-sm text-muted-foreground">{g.description}</p>
                  )}
                </Reveal>

                {gPhotos.length === 0 ? (
                  <p className="mt-6 text-sm text-muted-foreground">No photos yet.</p>
                ) : (
                  <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                    {gPhotos.map((p: Row, i: number) => (
                      <Reveal key={p.id} delay={Math.min(i, 8) * 60}>
                        <button
                          onClick={() => setActive({ gen: g.id, index: i })}
                          className="group block w-full overflow-hidden rounded border border-border bg-surface"
                          aria-label={p.caption ?? `Open photo ${i + 1} of ${g.name}`}
                        >
                          <img
                            src={p.image_url}
                            alt={p.caption ?? `${g.name} photo ${i + 1}`}
                            loading="lazy"
                            className="aspect-4/3 w-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                        </button>
                      </Reveal>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>

      <Lightbox
        items={activeItems as { image_url: string; caption?: string | null }[]}
        index={active?.index ?? null}
        onClose={() => setActive(null)}
        onIndexChange={(i) => setActive((prev) => (prev ? { ...prev, index: i } : prev))}
      />
    </div>
  );
}
