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
      <div className="section-x mx-auto max-w-7xl py-14 md:py-20">
        <Reveal>
          {eyebrow && (
            <p className="mb-4 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em] text-primary before:h-px before:w-8 before:bg-primary">
              {eyebrow}
            </p>
          )}
          <h1 className="max-w-4xl text-5xl leading-[0.9] md:text-7xl">{title}</h1>
          {children && (
            <div className="mt-4 max-w-2xl text-base text-muted-foreground">{children}</div>
          )}
        </Reveal>
      </div>
    </section>
  );
}
