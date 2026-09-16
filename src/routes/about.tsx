import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Reveal } from "@/components/Reveal";
import { content, listQuery, pageContentQuery, type Row } from "@/lib/db";

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
  component: About,
});

function About() {
  const { data: cms } = useQuery(pageContentQuery);
  const { data: subteams = [] } = useQuery(listQuery("subteams"));

  return (
    <div>
      <PageHeader eyebrow="Who we are" title={content(cms, "about_title", "About the team")}>
        {content(
          cms,
          "about_intro",
          "Team Saksham International (TSI) is the Baja SAE team of Vellore Institute of Technology, Chennai. Every season a new group of students takes a blank sheet and turns it into a competition-ready single-seat off-road vehicle.",
        )}
      </PageHeader>

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
    </div>
  );
}
