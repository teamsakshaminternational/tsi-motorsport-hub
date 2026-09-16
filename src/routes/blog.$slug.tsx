import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { db, type Row } from "@/lib/db";

export const Route = createFileRoute("/blog/$slug")({
  head: () => ({
    meta: [
      { title: "Post — Team Saksham International Blog" },
      {
        name: "description",
        content: "A build log or race report from Team Saksham International.",
      },
      { property: "og:title", content: "Team Saksham International Blog" },
      {
        property: "og:description",
        content: "A build log or race report from Team Saksham International.",
      },
    ],
  }),
  component: BlogPost,
});

function BlogPost() {
  const { slug } = Route.useParams();
  const { data: post, isLoading } = useQuery<Row | null>({
    queryKey: ["blog_post", slug],
    queryFn: async () => {
      const { data, error } = await db
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return data ?? null;
    },
  });

  return (
    <article className="section-x mx-auto max-w-3xl py-16 md:py-24">
      <Link
        to="/blog"
        className="inline-flex items-center gap-2 font-display text-xs tracking-widest text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> ALL POSTS
      </Link>

      {isLoading && <p className="mt-8 text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && !post && (
        <p className="mt-8 text-sm text-muted-foreground">This post could not be found.</p>
      )}

      {post && (
        <>
          <p className="mt-8 font-mono text-xs uppercase tracking-widest text-primary">
            {[
              post.author,
              post.published_at
                ? new Date(post.published_at).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <h1 className="mt-3 text-3xl leading-tight md:text-5xl">{post.title}</h1>
          {post.cover_image_url && (
            <img
              src={post.cover_image_url}
              alt={post.title}
              className="mt-8 w-full rounded object-cover"
            />
          )}
          <div className="mt-8 whitespace-pre-line text-base leading-relaxed text-muted-foreground">
            {post.content}
          </div>
        </>
      )}
    </article>
  );
}
