import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Camera, Check, Loader2, Mail, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { db, type Row } from "@/lib/db";
import { compressToWebp, uploadThumbnail } from "@/lib/upload";
import { COUNTRIES, INDUSTRIES, initials, isLinkedInUrl, normaliseLinkedIn } from "@/lib/alumni";
import { Thumb } from "@/components/Thumb";

export const Route = createFileRoute("/alumni_/join")({
  head: () => ({
    meta: [
      { title: "TSI Alumni Network — Join" },
      {
        name: "description",
        content:
          "Worked on a TSI car? Add yourself to the Team Saksham International alumni wall in 2 minutes.",
      },
      { property: "og:title", content: "TSI Alumni Network" },
      {
        property: "og:description",
        content:
          "Worked on a TSI car? Add yourself to the Team Saksham International alumni wall in 2 minutes.",
      },
      { property: "og:image", content: "/og-image.jpg" },
    ],
  }),
  component: JoinAlumni,
});

type Step = "email" | "code" | "claim" | "tsi" | "now" | "consent" | "done";

type Form = {
  name: string;
  claims_alumni_id: string | null;
  claimed_photo: string | null;
  cars: string[];
  subteam: string;
  position: string;
  joined_year: string;
  graduation_year: string;
  current_role_text: string;
  company: string;
  industry: string;
  city: string;
  country: string;
  linkedin_url: string;
  photo_url: string;
  message: string;
  phone: string;
  show_email: boolean;
  open_to_mentoring: boolean;
  consent: boolean;
};

const EMPTY: Form = {
  name: "",
  claims_alumni_id: null,
  claimed_photo: null,
  cars: [],
  subteam: "",
  position: "",
  joined_year: "",
  graduation_year: "",
  current_role_text: "",
  company: "",
  industry: "",
  city: "",
  country: "",
  linkedin_url: "",
  photo_url: "",
  message: "",
  phone: "",
  show_email: false,
  open_to_mentoring: false,
  consent: false,
};

const FORM_STEPS: Step[] = ["claim", "tsi", "now", "consent"];
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR + 5 - 2011 }, (_, i) => String(THIS_YEAR + 4 - i));

const input =
  "w-full rounded border border-input bg-background px-4 py-3 text-base outline-none transition-colors focus:border-primary";

function JoinAlumni() {
  const [step, setStep] = useState<Step>("email");
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [form, setForm] = useState<Form>(EMPTY);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);
  const [generations, setGenerations] = useState<Row[]>([]);
  const [subteams, setSubteams] = useState<Row[]>([]);
  const loadedFor = useRef<string | null>(null);

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Options for the form
  useEffect(() => {
    void (async () => {
      const [g, s] = await Promise.all([
        db.from("generations").select("id,name,year").order("sort_order"),
        db.from("subteams").select("id,name").order("sort_order"),
      ]);
      setGenerations((g.data ?? []) as Row[]);
      setSubteams((s.data ?? []) as Row[]);
    })();
  }, []);

  // Load an existing profile for this signed-in user (edit mode)
  const loadProfile = useCallback(async (s: Session) => {
    if (loadedFor.current === s.user.id) return;
    loadedFor.current = s.user.id;
    const { data: row } = await db
      .from("alumni")
      .select("*")
      .eq("user_id", s.user.id)
      .maybeSingle();
    if (!row) {
      setStep("claim");
      return;
    }
    const [{ data: links }, { data: priv }] = await Promise.all([
      db.from("alumni_generations").select("generation_id").eq("alumni_id", row.id),
      db.from("alumni_private").select("*").eq("alumni_id", row.id).maybeSingle(),
    ]);
    setExistingId(row.id);
    setExistingStatus(row.status);
    setForm({
      ...EMPTY,
      name: row.name ?? "",
      claims_alumni_id: row.claims_alumni_id ?? null,
      cars: ((links ?? []) as Row[]).map((l) => l.generation_id),
      subteam: row.subteam ?? "",
      position: row.position ?? "",
      joined_year: row.joined_year ? String(row.joined_year) : "",
      graduation_year: row.graduation_year ? String(row.graduation_year) : "",
      current_role_text: row.current_role_text ?? "",
      company: row.company ?? "",
      industry: row.industry ?? "",
      city: row.city ?? "",
      country: row.country ?? "",
      linkedin_url: row.linkedin_url ?? "",
      photo_url: row.photo_url ?? "",
      message: row.message ?? "",
      phone: priv?.phone ?? "",
      show_email: Boolean(priv?.show_email),
      open_to_mentoring: Boolean(priv?.open_to_mentoring),
      consent: true,
    });
    setStep("tsi");
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) void loadProfile(s);
    });
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) void loadProfile(data.session);
      setBooting(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/alumni/join` },
    });
    setBusy(false);
    if (error) {
      toast.error(
        error.status === 429
          ? "Too many attempts. Please wait a minute and try again."
          : "We couldn't send the email. Please try again.",
      );
      return;
    }
    setEmail(clean);
    setResendIn(30);
    setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const token = code.replace(/\D/g, "");
    if (token.length < 6) {
      toast.error("Enter the code from the email");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    setBusy(false);
    if (error) toast.error("That code didn't work. Check it, or request a new one.");
    // onAuthStateChange takes it from here
  }

  async function save() {
    if (!session) return;
    if (!form.consent) {
      toast.error("Please tick the consent box so we can show your profile");
      return;
    }
    setBusy(true);
    try {
      const linkedin = normaliseLinkedIn(form.linkedin_url);
      const profile = {
        name: form.name.trim(),
        batch_year: form.graduation_year,
        graduation_year: Number(form.graduation_year),
        joined_year: form.joined_year ? Number(form.joined_year) : null,
        subteam: form.subteam || null,
        position: form.position.trim() || null,
        current_role_text: form.current_role_text.trim() || null,
        company: form.company.trim() || null,
        industry: form.industry.trim() || null,
        city: form.city.trim() || null,
        country: form.country.trim() || null,
        linkedin_url: linkedin || null,
        photo_url: form.photo_url || null,
        message: form.message.trim() || null,
      };

      let id = existingId;
      if (id) {
        const { error } = await db.from("alumni").update(profile).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await db
          .from("alumni")
          .insert({
            ...profile,
            claims_alumni_id: form.claims_alumni_id,
            user_id: session.user.id,
            status: "pending",
          })
          .select("id,status")
          .single();
        if (error) throw error;
        id = data.id as string;
        setExistingId(id);
        setExistingStatus(data.status);
      }

      const del = await db.from("alumni_generations").delete().eq("alumni_id", id);
      if (del.error) throw del.error;
      if (form.cars.length) {
        const ins = await db
          .from("alumni_generations")
          .insert(form.cars.map((generation_id) => ({ alumni_id: id, generation_id })));
        if (ins.error) throw ins.error;
      }

      const priv = await db.from("alumni_private").upsert(
        {
          alumni_id: id,
          email: session.user.email ?? email,
          phone: form.phone.trim() || null,
          show_email: form.show_email,
          open_to_mentoring: form.open_to_mentoring,
        },
        { onConflict: "alumni_id" },
      );
      if (priv.error) throw priv.error;

      setStep("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong while saving. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function next(from: Step) {
    if (from === "tsi") {
      if (!form.name.trim()) {
        toast.error("Please enter your name");
        return;
      }
      if (form.cars.length === 0) {
        toast.error("Pick at least one car you worked on");
        return;
      }
      if (!form.graduation_year) {
        toast.error("Please pick your graduation year");
        return;
      }
      setStep("now");
    } else if (from === "now") {
      const linkedin = normaliseLinkedIn(form.linkedin_url);
      if (linkedin && !isLinkedInUrl(linkedin)) {
        toast.error("That doesn't look like a LinkedIn profile link");
        return;
      }
      setStep("consent");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const stepIndex = FORM_STEPS.indexOf(step);
  const editing = Boolean(existingId);

  return (
    <div className="grain-overlay min-h-[calc(100svh-4.5rem)] bg-surface">
      <div className="relative mx-auto max-w-xl px-5 py-10 md:py-16">
        <p className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em] text-primary before:h-px before:w-8 before:bg-primary">
          TSI Alumni Network
        </p>
        <h1 className="mt-3 text-4xl leading-[0.95] md:text-5xl">
          {step === "done"
            ? "You're on the wall"
            : editing
              ? "Update your profile"
              : "Worked on a TSI car?"}
        </h1>
        {step !== "done" && !editing && (
          <p className="mt-3 text-muted-foreground">
            Add yourself to the alumni wall in about two minutes. No password needed.
          </p>
        )}

        {stepIndex >= 0 && (
          <div className="mt-6 flex gap-1.5" aria-label={`Step ${stepIndex + 1} of 4`}>
            {FORM_STEPS.map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full ${i <= stepIndex ? "bg-primary" : "bg-border"}`}
              />
            ))}
          </div>
        )}

        <div className="mt-8 rounded-lg border border-border bg-background p-5 md:p-7">
          {booting ? (
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
          ) : step === "email" && !session ? (
            <form onSubmit={sendCode} className="space-y-4">
              <Label text="Your email">
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className={input}
                />
              </Label>
              <p className="text-xs text-muted-foreground">
                We'll send a one-time code to confirm it's you. Your email stays private unless you
                choose to show it.
              </p>
              <Primary busy={busy} type="submit">
                <Mail className="h-4 w-4" /> SEND MY CODE
              </Primary>
            </form>
          ) : step === "code" && !session ? (
            <form onSubmit={verify} className="space-y-4">
              <p className="text-sm">
                We sent an email to <span className="text-primary">{email}</span>. Enter the code
                from it, or just tap the sign-in link in the email.
              </p>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={10}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="••••••"
                className={`${input} text-center font-mono text-2xl tracking-[0.5em]`}
              />
              <Primary busy={busy} type="submit">
                VERIFY
              </Primary>
              <div className="flex justify-between text-xs text-muted-foreground">
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="hover:text-primary"
                >
                  Change email
                </button>
                <button
                  type="button"
                  disabled={resendIn > 0 || busy}
                  onClick={() => void sendCode()}
                  className="hover:text-primary disabled:opacity-50"
                >
                  {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Can't find it? Check spam or promotions.
              </p>
            </form>
          ) : step === "claim" ? (
            <ClaimStep
              onPick={(a) => {
                setForm((f) => ({
                  ...f,
                  claims_alumni_id: a.id,
                  claimed_photo: a.photo_url ?? null,
                  name: a.name ?? f.name,
                }));
                setStep("tsi");
              }}
              onSkip={() => {
                set("claims_alumni_id", null);
                setStep("tsi");
              }}
            />
          ) : step === "tsi" ? (
            <div className="space-y-5">
              <StepTitle n={2} title="Your TSI years" />
              <Label text="Full name *">
                <input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  autoComplete="name"
                  className={input}
                />
              </Label>
              <div>
                <p className="mb-2 text-sm font-semibold">Cars you worked on *</p>
                <div className="flex flex-wrap gap-2">
                  {generations.map((g) => {
                    const on = form.cars.includes(g.id);
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() =>
                          set(
                            "cars",
                            on ? form.cars.filter((c) => c !== g.id) : [...form.cars, g.id],
                          )
                        }
                        className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 font-display text-sm tracking-wide transition-colors ${
                          on
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:border-primary"
                        }`}
                      >
                        {on && <Check className="h-3.5 w-3.5" />}
                        {g.name}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Your car isn't listed? Pick the closest and mention it in your message.
                </p>
              </div>
              <Label text="Department">
                <select
                  value={form.subteam}
                  onChange={(e) => set("subteam", e.target.value)}
                  className={input}
                >
                  <option value="">Select…</option>
                  {subteams.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </Label>
              <Label text="Role in the team">
                <input
                  value={form.position}
                  onChange={(e) => set("position", e.target.value)}
                  placeholder="e.g. Captain, Drivetrain Lead, Member"
                  className={input}
                />
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <Label text="Joined TSI">
                  <select
                    value={form.joined_year}
                    onChange={(e) => set("joined_year", e.target.value)}
                    className={input}
                  >
                    <option value="">Year</option>
                    {YEARS.map((y) => (
                      <option key={y}>{y}</option>
                    ))}
                  </select>
                </Label>
                <Label text="Graduated *">
                  <select
                    value={form.graduation_year}
                    onChange={(e) => set("graduation_year", e.target.value)}
                    className={input}
                  >
                    <option value="">Year</option>
                    {YEARS.map((y) => (
                      <option key={y}>{y}</option>
                    ))}
                  </select>
                </Label>
              </div>
              <Nav
                onBack={editing ? undefined : () => setStep("claim")}
                onNext={() => next("tsi")}
              />
            </div>
          ) : step === "now" ? (
            <div className="space-y-5">
              <StepTitle n={3} title="Where you are now" />
              <PhotoPicker
                session={session}
                name={form.name}
                current={form.photo_url || form.claimed_photo}
                onUploaded={(url) => set("photo_url", url)}
              />
              <Label text="Job title">
                <input
                  value={form.current_role_text}
                  onChange={(e) => set("current_role_text", e.target.value)}
                  placeholder="e.g. Vehicle Dynamics Engineer"
                  className={input}
                />
              </Label>
              <Label text="Company / university">
                <input
                  value={form.company}
                  onChange={(e) => set("company", e.target.value)}
                  autoComplete="organization"
                  className={input}
                />
              </Label>
              <Label text="Industry">
                <input
                  list="tsi-industries"
                  value={form.industry}
                  onChange={(e) => set("industry", e.target.value)}
                  className={input}
                />
                <datalist id="tsi-industries">
                  {INDUSTRIES.map((i) => (
                    <option key={i} value={i} />
                  ))}
                </datalist>
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <Label text="City">
                  <input
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                    autoComplete="address-level2"
                    className={input}
                  />
                </Label>
                <Label text="Country">
                  <input
                    list="tsi-countries"
                    value={form.country}
                    onChange={(e) => set("country", e.target.value)}
                    autoComplete="country-name"
                    className={input}
                  />
                  <datalist id="tsi-countries">
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </Label>
              </div>
              <Label text="LinkedIn profile">
                <input
                  value={form.linkedin_url}
                  onChange={(e) => set("linkedin_url", e.target.value)}
                  inputMode="url"
                  placeholder="linkedin.com/in/your-name"
                  className={input}
                />
              </Label>
              <Label text="A message to the current team (optional)">
                <textarea
                  value={form.message}
                  maxLength={280}
                  rows={3}
                  onChange={(e) => set("message", e.target.value)}
                  placeholder="Advice, a memory, or how they can reach out"
                  className={input}
                />
                <span className="mt-1 block text-right text-xs text-muted-foreground">
                  {form.message.length}/280
                </span>
              </Label>
              <Nav onBack={() => setStep("tsi")} onNext={() => next("now")} />
            </div>
          ) : step === "consent" ? (
            <div className="space-y-5">
              <StepTitle n={4} title="Contact & consent" />
              <Label text="Phone (optional, private — only the team admins see it)">
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+91 …"
                  className={input}
                />
              </Label>
              <Toggle
                checked={form.show_email}
                onChange={(v) => set("show_email", v)}
                label={`Show my email (${session?.user.email ?? email}) on my profile`}
              />
              <Toggle
                checked={form.open_to_mentoring}
                onChange={(v) => set("open_to_mentoring", v)}
                label="I'm happy to mentor current TSI students"
              />
              <Toggle
                checked={form.consent}
                onChange={(v) => set("consent", v)}
                label="I agree to TSI showing my name, photo, TSI history and current role on this website. *"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep("now")}
                  className="rounded border border-border px-4 py-3 hover:border-primary"
                  aria-label="Back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <Primary busy={busy} onClick={() => void save()}>
                  {editing ? "SAVE CHANGES" : "ADD ME TO THE WALL"}
                </Primary>
              </div>
            </div>
          ) : step === "done" ? (
            <Done approved={existingStatus === "approved"} />
          ) : (
            <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
          )}
        </div>

        {session && step !== "done" && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Signed in as {session.user.email} ·{" "}
            <button
              onClick={() => {
                loadedFor.current = null;
                setExistingId(null);
                setForm(EMPTY);
                setCode("");
                setStep("email");
                void supabase.auth.signOut();
              }}
              className="underline hover:text-primary"
            >
              not you?
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

function StepTitle({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="text-2xl">
      <span className="mr-2 font-mono text-sm text-primary">0{n}</span>
      {title}
    </h2>
  );
}

function Label({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{text}</span>
      {children}
    </label>
  );
}

function Primary({
  busy,
  children,
  type = "button",
  onClick,
}: {
  busy: boolean;
  children: React.ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={busy}
      onClick={onClick}
      className="inline-flex w-full items-center justify-center gap-2 rounded bg-primary px-6 py-3.5 font-display text-sm tracking-widest text-primary-foreground transition-opacity disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
    </button>
  );
}

function Nav({ onBack, onNext }: { onBack?: (() => void) | undefined; onNext: () => void }) {
  return (
    <div className="flex gap-3 pt-2">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="rounded border border-border px-4 py-3 hover:border-primary"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      )}
      <Primary busy={false} onClick={onNext}>
        NEXT <ArrowRight className="h-4 w-4" />
      </Primary>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded border border-border p-3 transition-colors hover:border-primary">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--primary)]"
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}

function ClaimStep({ onPick, onSkip }: { onPick: (a: Row) => void; onSkip: () => void }) {
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<Row[]>([]);

  useEffect(() => {
    void db
      .from("alumni")
      .select("id,name,photo_url,batch_year")
      .eq("status", "approved")
      .is("user_id", null)
      .order("name")
      .then(({ data }: { data: Row[] | null }) => setPeople(data ?? []));
  }, []);

  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (term.length < 2) return [];
    return people.filter((p) => String(p.name).toLowerCase().includes(term)).slice(0, 8);
  }, [people, q]);

  return (
    <div className="space-y-4">
      <StepTitle n={1} title="Are you already on our site?" />
      <p className="text-sm text-muted-foreground">
        Some alumni were carried over from the old website. Search your name to claim your profile.
      </p>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          autoFocus
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type your name"
          className={`${input} pl-9`}
        />
      </label>
      {matches.length > 0 && (
        <ul className="divide-y divide-border rounded border border-border">
          {matches.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => onPick(p)}
                className="flex w-full items-center gap-3 p-3 text-left hover:bg-surface"
              >
                {p.photo_url ? (
                  <Thumb src={p.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 font-display text-primary">
                    {initials(p.name)}
                  </span>
                )}
                <span className="flex-1">{p.name}</span>
                <span className="text-xs text-primary">That's me</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.trim().length >= 2 && matches.length === 0 && (
        <p className="text-sm text-muted-foreground">No match — that's fine, continue below.</p>
      )}
      <button
        onClick={onSkip}
        className="w-full rounded border border-border px-6 py-3.5 font-display text-sm tracking-widest hover:border-primary hover:text-primary"
      >
        I'M NOT LISTED — CONTINUE
      </button>
    </div>
  );
}

function PhotoPicker({
  session,
  name,
  current,
  onUploaded,
}: {
  session: Session | null;
  name: string;
  current: string | null;
  onUploaded: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function upload(file: File | undefined) {
    if (!file || !session) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image");
      return;
    }
    setUploading(true);
    try {
      const webp = await compressToWebp(file, 900, 0.85);
      const path = `alumni-submissions/${session.user.id}/${crypto.randomUUID()}.webp`;
      const { error } = await supabase.storage
        .from("media")
        .upload(path, webp, { contentType: "image/webp", upsert: false });
      if (error) throw error;
      await uploadThumbnail(file, path, 480);
      onUploaded(supabase.storage.from("media").getPublicUrl(path).data.publicUrl);
    } catch (err) {
      console.error(err);
      toast.error("Photo upload failed. You can skip it and add one later.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <label className="flex cursor-pointer items-center gap-4 rounded border border-dashed border-border p-4 transition-colors hover:border-primary">
      {current ? (
        <img src={current} alt="" className="h-20 w-20 rounded-full object-cover" />
      ) : (
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-2 font-display text-2xl text-primary">
          {initials(name)}
        </span>
      )}
      <span className="flex-1">
        <span className="flex items-center gap-2 font-semibold">
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          {current ? "Change photo" : "Add a photo"}
        </span>
        <span className="text-xs text-muted-foreground">
          Optional. A clear headshot works best.
        </span>
      </span>
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => void upload(e.target.files?.[0])}
      />
    </label>
  );
}

function Done({ approved }: { approved: boolean }) {
  const link = typeof window === "undefined" ? "" : `${window.location.origin}/alumni/join`;
  const text = `Worked on a TSI car? Add yourself to the Team Saksham International alumni wall — takes 2 minutes: ${link}`;
  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Check className="h-7 w-7" />
      </div>
      <p className="text-lg">
        {approved
          ? "Your profile is updated."
          : "Thanks! Your profile will appear after a quick check by the team."}
      </p>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(text)}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex w-full items-center justify-center gap-2 rounded bg-[#25D366] px-6 py-3.5 font-display text-sm tracking-widest text-black"
      >
        SHARE WITH YOUR BATCHMATES
      </a>
      <Link
        to="/alumni"
        className="block text-sm text-muted-foreground underline hover:text-primary"
      >
        See the alumni wall
      </Link>
    </div>
  );
}
