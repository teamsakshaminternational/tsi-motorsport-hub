import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// Called once a day by the Vercel cron in vercel.json. A tiny read keeps the
// free Supabase project from being paused when the site gets no visitors.
export const Route = createFileRoute("/api/keepalive")({
  server: {
    handlers: {
      GET: async () => {
        const { error } = await supabase.from("page_content").select("id").limit(1);
        return Response.json(
          { ok: !error, at: new Date().toISOString(), error: error?.message ?? null },
          { status: error ? 500 : 200, headers: { "cache-control": "no-store" } },
        );
      },
    },
  },
});
