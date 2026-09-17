import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminSession } from "@/hooks/useAdminSession";
import { CrudSection, type Field } from "@/components/admin/CrudSection";
import { AlumniNetwork, usePendingAlumniCount } from "@/components/admin/AlumniNetwork";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Team Saksham International" },
      { name: "description", content: "Content management for the TSI website." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Admin — Team Saksham International" },
      { property: "og:description", content: "Content management for the TSI website." },
    ],
  }),
  component: Admin,
});

const sections: {
  key: string;
  label: string;
  table: string;
  title: string;
  description?: string;
  labelField?: string;
  groupBy?: string;
  fields: Field[];
}[] = [
  {
    key: "network",
    label: "Alumni network",
    table: "",
    title: "",
    fields: [],
  },
  {
    key: "generations",
    label: "Generations",
    table: "generations",
    title: "Car generations",
    description: "Each generation of the buggy. Photos are managed in the next tab.",
    fields: [
      { name: "name", label: "Name", required: true, placeholder: "TSI Mk4" },
      { name: "year", label: "Year", placeholder: "2024" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "cover_image_url", label: "Cover photo", type: "image" },
    ],
  },
  {
    key: "photos",
    label: "Gallery photos",
    table: "generation_photos",
    title: "Gallery photos",
    description: "Photos shown in the gallery grid for each generation.",
    labelField: "caption",
    groupBy: "generation_id",
    fields: [
      {
        name: "generation_id",
        label: "Generation",
        type: "select",
        optionsTable: "generations",
        optionsLabel: "name",
        required: true,
      },
      { name: "image_url", label: "Photo", type: "image", required: true },
      { name: "caption", label: "Caption" },
    ],
  },
  {
    key: "subteams",
    label: "Subteams",
    table: "subteams",
    title: "Subteams",
    fields: [
      { name: "name", label: "Name", required: true, placeholder: "Drivetrain" },
      { name: "description", label: "Description", type: "textarea" },
    ],
  },
  {
    key: "members",
    label: "Members",
    table: "members",
    title: "Team members",
    groupBy: "subteam_id",
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "position", label: "Position", placeholder: "Drivetrain Lead" },
      {
        name: "subteam_id",
        label: "Subteam",
        type: "select",
        optionsTable: "subteams",
        optionsLabel: "name",
      },
      { name: "photo_url", label: "Photo", type: "image" },
      { name: "linkedin_url", label: "LinkedIn URL" },
    ],
  },
  {
    key: "alumni",
    label: "Alumni",
    table: "alumni",
    title: "Alumni",
    description:
      "Edit alumni profiles directly. Approvals, cars, contacts and invites are in the Alumni network tab.",
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "batch_year", label: "Batch (shown when no graduation year)", required: true, placeholder: "2023" },
      { name: "graduation_year", label: "Graduation year", placeholder: "2023" },
      { name: "joined_year", label: "Joined TSI", placeholder: "2019" },
      { name: "subteam", label: "Department", placeholder: "Drivetrain" },
      { name: "position", label: "Role in team", placeholder: "Captain" },
      { name: "current_role_text", label: "Job title", placeholder: "Design Engineer" },
      { name: "company", label: "Company", placeholder: "Tata Motors" },
      { name: "industry", label: "Industry" },
      { name: "city", label: "City" },
      { name: "country", label: "Country" },
      { name: "photo_url", label: "Photo", type: "image" },
      { name: "linkedin_url", label: "LinkedIn URL" },
      { name: "message", label: "Message to the team", type: "textarea" },
    ],
  },
  {
    key: "sponsors",
    label: "Sponsors",
    table: "sponsors",
    title: "Sponsors",
    fields: [
      { name: "name", label: "Name", required: true },
      { name: "tier", label: "Tier", placeholder: "Title partner" },
      { name: "logo_url", label: "Logo", type: "image" },
      { name: "website_url", label: "Website URL" },
    ],
  },
  {
    key: "achievements",
    label: "Achievements",
    table: "achievements",
    title: "Achievements",
    labelField: "title",
    fields: [
      { name: "title", label: "Title", required: true },
      { name: "event", label: "Event", placeholder: "BAJA SAEINDIA" },
      { name: "year", label: "Year" },
      { name: "position", label: "Result", placeholder: "2nd overall" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "image_url", label: "Photo", type: "image" },
    ],
  },
  {
    key: "blog",
    label: "Blog",
    table: "blog_posts",
    title: "Blog posts",
    labelField: "title",
    fields: [
      { name: "title", label: "Title", required: true },
      { name: "slug", label: "URL slug", required: true, placeholder: "testing-week-2024" },
      { name: "author", label: "Author" },
      { name: "excerpt", label: "Excerpt", type: "textarea" },
      { name: "content", label: "Content", type: "textarea" },
      { name: "cover_image_url", label: "Cover photo", type: "image" },
      { name: "published_at", label: "Publish date", type: "date" },
      { name: "published", label: "Published", type: "checkbox" },
    ],
  },
  {
    key: "content",
    label: "Page text",
    table: "page_content",
    title: "Page text",
    description:
      "Editable text blocks for the site, e.g. home_title_line1, home_subtitle, about_mission, sponsors_cta, contact_email.",
    labelField: "key",
    fields: [
      { name: "key", label: "Key", required: true, placeholder: "home_subtitle" },
      { name: "value", label: "Text", type: "textarea" },
    ],
  },
  {
    key: "admins",
    label: "Admins",
    table: "admins",
    title: "Admins",
    description: "Only these email addresses can sign in and manage content.",
    labelField: "email",
    fields: [{ name: "email", label: "Email", required: true }],
  },
];

function Admin() {
  const { loading, session, isAdmin } = useAdminSession();
  const [tab, setTab] = useState(sections[0]!.key);
  const pendingAlumni = usePendingAlumniCount(isAdmin);

  async function signIn() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/admin" },
    });
    if (error) {
      toast.error("Sign-in failed. Please try again.");
    }
  }

  if (loading) {
    return <div className="section-x mx-auto max-w-7xl py-24 text-sm text-muted-foreground">Loading…</div>;
  }

  if (!session) {
    return (
      <div className="section-x mx-auto flex max-w-md flex-col items-start py-24">
        <h1 className="text-3xl">Admin sign-in</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Sign in with the Google account registered as a team admin.
        </p>
        <button
          onClick={signIn}
          className="mt-6 rounded bg-primary px-6 py-3 font-display text-sm tracking-widest text-primary-foreground"
        >
          CONTINUE WITH GOOGLE
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="section-x mx-auto max-w-md py-24">
        <h1 className="text-3xl">No access</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {session.user.email} is not on the admin list. Ask an existing admin to add you.
        </p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="mt-6 rounded border border-border px-5 py-2 font-display text-xs tracking-widest"
        >
          SIGN OUT
        </button>
      </div>
    );
  }

  const active = sections.find((s) => s.key === tab) ?? sections[0]!;

  return (
    <div className="section-x mx-auto max-w-7xl py-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl">Admin</h1>
          <p className="mt-1 text-xs text-muted-foreground">{session.user.email}</p>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="inline-flex items-center gap-2 rounded border border-border px-4 py-2 font-display text-xs tracking-widest hover:border-primary hover:text-primary"
        >
          <LogOut className="h-4 w-4" /> SIGN OUT
        </button>
      </div>

      <div className="mt-8 flex flex-wrap gap-2 border-b border-border pb-4">
        {sections.map((s) => (
          <button
            key={s.key}
            onClick={() => setTab(s.key)}
            className={`rounded px-3 py-2 font-display text-xs tracking-widest transition-colors ${
              s.key === tab
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:border-primary hover:text-primary"
            }`}
          >
            {s.label.toUpperCase()}
            {s.key === "network" && pendingAlumni > 0 && (
              <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] text-white">
                {pendingAlumni}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {active.key === "network" ? (
          <AlumniNetwork />
        ) : (
        <CrudSection
          key={active.key}
          table={active.table}
          title={active.title}
          description={active.description}
          fields={active.fields}
          labelField={active.labelField}
          groupBy={active.groupBy}
        />
        )}
      </div>
    </div>
  );
}
