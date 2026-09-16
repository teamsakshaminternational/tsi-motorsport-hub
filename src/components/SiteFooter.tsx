import { Link } from "@tanstack/react-router";
import { NewsletterForm } from "@/components/NewsletterForm";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="section-x mx-auto grid max-w-7xl gap-10 py-14 md:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl">
            Stay in the <span className="text-primary">pit lane</span>
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Build updates, competition results and behind-the-scenes from Team Saksham
            International, straight to your inbox.
          </p>
          <div className="mt-5">
            <NewsletterForm />
          </div>
        </div>

        <div className="flex flex-col gap-4 md:items-end">
          <div className="font-display text-2xl tracking-wide">
            TEAM <span className="text-primary">SAKSHAM</span> INTERNATIONAL
          </div>
          <p className="text-sm text-muted-foreground md:text-right">
            Baja SAE team, Vellore Institute of Technology, Chennai.
          </p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground md:justify-end">
            <Link to="/about" className="hover:text-primary">
              About
            </Link>
            <Link to="/gallery" className="hover:text-primary">
              Gallery
            </Link>
            <Link to="/team" className="hover:text-primary">
              Team
            </Link>
            <Link to="/sponsors" className="hover:text-primary">
              Sponsors
            </Link>
            <Link to="/blog" className="hover:text-primary">
              Blog
            </Link>
            <Link to="/admin" className="hover:text-primary">
              Admin
            </Link>
          </nav>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Team Saksham International.
          </p>
        </div>
      </div>
    </footer>
  );
}
