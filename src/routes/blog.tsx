import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Reveal } from "@/components/Reveal";
import { listQuery, type Row } from "@/lib/db";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Blog — Team Saksham International" },
      {
        name: "description",
        content:
          "Build logs, design deep-dives and race reports written by the members of Team Saksham International.",
      },
      { property: "og:title", content: "Blog — Team Saksham International" },
      {
        property: "og:description",
        content: "Build logs and race reports from the TSI workshop.",
      },
    ],
  }),
  component: Blog,
});

function Blog() {
  const { data: posts = [], isLoading } = useQuery(
    listQuery("blog_posts", { order: "sort_order", filters: { published: true } }),
  );

  return (
    <div>
      <PageHeader eyebrow="From the workshop" title="Blog">
        Build logs, design notes and race reports.
      </PageHeader>

      <div className="section-x mx-auto max-w-5xl py-16 md:py-24">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && posts.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Posts will appear here once they are published in the admin panel.
          </p>
        )}
        <div className="grid gap-6 md:grid-cols-2">
          {posts.map((p: Row, i: number) => (
            <Reveal key={p.id} delay={Math.min(i, 6) * 80}>
              <Link
                to="/blog/$slug"
                params={{ slug: p.slug }}
                className="group flex h-full flex-col overflow-hidden rounded border border-border bg-surface transition-colors hover:border-primary"
              >
                {p.cover_image_url && (
                  <img
                    src={p.cover_image_url}
                    alt={p.title}
                    loading="lazy"
                    className="h-48 w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                )}
                <div className="flex flex-1 flex-col p-5">
                  <p className="font-mono text-xs uppercase tracking-widest text-primary">
                    {[
                      p.author,
                      p.published_at
                        ? new Date(p.published_at).toLocaleDateString(undefined, {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <h2 className="mt-2 text-xl">{p.title}</h2>
                  {p.excerpt && (
                    <p className="mt-2 text-sm text-muted-foreground">{p.excerpt}</p>
                  )}
                  <span className="mt-4 font-display text-xs tracking-widest text-primary">
                    READ MORE
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
