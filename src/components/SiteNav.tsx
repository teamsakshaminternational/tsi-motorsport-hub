import { Link } from "@tanstack/react-router";
import { Instagram, Menu, X } from "lucide-react";

export const INSTAGRAM_URL = "https://www.instagram.com/teamsakshaminternational/";
import { useState } from "react";

const links = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/gallery", label: "Gallery" },
  { to: "/achievements", label: "Achievements" },
  { to: "/team", label: "Team" },
  { to: "/alumni", label: "Alumni" },
  { to: "/sponsors", label: "Sponsors" },
  { to: "/blog", label: "Blog" },
] as const;

export function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="section-x mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between">
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <img
            src="/tsi-logo.webp"
            alt="TSI logo"
            width={640}
            height={383}
            loading="eager"
            decoding="async"
            className="h-10 w-auto sm:h-11"
          />
          <span className="flex flex-col font-display leading-none tracking-wide">
            <span className="text-base sm:text-lg">
              TEAM <span className="text-primary">SAKSHAM</span>
            </span>
            <span className="mt-1 text-[0.65rem] tracking-[0.24em] text-muted-foreground sm:text-[0.7rem] sm:tracking-[0.32em]">
              INTERNATIONAL · VIT CHENNAI
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              activeProps={{ className: "text-primary" }}
              className="text-sm font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-primary"
            >
              {l.label}
            </Link>
          ))}
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Team Saksham International on Instagram"
            className="text-muted-foreground transition-colors hover:text-primary"
          >
            <Instagram className="h-5 w-5" />
          </a>
        </nav>

        <button
          className="lg:hidden rounded border border-border p-2 text-foreground"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav className="section-x flex flex-col gap-1 border-t border-border pb-4 pt-2 lg:hidden">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setOpen(false)}
              activeOptions={{ exact: l.to === "/" }}
              activeProps={{ className: "text-primary" }}
              className="py-2 font-display text-lg tracking-wide text-foreground"
            >
              {l.label}
            </Link>
          ))}
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 py-2 font-display text-lg tracking-wide text-foreground"
          >
            <Instagram className="h-5 w-5 text-primary" /> INSTAGRAM
          </a>
        </nav>
      )}
    </header>
  );
}
