import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImageUp, RotateCcw } from "lucide-react";
import { db } from "@/lib/db";
import { pageContentQuery } from "@/lib/db";
import { uploadImage } from "@/lib/upload";

const MEDIA = "https://cazhbqmbtlvqcahgyvba.supabase.co/storage/v1/object/public/media";

const SLOTS = [
  {
    key: "home_hero_image",
    label: "Home — top banner",
    hint: "Wide landscape photo; the headline sits on the left.",
    fallback: "/hero-buggy.webp",
  },
  {
    key: "home_quote_image",
    label: "Home — quote band",
    hint: "Wide photo behind “When in doubt, throttle it out”.",
    fallback: `${MEDIA}/site/band1.webp`,
  },
  {
    key: "home_crew_image",
    label: "Home — Meet the crew",
    hint: "Latest team photo. Landscape, faces in the upper half work best.",
    fallback: `${MEDIA}/site/team_photo.webp`,
  },
  {
    key: "about_image",
    label: "About — story photo",
    hint: "Shown next to the team story (4:3).",
    fallback: `${MEDIA}/site/band2.webp`,
  },
  {
    key: "about_team_image",
    label: "About — bottom team photo",
    hint: "Wide team photo at the bottom of the About page.",
    fallback: `${MEDIA}/site/team_photo.webp`,
  },
];

/** Swap the big background photos without touching code. */
export function SiteImages() {
  const qc = useQueryClient();
  const { data: cms = {} } = useQuery(pageContentQuery);
  const [busy, setBusy] = useState<string | null>(null);

  async function save(key: string, value: string) {
    const { error } = await db.from("page_content").upsert({ key, value }, { onConflict: "key" });
    if (error) throw error;
    await qc.invalidateQueries();
  }

  async function upload(key: string, file: File | undefined) {
    if (!file) return;
    setBusy(key);
    try {
      const url = await uploadImage(file, "site");
      await save(key, url);
      toast.success("Photo updated — it's live on the site");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(null);
    }
  }

  async function reset(key: string) {
    setBusy(key);
    try {
      await save(key, "");
      toast.success("Back to the default photo");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reset");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <h2 className="text-2xl">Site images</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        The large background photos on the Home and About pages. Upload a new one to replace it;
        photos are compressed automatically.
      </p>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {SLOTS.map((slot) => {
          const custom = cms[slot.key]?.trim();
          const current = custom || slot.fallback;
          return (
            <div key={slot.key} className="overflow-hidden rounded border border-border bg-surface">
              <img src={current} alt="" className="aspect-video w-full object-cover" />
              <div className="space-y-3 p-4">
                <div>
                  <h3 className="text-lg">{slot.label}</h3>
                  <p className="text-xs text-muted-foreground">{slot.hint}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label
                    className={`inline-flex cursor-pointer items-center gap-2 rounded bg-primary px-4 py-2 font-display text-xs tracking-widest text-primary-foreground ${
                      busy === slot.key ? "pointer-events-none opacity-60" : ""
                    }`}
                  >
                    <ImageUp className="h-4 w-4" />
                    {busy === slot.key ? "UPLOADING…" : "REPLACE PHOTO"}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => void upload(slot.key, e.target.files?.[0])}
                    />
                  </label>
                  {custom && (
                    <button
                      onClick={() => void reset(slot.key)}
                      disabled={busy === slot.key}
                      className="inline-flex items-center gap-2 rounded border border-border px-4 py-2 font-display text-xs tracking-widest hover:border-primary hover:text-primary"
                    >
                      <RotateCcw className="h-4 w-4" /> USE DEFAULT
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
