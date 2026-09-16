import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";

export type AdminState = {
  loading: boolean;
  session: Session | null;
  isAdmin: boolean;
};

export function useAdminSession(): AdminState {
  const [state, setState] = useState<AdminState>({
    loading: true,
    session: null,
    isAdmin: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function check(session: Session | null) {
      if (!session) {
        if (!cancelled) setState({ loading: false, session: null, isAdmin: false });
        return;
      }
      const { data } = await db
        .from("admins")
        .select("id")
        .ilike("email", session.user.email ?? "")
        .maybeSingle();
      if (!cancelled) setState({ loading: false, session, isAdmin: Boolean(data) });
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void check(session);
    });
    void supabase.auth.getSession().then(({ data }) => check(data.session));

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
