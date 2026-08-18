import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { SplashScreen } from "@/components/SplashScreen";
import { Icon, type IconName } from "@/components/Icon";
import {
  DESTINATIONS,
  POPULAR_DESTINATIONS,
  searchDestinations,
  type Destination,
} from "@/lib/campus";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DTU Guide — Indoor Navigation" },
      {
        name: "description",
        content:
          "Choose your destination, scan the nearest campus QR point and follow step-by-step indoor directions. No login required.",
      },
      { property: "og:title", content: "DTU Guide — Indoor Navigation" },
      {
        property: "og:description",
        content: "Pick a destination, scan a QR point, follow the route indoors.",
      },
    ],
  }),
  component: Index,
});

const CATEGORIES: { id: string; label: string }[] = [
  { id: "lab", label: "Labs" },
  { id: "office", label: "Offices" },
  { id: "washroom", label: "Washrooms" },
  { id: "lift", label: "Lifts" },
];

const STAFF_TOOLS: { to: string; icon: IconName; label: string; sub: string }[] = [
  { to: "/qr-codes", icon: "qr", label: "QR codes", sub: "Print checkpoint codes" },
  { to: "/qr-editor", icon: "navigate", label: "QR editor", sub: "Place & tune checkpoints" },
  { to: "/admin", icon: "building", label: "Admin", sub: "Manage checkpoints" },
];

function Index() {
  // Show the splash only on the first visit of the session, so exiting a
  // navigation session returns straight to the destination picker.
  const [splash, setSplash] = useState(() => {
    if (typeof sessionStorage === "undefined") return true;
    return !sessionStorage.getItem("dtu-splash-seen");
  });
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const navigate = useNavigate();

  const searching = query.trim().length > 0;
  const results = useMemo<Destination[]>(() => {
    if (searching) return searchDestinations(query);
    if (category) return DESTINATIONS.filter((d) => d.room.category === category);
    return POPULAR_DESTINATIONS;
  }, [query, searching, category]);

  const heading = searching
    ? `${results.length} result${results.length === 1 ? "" : "s"}`
    : category
      ? CATEGORIES.find((c) => c.id === category)?.label ?? ""
      : "Popular destinations";

  return (
    <main className="min-h-screen bg-background">
      {splash && (
        <SplashScreen
          onDone={() => {
            sessionStorage.setItem("dtu-splash-seen", "1");
            setSplash(false);
          }}
        />
      )}

      <header className="sticky top-0 z-20 glass border-b border-border/70">
        <div className="mx-auto flex max-w-md items-center gap-2.5 px-5 py-3.5">
          <span className="grid size-8 place-items-center rounded-[9px] bg-primary text-primary-foreground shadow-[var(--elevation-1)]">
            <Icon name="navigate" size={16} className="text-primary-foreground" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">DTU Guide</span>
          <span className="ml-auto text-overline text-muted-foreground">AB-4</span>
        </div>
      </header>

      <div className="mx-auto max-w-md px-5 pb-20 pt-7">
        <h1 className="animate-rise text-display">Where are you heading?</h1>
        <p className="animate-rise mt-2 text-[15px] leading-relaxed text-muted-foreground" style={{ animationDelay: "40ms" }}>
          Pick a destination, then scan the nearest QR point to set your starting position.
        </p>

        <div
          className="animate-rise relative mt-6 rounded-[14px] border border-border bg-card shadow-[var(--elevation-1)] transition-colors focus-within:border-primary/40"
          style={{ animationDelay: "80ms" }}
        >
          <Search
            size={17}
            strokeWidth={1.9}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search rooms, labs, offices…"
            aria-label="Search destinations"
            className="h-[52px] w-full rounded-[14px] bg-transparent py-3.5 pl-11 pr-4 text-[15px] outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Category filter chips */}
        <div
          className="animate-rise mt-4 flex flex-wrap gap-2"
          style={{ animationDelay: "120ms" }}
        >
          {CATEGORIES.map((c) => {
            const active = category === c.id && !searching;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(active ? null : c.id)}
                className={`h-9 rounded-full border px-4 text-[13px] font-medium transition-all duration-200 [transition-timing-function:var(--ease-soft)] active:scale-95 ${
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-[var(--elevation-1)]"
                    : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        <h2
          className="animate-rise mb-2.5 mt-8 text-overline text-muted-foreground"
          style={{ animationDelay: "150ms" }}
        >
          {heading}
        </h2>

        {results.length === 0 ? (
          <p className="rounded-[14px] border border-dashed border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            No destination matches “{query}”.
          </p>
        ) : (
          <ul
            className="animate-rise divide-y divide-border overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--elevation-1)]"
            style={{ animationDelay: "180ms" }}
          >
            {results.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/scan", search: { to: d.id } })}
                  className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary-wash text-primary">
                    <Icon name={d.icon} size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-foreground">
                      {d.name}
                    </span>
                    <span className="block truncate text-[13px] text-muted-foreground">
                      {d.block} · {d.floor}
                    </span>
                  </span>
                  <ChevronRight size={18} className="shrink-0 text-muted-foreground/60" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Staff tools */}
        <h2 className="mb-2.5 mt-10 text-overline text-muted-foreground">Staff tools</h2>
        <ul className="divide-y divide-border overflow-hidden rounded-[14px] border border-border bg-card shadow-[var(--elevation-1)]">
          {STAFF_TOOLS.map((t) => (
            <li key={t.to}>
              <button
                type="button"
                onClick={() => navigate({ to: t.to })}
                className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-secondary text-muted-foreground">
                  <Icon name={t.icon} size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-foreground">
                    {t.label}
                  </span>
                  <span className="block truncate text-[13px] text-muted-foreground">{t.sub}</span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-muted-foreground/60" />
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-center text-[11px] uppercase tracking-[0.18em] text-muted-foreground/70">
          No login · QR-based indoor positioning
        </p>
      </div>
    </main>
  );
}
