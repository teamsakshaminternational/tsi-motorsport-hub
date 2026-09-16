import { useState } from "react";
import { toast } from "sonner";
import { db } from "@/lib/db";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    setBusy(true);
    const { error } = await db
      .from("newsletter_subscribers")
      .insert({ email: email.trim().toLowerCase() });
    setBusy(false);
    if (error) {
      if (error.code === "23505") {
        toast.success("You're already on the list");
        setEmail("");
        return;
      }
      toast.error("Something went wrong. Please try again.");
      return;
    }
    setEmail("");
    toast.success("You're on the list. Watch this space.");
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        aria-label="Email address"
        className="flex-1 rounded border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded bg-primary px-6 py-3 font-display text-sm tracking-widest text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-60"
      >
        {busy ? "JOINING…" : "SUBSCRIBE"}
      </button>
    </form>
  );
}
