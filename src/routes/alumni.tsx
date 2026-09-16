import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Reveal } from "@/components/Reveal";
import { listQuery, type Row } from "@/lib/db";

export const Route = createFileRoute("/alumni")({
  head: () => ({
    meta: [
      { title: "Alumni — Team Saksham International" },
      {
        name: "description",
        content:
          "Former members of Team Saksham International, grouped by graduating batch, and where they are now.",
      },
      { property: "og:title", content: "Alumni — Team Saksham International" },
      {
        property: "og:description",
        content: "The people who built TSI before us, batch by batch.",
      },
    ],
  }),
  component: Alumni,
});

function Alumni() {
  const { data: alumni = [], isLoading } = useQuery(listQuery("alumni"));

  const batches = useMemo(() => {
    const map: Record<string, Row[]> = {};
    for (const a of alumni as Row[]) {
      (map[a.batch_year ?? "Other"] ??= []).push(a);
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [alumni]);

  return (
    <div>
      <PageHeader eyebrow="Legacy" title="Alumni">
        Every season stands on the work of the batches before it.
      </PageHeader>

      <div className="section-x mx-auto max-w-7xl space-y-14 py-16 md:py-24">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && alumni.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Alumni will appear here once they are added in the admin panel.
          </p>
        )}

        {batches.map(([year, list]) => (
          <section key={year}>
            <Reveal>
              <h2 className="border-b border-border pb-3 text-2xl md:text-4xl">
                Batch <span className="text-primary">{year}</span>
              </h2>
            </Reveal>
            <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {list.map((a: Row, i: number) => (
                <Reveal key={a.id} delay={Math.min(i, 8) * 60}>
                  <div className="flex h-full gap-4 rounded border border-border bg-surface p-4 transition-colors hover:border-primary">
                    {a.photo_url ? (
                      <img
                        src={a.photo_url}
                        alt={a.name}
                        loading="lazy"
                        className="h-16 w-16 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded bg-surface-2 font-display text-2xl text-primary">
                        {String(a.name ?? "?").charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="text-base leading-tight">{a.name}</h3>
                      {a.position && (
                        <p className="mt-1 text-xs uppercase tracking-widest text-primary">
                          {a.position}
                        </p>
                      )}
                      {a.current_role_text && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {a.current_role_text}
                        </p>
                      )}
                      {a.linkedin_url && (
                        <a
                          href={a.linkedin_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block text-xs text-primary underline"
                        >
                          LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
