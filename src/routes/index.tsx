import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/Reveal";
import { content, listQuery, pageContentQuery, type Row } from "@/lib/db";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Team Saksham International — Baja SAE, VIT Chennai" },
      {
        name: "description",
        content:
          "Team Saksham International designs and builds off-road Baja SAE buggies at VIT Chennai. Explore our cars, achievements, team and sponsors.",
      },
      { property: "og:title", content: "Team Saksham International — Baja SAE, VIT Chennai" },
      {
        property: "og:description",
        content: "Student-built off-road racing machines from VIT Chennai.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: cms } = useQuery(pageContentQuery);
  const { data: achievements = [] } = useQuery(listQuery("achievements"));
  const { data: generations = [] } = useQuery(listQuery("generations"));
  const { data: sponsors = [] } = useQuery(listQuery("sponsors"));

  const heroImage =
    content(cms, "home_hero_image", "") ||
    (generations.find((g: Row) => g.cover_image_url)?.cover_image_url as string | undefined) ||
    "/hero-buggy.webp";

  return (
    <div>
      <section className="relative overflow-hidden border-b border-border">
        <img
          src={heroImage}
          alt="Team Saksham International Baja buggy"
          className="absolute inset-0 h-full w-full object-cover object-right opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/75 to-background/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        <div className="section-x relative mx-auto flex min-h-[78vh] max-w-7xl flex-col justify-center py-20">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-[0.4em] text-primary">
              {content(cms, "home_eyebrow", "Baja SAE · VIT Chennai")}
            </p>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mt-5 text-5xl leading-[0.9] sm:text-7xl xl:text-8xl">
              {content(cms, "home_title_line1", "Built for")}
              <br />
              <span className="text-primary">
                {content(cms, "home_title_line2", "the dirt")}
              </span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
              {content(
                cms,
                "home_subtitle",
                "Team Saksham International is the Baja SAE team of VIT Chennai — students designing, fabricating and racing single-seat off-road buggies from the ground up.",
              )}
            </p>
          </Reveal>
          <Reveal delay={240}>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/gallery"
                className="group inline-flex items-center gap-2 rounded bg-primary px-6 py-3 font-display text-sm tracking-widest text-primary-foreground transition-transform hover:scale-[1.03]"
              >
                SEE THE CARS
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/sponsors"
                className="inline-flex items-center rounded border border-border px-6 py-3 font-display text-sm tracking-widest text-foreground transition-colors hover:border-primary hover:text-primary"
              >
                PARTNER WITH US
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-b border-border bg-surface">
        <div className="section-x mx-auto grid max-w-7xl grid-cols-2 gap-6 py-12 md:grid-cols-4">
          {[
            { value: String(generations.length), label: "Generations built" },
            { value: String(achievements.length), label: "Achievements" },
            { value: String(sponsors.length), label: "Partners" },
            { value: content(cms, "home_stat_since", "2015"), label: "Racing since" },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 80}>
              <div className="font-display text-4xl text-primary md:text-5xl">{s.value}</div>
              <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">
                {s.label}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section-x mx-auto max-w-7xl py-16 md:py-24">
        <Reveal>
          <h2 className="text-3xl md:text-5xl">
            Latest <span className="text-primary">highlights</span>
          </h2>
        </Reveal>
        {achievements.length === 0 ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Highlights will appear here once they are added in the admin panel.
          </p>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {achievements.slice(0, 3).map((a: Row, i: number) => (
              <Reveal key={a.id} delay={i * 100}>
                <article className="group h-full overflow-hidden rounded border border-border bg-surface transition-colors hover:border-primary">
                  {a.image_url && (
                    <img
                      src={a.image_url}
                      alt={a.title}
                      loading="lazy"
                      className="h-48 w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  )}
                  <div className="p-5">
                    <p className="font-mono text-xs uppercase tracking-widest text-primary">
                      {[a.event, a.year].filter(Boolean).join(" · ")}
                    </p>
                    <h3 className="mt-2 text-xl">{a.title}</h3>
                    {a.position && (
                      <p className="mt-1 font-display text-2xl text-primary">{a.position}</p>
                    )}
                    {a.description && (
                      <p className="mt-2 text-sm text-muted-foreground">{a.description}</p>
                    )}
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        )}
        <Reveal className="mt-10">
          <Link
            to="/achievements"
            className="inline-flex items-center gap-2 font-display text-sm tracking-widest text-primary"
          >
            ALL ACHIEVEMENTS <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </section>

      {sponsors.length > 0 && (
        <section className="border-t border-border bg-surface">
          <div className="section-x mx-auto max-w-7xl py-14">
            <Reveal>
              <h2 className="text-2xl md:text-3xl">
                Backed <span className="text-primary">by</span>
              </h2>
            </Reveal>
            <div className="mt-8 flex flex-wrap items-center gap-8">
              {sponsors.map((s: Row, i: number) => (
                <Reveal key={s.id} delay={i * 60}>
                  {s.logo_url ? (
                    <img
                      src={s.logo_url}
                      alt={s.name}
                      loading="lazy"
                      className="h-12 w-auto opacity-80 transition-opacity hover:opacity-100"
                    />
                  ) : (
                    <span className="font-display text-lg text-muted-foreground">{s.name}</span>
                  )}
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
