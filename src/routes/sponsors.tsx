import { createFileRoute } from "@tanstack/react-router";
import { HydrationBoundary, useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Reveal } from "@/components/Reveal";
import { Copy, Mail } from "lucide-react";
import { toast } from "sonner";
import { externalUrl, gmailCompose } from "@/lib/alumni";
import { content, listQuery, pageContentQuery, type Row } from "@/lib/db";
import { preloadQueries } from "@/lib/preload";

export const Route = createFileRoute("/sponsors")({
  head: () => ({
    meta: [
      { title: "Sponsors — Team Saksham International" },
      {
        name: "description",
        content:
          "The partners and sponsors who make Team Saksham International's Baja SAE campaign possible, and how to join them.",
      },
      { property: "og:title", content: "Sponsors — Team Saksham International" },
      {
        property: "og:description",
        content: "Meet our partners and find out how to support the team.",
      },
    ],
  }),
  loader: ({ context }) =>
    preloadQueries(context.queryClient, [listQuery("sponsors"), pageContentQuery]),
  component: SponsorsPage,
});

function SponsorsPage() {
  const state = Route.useLoaderData();
  return (
    <HydrationBoundary state={state}>
      <Sponsors />
    </HydrationBoundary>
  );
}

function Sponsors() {
  const { data: sponsors = [], isLoading } = useQuery(listQuery("sponsors"));
  const { data: cms } = useQuery(pageContentQuery);
  const sponsorEmail = content(cms, "contact_email", "teamsakshaminternational@gmail.com");

  const tiers = sponsors.reduce((acc: Record<string, Row[]>, s: Row) => {
    (acc[s.tier || "Partners"] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader eyebrow="Partners" title="Sponsors">
        {content(
          cms,
          "sponsors_intro",
          "Every bolt, weld and race entry is made possible by our sponsors. Their support turns student designs into machines that race.",
        )}
      </PageHeader>

      <div className="section-x mx-auto max-w-7xl space-y-14 py-16 md:py-24">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && sponsors.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Sponsors will appear here once they are added in the admin panel.
          </p>
        )}

        {Object.entries(tiers).map(([tier, list]) => (
          <section key={tier}>
            <Reveal>
              <h2 className="border-b border-border pb-3 text-2xl md:text-4xl">{tier}</h2>
            </Reveal>
            <div className="mt-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {(list as Row[]).map((s: Row, i: number) => (
                <Reveal key={s.id} delay={Math.min(i, 8) * 60}>
                  <a
                    href={externalUrl(s.website_url) || undefined}
                    target={s.website_url ? "_blank" : undefined}
                    rel="noreferrer"
                    className="flex h-32 items-center justify-center rounded border border-border bg-surface p-5 transition-colors hover:border-primary"
                  >
                    {s.logo_url ? (
                      <img
                        src={s.logo_url}
                        alt={s.name}
                        loading="lazy"
                        className="max-h-20 w-auto object-contain"
                      />
                    ) : (
                      <span className="font-display text-lg">{s.name}</span>
                    )}
                  </a>
                </Reveal>
              ))}
            </div>
          </section>
        ))}

        <Reveal>
          <div className="rounded border border-primary/40 bg-surface p-8">
            <h2 className="text-2xl md:text-3xl">
              Become a <span className="text-primary">sponsor</span>
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              {content(
                cms,
                "sponsors_cta",
                "Support the next generation of engineers and put your brand on a car that races across India. Get in touch to receive our sponsorship brochure.",
              )}
            </p>
            <p className="mt-4 font-display text-lg text-primary">
              {sponsorEmail}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={gmailCompose(sponsorEmail, "Sponsorship enquiry - Team Saksham International")}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded bg-primary px-6 py-3 font-display text-sm tracking-widest text-primary-foreground"
              >
                <Mail className="h-4 w-4" /> EMAIL US
              </a>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(sponsorEmail)
                    .then(() => toast.success("Email address copied"));
                }}
                className="inline-flex items-center gap-2 rounded border border-border px-6 py-3 font-display text-sm tracking-widest hover:border-primary hover:text-primary"
              >
                <Copy className="h-4 w-4" /> COPY ADDRESS
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
