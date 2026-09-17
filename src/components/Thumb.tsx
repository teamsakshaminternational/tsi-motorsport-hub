import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";

/** Our storage keeps a small "-sm.webp" copy next to each uploaded photo. */
export function thumbUrl(url: string | null | undefined) {
  if (!url) return url ?? "";
  if (!/\/storage\/v1\/object\/public\/media\//.test(url)) return url;
  if (!url.endsWith(".webp") || url.endsWith("-sm.webp") || url.includes("/site/")) return url;
  return url.replace(/\.webp$/, "-sm.webp");
}

/** <img> that loads the small copy first and falls back to the original if it's missing. */
export function Thumb({
  src,
  hiRes,
  ...props
}: ImgHTMLAttributes<HTMLImageElement> & {
  src: string;
  /** Let the browser pick the full-size photo when the image is shown large (needs `sizes`). */
  hiRes?: boolean;
}) {
  const small = thumbUrl(src);
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  useEffect(() => {
    const img = ref.current;
    // The error can fire before React hydrates; catch that case too.
    if (img && img.complete && img.naturalWidth === 0 && small !== src) setFailed(true);
  }, [small, src]);

  return (
    <img
      ref={ref}
      loading="lazy"
      decoding="async"
      {...props}
      src={failed ? src : small}
      srcSet={hiRes && !failed && small !== src ? `${small} 480w, ${src} 1800w` : undefined}
      onError={() => {
        if (!failed && small !== src) setFailed(true);
      }}
    />
  );
}
