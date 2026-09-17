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

      {generations.length > 1 && (
        <nav className="sticky top-[4.5rem] z-30 border-b border-border bg-background/90 backdrop-blur-md">
          <div className="hide-scrollbar section-x mx-auto flex max-w-7xl gap-2 overflow-x-auto py-3">
            {generations.map((g: Row) => (
              <a
                key={g.id}
                href={`#${g.id}`}
                className="shrink-0 rounded-full border border-border px-4 py-1.5 font-display text-xs tracking-widest text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                {String(g.name).toUpperCase()}
              </a>
            ))}
          </div>
        </nav>
      )}

      <div className="section-x mx-auto max-w-7xl py-12 md:py-20">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && generations.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Car generations will appear here once they are added in the admin panel.
          </p>
        )}

        <div className="space-y-20 md:space-y-28">
          {generations.map((g: Row, gi: number) => {
            const gPhotos = byGeneration[g.id] ?? [];
            return (
              <section key={g.id} id={g.id} className="scroll-mt-32">
                <Reveal>
                  <div className="relative overflow-hidden rounded border border-border">
                    {g.cover_image_url ? (
                      <img
                        src={g.cover_image_url}
                        alt={`${g.name} Baja buggy`}
                        loading={gi === 0 ? "eager" : "lazy"}
                        decoding="async"
                        className="aspect-[16/7] w-full object-cover"
                      />
                    ) : (
                      <div className="aspect-[16/7] w-full bg-surface-2" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-3 p-5 md:p-8">
                      <div>
                        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
                          {g.year || `Generation ${String(gi + 1).padStart(2, "0")}`}
                        </p>
                        <h2 className="mt-1 text-4xl md:text-7xl">{g.name}</h2>
                      </div>
                      <span className="rounded-full bg-background/80 px-3 py-1 font-mono text-xs text-muted-foreground">
                        {gPhotos.length} photo{gPhotos.length === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                  {g.description && (
                    <p className="mt-5 max-w-3xl text-sm text-muted-foreground">{g.description}</p>
                  )}
                </Reveal>

                {gPhotos.length === 0 ? (
                  <p className="mt-6 text-sm text-muted-foreground">No photos yet.</p>
                ) : (
                  <div className="mt-6 columns-2 gap-3 md:columns-3 lg:columns-4 [&>*]:mb-3">
                    {gPhotos.map((p: Row, i: number) => (
                      <button
                        key={p.id}
                        onClick={() => setActive({ gen: g.id, index: i })}
                        className="group block w-full break-inside-avoid overflow-hidden rounded border border-border bg-surface"
                        aria-label={p.caption ?? `Open photo ${i + 1} of ${g.name}`}
                      >
                        <img
                          src={p.image_url}
                          alt={p.caption ?? `${g.name} photo ${i + 1}`}
                          loading="lazy"
                          decoding="async"
                          className="w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      </button>
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
