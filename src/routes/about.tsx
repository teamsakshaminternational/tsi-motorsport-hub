import { createFileRoute, Link } from "@tanstack/react-router";
import { HydrationBoundary, useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Reveal } from "@/components/Reveal";
import { content, listQuery, pageContentQuery, type Row } from "@/lib/db";
import { preloadQueries } from "@/lib/preload";

const MEDIA = "https://cazhbqmbtlvqcahgyvba.supabase.co/storage/v1/object/public/media";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Team Saksham International" },
      {
        name: "description",
        content:
          "Who we are: the Baja SAE team of VIT Chennai, our mission, and how we design and build off-road buggies each season.",
      },
      { property: "og:title", content: "About — Team Saksham International" },
      {
        property: "og:description",
        content: "The story, mission and workshop culture of TSI, VIT Chennai's Baja SAE team.",
      },
    ],
  }),
  loader: ({ context }) =>
    preloadQueries(context.queryClient, [pageContentQuery, listQuery("subteams")]),
  component: AboutPage,
});

function AboutPage() {
  const state = Route.useLoaderData();
  return (
    <HydrationBoundary state={state}>
      <About />
    </HydrationBoundary>
  );
}

function About() {
  const { data: cms } = useQuery(pageContentQuery);
  const { data: subteams = [] } = useQuery(listQuery("subteams"));

  return (
    <div>
      <PageHeader eyebrow="Who we are" title={content(cms, "about_title", "About the team")}>
        {content(
          cms,
          "about_intro",
          "The official BAJA SAE team of VIT Chennai. Every season a new group of students takes a blank sheet and turns it into a competition-ready single-seat off-road vehicle.",
        )}
      </PageHeader>

      <section className="section-x mx-auto max-w-7xl pt-16 md:pt-24">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <p className="text-xs uppercase tracking-[0.3em] text-primary">Since 2012</p>
            <h2 className="mt-3 text-4xl md:text-5xl">
              Born from <span className="text-primary">two students</span>
            </h2>
            <p className="mt-5 whitespace-pre-line leading-relaxed text-muted-foreground">
              {content(
                cms,
                "about_body",
                "Team Saksham International is the official BAJA SAE team of VIT University Chennai. Every year, we design and manufacture an All-Terrain Vehicle and compete in national and international BAJA racing events.\n\nBorn in 2012 as the brainchild of two engineering students, TSI brings together engineers passionate about designing, analysing, manufacturing and marketing all-terrain vehicles. It is the synchronised work of our departments, towards one race car, that sets the team apart.",
              )}
            </p>
          </Reveal>
          <Reveal delay={120}>
            <img
              src={content(cms, "about_image", `${MEDIA}/site/band2.webp`)}
              alt="Team Saksham International buggy in the workshop"
              loading="lazy"
              decoding="async"
              className="aspect-4/3 w-full rounded border border-border object-cover"
            />
          </Reveal>
        </div>
      </section>

      <section className="section-x mx-auto max-w-7xl py-16 md:py-24">
        <div className="grid gap-10 md:grid-cols-2">
          <Reveal>
            <h2 className="text-3xl">
              Our <span className="text-primary">mission</span>
            </h2>
            <p className="mt-4 whitespace-pre-line text-muted-foreground">
              {content(
                cms,
                "about_mission",
                "To give engineering students the full experience of building a vehicle — design, analysis, fabrication, testing and racing — and to represent VIT Chennai at national and international Baja SAE events.",
              )}
            </p>
          </Reveal>
          <Reveal delay={120}>
            <h2 className="text-3xl">
              How we <span className="text-primary">work</span>
            </h2>
            <p className="mt-4 whitespace-pre-line text-muted-foreground">
              {content(
                cms,
                "about_process",
                "The season runs on a tight loop: concept and rulebook study, CAD and simulation, manufacturing in the workshop, then weeks of testing on dirt before the competition. Nothing leaves the bay until it has been validated.",
              )}
            </p>
          </Reveal>
        </div>

        {subteams.length > 0 && (
          <div className="mt-16">
            <Reveal>
              <h2 className="text-3xl">
                Our <span className="text-primary">subteams</span>
              </h2>
            </Reveal>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {subteams.map((s: Row, i: number) => (
                <Reveal key={s.id} delay={i * 80}>
                  <div className="h-full rounded border border-border bg-surface p-6 transition-colors hover:border-primary">
                    <h3 className="text-xl text-primary">{s.name}</h3>
                    {s.description && (
                      <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="relative min-h-[26rem] overflow-hidden border-t border-border">
        <img
          src={content(cms, "about_team_image", `${MEDIA}/site/team_photo.webp`)}
          alt="Team Saksham International with their buggy"
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <div className="section-x relative mx-auto flex min-h-[26rem] max-w-7xl items-end pb-10">
          <Reveal>
            <h2 className="text-4xl md:text-6xl">
              One team. <span className="text-primary">One machine.</span>
            </h2>
            <Link
              to="/alumni/join"
              className="mt-5 inline-flex rounded bg-primary px-6 py-3 font-display text-sm tracking-widest text-primary-foreground"
            >
              TSI ALUMNI? JOIN THE NETWORK
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
