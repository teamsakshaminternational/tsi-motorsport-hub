-- TSI alumni network: self-service alumni profiles with email verification + admin approval.
-- Run once in Supabase > SQL Editor (after supabase-setup.sql).

-- 1. Richer public profile on the existing alumni table
ALTER TABLE public.alumni
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'approved'
    CHECK (status IN ('pending', 'approved', 'hidden')),
  ADD COLUMN IF NOT EXISTS claims_alumni_id uuid REFERENCES public.alumni(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS joined_year int CHECK (joined_year BETWEEN 2010 AND 2100),
  ADD COLUMN IF NOT EXISTS graduation_year int CHECK (graduation_year BETWEEN 2010 AND 2100),
  ADD COLUMN IF NOT EXISTS subteam text,
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS alumni_one_profile_per_user ON public.alumni(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS alumni_status_idx ON public.alumni(status);

-- 2. Which cars each alumnus worked on (public once the profile is approved)
CREATE TABLE IF NOT EXISTS public.alumni_generations (
  alumni_id uuid NOT NULL REFERENCES public.alumni(id) ON DELETE CASCADE,
  generation_id uuid NOT NULL REFERENCES public.generations(id) ON DELETE CASCADE,
  PRIMARY KEY (alumni_id, generation_id)
);

-- 3. Private contact details: never public; only the alumnus and admins can read
CREATE TABLE IF NOT EXISTS public.alumni_private (
  alumni_id uuid PRIMARY KEY REFERENCES public.alumni(id) ON DELETE CASCADE,
  email text,
  phone text,
  show_email boolean NOT NULL DEFAULT false,
  open_to_mentoring boolean NOT NULL DEFAULT false,
  admin_notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Outreach list (the old contact spreadsheet): admins only, never shown on the site
CREATE TABLE IF NOT EXISTS public.alumni_outreach (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  car text,
  organisation text,
  industry text,
  designation text,
  phone text,
  location text,
  alumni_id uuid REFERENCES public.alumni(id) ON DELETE SET NULL,
  invited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.alumni_generations TO anon;
GRANT SELECT, INSERT, DELETE ON public.alumni_generations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alumni_private, public.alumni_outreach TO authenticated;
GRANT ALL ON public.alumni_generations, public.alumni_private, public.alumni_outreach TO service_role;
ALTER TABLE public.alumni_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alumni_outreach ENABLE ROW LEVEL SECURITY;

-- 5. Helper: does the signed-in user own this alumni row?
CREATE OR REPLACE FUNCTION public.owns_alumni(p_alumni_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.alumni WHERE id = p_alumni_id AND user_id = auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.owns_alumni(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owns_alumni(uuid) TO authenticated;

-- 6. Row-level security
DROP POLICY IF EXISTS "public_read" ON public.alumni;
CREATE POLICY "alumni_read" ON public.alumni FOR SELECT TO anon, authenticated
  USING (status = 'approved' OR (auth.uid() IS NOT NULL AND user_id = auth.uid()));
CREATE POLICY "alumni_admin_read" ON public.alumni FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "alumni_self_insert" ON public.alumni FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pending');
CREATE POLICY "alumni_self_update" ON public.alumni FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
-- (existing "admin_write" policy still gives admins full access)

CREATE POLICY "gen_read" ON public.alumni_generations FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.alumni a WHERE a.id = alumni_id
                 AND (a.status = 'approved' OR a.user_id = auth.uid())));
CREATE POLICY "gen_self_write" ON public.alumni_generations FOR ALL TO authenticated
  USING (public.owns_alumni(alumni_id)) WITH CHECK (public.owns_alumni(alumni_id));
CREATE POLICY "gen_admin" ON public.alumni_generations FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "private_self" ON public.alumni_private FOR ALL TO authenticated
  USING (public.owns_alumni(alumni_id)) WITH CHECK (public.owns_alumni(alumni_id));
CREATE POLICY "private_admin" ON public.alumni_private FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE POLICY "outreach_admin" ON public.alumni_outreach FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Public, opt-in email: exposed only through this view (approved + show_email = true)
CREATE OR REPLACE VIEW public.alumni_public_contacts AS
  SELECT p.alumni_id, p.email
  FROM public.alumni_private p JOIN public.alumni a ON a.id = p.alumni_id
  WHERE a.status = 'approved' AND p.show_email;
GRANT SELECT ON public.alumni_public_contacts TO anon, authenticated;

-- 7. Guard rails: non-admins can't approve themselves or take over rows
CREATE OR REPLACE FUNCTION public.alumni_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF public.is_admin() THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.user_id := auth.uid();
    NEW.status := 'pending';
    NEW.submitted_at := now();
  ELSE
    NEW.user_id := OLD.user_id;
    NEW.status := OLD.status;               -- approved stays approved, pending stays pending
    NEW.claims_alumni_id := OLD.claims_alumni_id;
    NEW.sort_order := OLD.sort_order;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS alumni_guard ON public.alumni;
CREATE TRIGGER alumni_guard BEFORE INSERT OR UPDATE ON public.alumni
  FOR EACH ROW EXECUTE FUNCTION public.alumni_guard();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS alumni_private_touch ON public.alumni_private;
CREATE TRIGGER alumni_private_touch BEFORE UPDATE ON public.alumni_private
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 8. Admin approval. If the submission claims an existing (e.g. imported from Wix) profile,
--    merge it into that profile so there is one row per person.
CREATE OR REPLACE FUNCTION public.approve_alumni(p_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  s public.alumni;
  target uuid;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Only admins can approve alumni'; END IF;
  SELECT * INTO s FROM public.alumni WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found'; END IF;

  IF s.claims_alumni_id IS NULL OR s.claims_alumni_id = s.id THEN
    UPDATE public.alumni SET status = 'approved' WHERE id = p_id;
    RETURN p_id;
  END IF;

  target := s.claims_alumni_id;
  UPDATE public.alumni SET user_id = NULL WHERE id = p_id;  -- free the one-profile-per-user slot
  UPDATE public.alumni t SET
    name = s.name, batch_year = s.batch_year, position = s.position,
    current_role_text = s.current_role_text,
    photo_url = COALESCE(s.photo_url, t.photo_url),
    linkedin_url = COALESCE(s.linkedin_url, t.linkedin_url),
    joined_year = s.joined_year, graduation_year = s.graduation_year, subteam = s.subteam,
    company = s.company, industry = s.industry, city = s.city, country = s.country,
    message = s.message, submitted_at = s.submitted_at,
    user_id = s.user_id, status = 'approved'
  WHERE t.id = target;

  DELETE FROM public.alumni_generations WHERE alumni_id = target;
  UPDATE public.alumni_generations SET alumni_id = target WHERE alumni_id = p_id;
  IF EXISTS (SELECT 1 FROM public.alumni_private WHERE alumni_id = p_id) THEN
    DELETE FROM public.alumni_private WHERE alumni_id = target;
    UPDATE public.alumni_private SET alumni_id = target WHERE alumni_id = p_id;
  END IF;
  UPDATE public.alumni_outreach SET alumni_id = target WHERE alumni_id = p_id;
  DELETE FROM public.alumni WHERE id = p_id;
  RETURN target;
END $$;
REVOKE EXECUTE ON FUNCTION public.approve_alumni(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_alumni(uuid) TO authenticated;

-- 9. Photo uploads: a signed-in alumnus may only write inside media/alumni-submissions/<their user id>/
CREATE POLICY "media_alumni_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'media'
    AND (storage.foldername(name))[1] = 'alumni-submissions'
    AND (storage.foldername(name))[2] = auth.uid()::text);
CREATE POLICY "media_alumni_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'media'
    AND (storage.foldername(name))[1] = 'alumni-submissions'
    AND (storage.foldername(name))[2] = auth.uid()::text);
CREATE POLICY "media_alumni_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media'
    AND (storage.foldername(name))[1] = 'alumni-submissions'
    AND (storage.foldername(name))[2] = auth.uid()::text);
