import { createFileRoute, Link } from "@tanstack/react-router";
import { HydrationBoundary, useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { useRef } from "react";
import { CountUp } from "@/components/CountUp";
import { Reveal } from "@/components/Reveal";
import { content, listQuery, pageContentQuery, type Row } from "@/lib/db";
import { preloadQueries } from "@/lib/preload";
import { Thumb } from "@/components/Thumb";

const mediaBase = "https://cazhbqmbtlvqcahgyvba.supabase.co/storage/v1/object/public/media";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Team Saksham International — Baja SAE, VIT Chennai" },
      { name: "description", content: "Team Saksham International designs and builds off-road Baja SAE buggies at VIT Chennai. Explore our cars, achievements, team and sponsors." },
      { property: "og:title", content: "Team Saksham International — Baja SAE, VIT Chennai" },
      { property: "og:description", content: "Student-built off-road racing machines from VIT Chennai." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) =>
    preloadQueries(context.queryClient, [pageContentQuery, listQuery("achievements"), listQuery("generations"), listQuery("sponsors"), listQuery("alumni")]),
  component: HomePage,
});

function HomePage() {
  const state = Route.useLoaderData();
  return (
    <HydrationBoundary state={state}>
      <Home />
    </HydrationBoundary>
  );
}

function Home() {
  const { data: cms } = useQuery(pageContentQuery);
  const { data: achievements = [] } = useQuery(listQuery("achievements"));
  const { data: generations = [] } = useQuery(listQuery("generations"));
  const { data: sponsors = [] } = useQuery(listQuery("sponsors"));
  const { data: alumni = [] } = useQuery(listQuery("alumni"));
  const stripRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, start: 0, scroll: 0 });

  const heroImage = content(cms, "home_hero_image", "") || "/hero-buggy.webp";
  const marqueeSponsors = sponsors.length > 1 ? [...sponsors, ...sponsors] : sponsors;

  return (
    <div>
      <section className="relative min-h-[calc(100svh-4.5rem)] overflow-hidden border-b border-border">
        <img src={heroImage} alt="Team Saksham International Baja buggy" decoding="async" className="hero-ken-burns absolute inset-0 h-full w-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/20" />
        <div className="section-x relative mx-auto flex min-h-[calc(100svh-4.5rem)] max-w-7xl items-center py-16">
          <div className="max-w-3xl">
            <Reveal><p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em] text-primary before:h-px before:w-10 before:bg-primary">Baja SAE · VIT Chennai</p></Reveal>
            <Reveal delay={80}>
              <h1 className="mt-6 text-6xl leading-[0.86] sm:text-7xl lg:text-9xl">
                {content(cms, "home_title_line1", "Built for")}<br />
                <span className="text-stroke-accent">{content(cms, "home_title_line2", "the dirt")}</span>
              </h1>
            </Reveal>
            <Reveal delay={150}><p className="mt-7 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">{content(cms, "home_subtitle", "Team Saksham International is the Baja SAE team of VIT Chennai — students designing, fabricating and racing single-seat off-road buggies from the ground up.")}</p></Reveal>
            <Reveal delay={220}>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link to="/gallery" className="group inline-flex items-center gap-2 rounded bg-primary px-6 py-3 font-display text-sm tracking-widest text-primary-foreground transition-transform hover:scale-[1.03]">SEE THE CARS <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
                <Link to="/about" className="inline-flex items-center rounded border border-border px-6 py-3 font-display text-sm tracking-widest text-foreground transition-colors hover:border-primary hover:text-primary">OUR STORY</Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-surface">
        <div className="section-x mx-auto grid max-w-7xl grid-cols-2 gap-x-5 gap-y-8 py-10 md:grid-cols-4 md:py-12">
          {[
            { value: generations.length, label: "Cars built" },
            { value: alumni.length, label: "Alumni" },
            { value: achievements.length, label: "Competitions" },
          ].map((stat, index) => <Reveal key={stat.label} delay={index * 70}><div className="font-display text-4xl text-primary md:text-5xl"><CountUp value={stat.value} /></div><div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">{stat.label}</div></Reveal>)}
          <Reveal delay={210}><div className="font-display text-4xl text-primary md:text-5xl">2012</div><div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">Since</div></Reveal>
        </div>
      </section>

      {generations.length > 0 && <section className="py-16 md:py-24">
        <div className="section-x mx-auto flex max-w-7xl items-end justify-between gap-4"><Reveal><p className="text-xs uppercase tracking-[0.3em] text-primary">Built generation by generation</p><h2 className="mt-3 text-4xl md:text-6xl">The machines</h2></Reveal><span className="hidden text-xs uppercase tracking-widest text-muted-foreground sm:block">Drag to explore</span></div>
        <div ref={stripRef} className="hide-scrollbar mt-9 flex cursor-grab snap-x snap-mandatory gap-4 overflow-x-auto px-5 active:cursor-grabbing md:px-10 xl:px-[max(4rem,calc((100vw-80rem)/2))]" onPointerDown={(e) => { const node = stripRef.current; if (!node) return; drag.current = { active: true, start: e.clientX, scroll: node.scrollLeft }; node.setPointerCapture(e.pointerId); }} onPointerMove={(e) => { const node = stripRef.current; if (!node || !drag.current.active) return; node.scrollLeft = drag.current.scroll - (e.clientX - drag.current.start); }} onPointerUp={() => { drag.current.active = false; }} onPointerCancel={() => { drag.current.active = false; }}>
          {generations.map((g: Row) => <Link key={g.id} to="/gallery" hash={g.id} className="group relative block aspect-[4/5] w-[78vw] max-w-sm shrink-0 snap-start overflow-hidden rounded border border-border bg-surface sm:w-[42vw] lg:w-[28vw]">
            {g.cover_image_url ? <Thumb src={g.cover_image_url} alt={`${g.name} Baja buggy`} draggable={false} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" /> : <div className="h-full w-full bg-surface-2" />}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5"><p className="text-xs uppercase tracking-[0.25em] text-primary">{g.year}</p><h3 className="mt-1 text-3xl">{g.name}</h3></div>
          </Link>)}
        </div>
      </section>}

      <section className="relative flex min-h-72 items-center justify-center overflow-hidden bg-fixed bg-cover bg-center px-5 text-center md:min-h-96" style={{ backgroundImage: `url(${content(cms, "home_quote_image", `${mediaBase}/site/band1.webp`)})` }}>
        <div className="absolute inset-0 bg-background/65" /><Reveal className="relative"><blockquote className="max-w-5xl font-display text-4xl uppercase leading-tight md:text-7xl">“When in doubt, <span className="text-primary">throttle it out.</span>”</blockquote></Reveal>
      </section>

      <section className="section-x mx-auto max-w-7xl py-16 md:py-24">
        <Reveal><p className="text-xs uppercase tracking-[0.3em] text-primary">Track record</p><h2 className="mt-3 text-4xl md:text-6xl">Latest achievements</h2></Reveal>
        <div className="mt-9 grid gap-5 md:grid-cols-3">{achievements.slice(0, 3).map((a: Row, i: number) => <Reveal key={a.id} delay={i * 80}><article className="group h-full border-t-2 border-primary bg-surface p-6"><p className="text-xs uppercase tracking-widest text-primary">{a.year}</p><p className="mt-5 font-display text-4xl text-primary">{a.position}</p><h3 className="mt-2 text-2xl">{a.title || a.event}</h3>{a.description && <p className="mt-3 text-sm text-muted-foreground">{a.description}</p>}</article></Reveal>)}</div>
        <Reveal className="mt-8"><Link to="/achievements" className="inline-flex items-center gap-2 font-display text-sm tracking-widest text-primary">ALL ACHIEVEMENTS <ArrowRight className="h-4 w-4" /></Link></Reveal>
      </section>

      {sponsors.length > 0 && <section className="overflow-hidden border-y border-border bg-surface py-12"><Reveal className="section-x mx-auto max-w-7xl"><h2 className="text-3xl">Backed <span className="text-primary">by</span></h2></Reveal><div className="mt-8 overflow-hidden"><div className={`flex w-max gap-4 px-4 ${sponsors.length > 1 ? "sponsor-marquee" : "mx-auto"}`}>{marqueeSponsors.map((s: Row, i: number) => <div key={`${s.id}-${i}`} className="flex h-24 w-52 shrink-0 items-center justify-center rounded bg-foreground p-5">{s.logo_url ? <img src={s.logo_url} alt={s.name} loading="lazy" decoding="async" className="max-h-14 max-w-full object-contain" /> : <span className="font-display text-background">{s.name}</span>}</div>)}</div></div></section>}

      <section className="relative h-[28rem] overflow-hidden md:h-[min(56.25vw,90vh)]"><img src={content(cms, "home_crew_image", `${mediaBase}/site/team_photo.webp`)} alt="Team Saksham International crew" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover object-[center_20%]" /><div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/10 to-transparent" /><div className="section-x relative mx-auto flex h-full min-h-[28rem] max-w-7xl items-end pb-12 md:min-h-0"><Reveal><p className="text-xs uppercase tracking-[0.3em] text-primary">One team. One machine.</p><h2 className="mt-3 max-w-lg text-5xl leading-[0.9] md:text-7xl">Meet the crew</h2><Link to="/team" className="mt-7 inline-flex items-center gap-2 rounded bg-primary px-6 py-3 font-display text-sm tracking-widest text-primary-foreground">OUR TEAM <ArrowRight className="h-4 w-4" /></Link></Reveal></div></section>
    </div>
  );
}