import type { ReactNode } from "react";
import { Reveal } from "@/components/Reveal";

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <section className="grain-overlay border-b border-border bg-surface">
      <div className="section-x mx-auto max-w-7xl py-16 md:py-24">
        <Reveal>
          {eyebrow && (
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-primary">
              {eyebrow}
            </p>
          )}
          <h1 className="text-4xl leading-[0.95] md:text-6xl">{title}</h1>
          {children && (
            <div className="mt-4 max-w-2xl text-base text-muted-foreground">{children}</div>
          )}
        </Reveal>
      </div>
    </section>
  );
}
