import { useCallback, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type LightboxItem = { image_url: string; caption?: string | null };

export function Lightbox({
  items,
  index,
  onClose,
  onIndexChange,
}: {
  items: LightboxItem[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}) {
  const touchStart = useRef<number | null>(null);
  const move = useCallback(
    (delta: number) => {
      if (index === null || items.length === 0) return;
      onIndexChange((index + delta + items.length) % items.length);
    },
    [index, items.length, onIndexChange],
  );

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [index, move, onClose]);

  if (index === null || !items[index]) return null;
  const item = items[index];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      onTouchStart={(event) => {
        touchStart.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStart.current;
        const end = event.changedTouches[0]?.clientX;
        touchStart.current = null;
        if (start === null || end === undefined || Math.abs(start - end) < 45) return;
        move(start > end ? 1 : -1);
      }}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 rounded-full border border-border bg-surface p-2 text-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <X className="h-5 w-5" />
      </button>

      {items.length > 1 && (
        <>
          <button
            aria-label="Previous photo"
            onClick={(e) => {
              e.stopPropagation();
              move(-1);
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-border bg-surface/80 p-2 text-foreground transition-colors hover:border-primary hover:text-primary md:left-6"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            aria-label="Next photo"
            onClick={(e) => {
              e.stopPropagation();
              move(1);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-border bg-surface/80 p-2 text-foreground transition-colors hover:border-primary hover:text-primary md:right-6"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      <img
        src={item.image_url}
        alt={item.caption ?? "Team Saksham International photo"}
        loading="lazy"
        decoding="async"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[80vh] w-auto max-w-full object-contain"
      />
      <div className="mt-4 text-center text-sm text-muted-foreground">
        {item.caption}
        <span className="ml-3 font-mono text-xs text-primary">
          {index + 1}/{items.length}
        </span>
      </div>
    </div>
  );
}
