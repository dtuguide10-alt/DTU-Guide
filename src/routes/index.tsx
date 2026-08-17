import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SplashScreen } from "@/components/SplashScreen";
import { PixelIcon } from "@/components/PixelIcon";
import { PixelCluster } from "@/components/PixelBits";
import { POPULAR_DESTINATIONS, searchDestinations } from "@/lib/campus";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Campus Wayfinder — Indoor Navigation" },
      {
        name: "description",
        content:
          "Choose your destination, scan the nearest campus QR point and follow step-by-step indoor directions. No login required.",
      },
      { property: "og:title", content: "Campus Wayfinder — Indoor Navigation" },
      {
        property: "og:description",
        content: "Pick a destination, scan a QR point, follow the route indoors.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  // Show the splash only on the first visit of the session, so exiting a
  // navigation session returns straight to the destination picker.
  const [splash, setSplash] = useState(() => {
    if (typeof sessionStorage === "undefined") return true;
    return !sessionStorage.getItem("dtu-splash-seen");
  });
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const searching = query.trim().length > 0;
  const results = useMemo(
    () => (searching ? searchDestinations(query) : POPULAR_DESTINATIONS),
    [query, searching],
  );

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

      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-md items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2.5">
            <PixelIcon name="navigate" size={16} className="text-primary" />
            <span className="text-sm font-semibold tracking-tight">DTU Guide</span>
          </div>
          <PixelCluster />
        </div>
      </header>

      <div className="mx-auto max-w-md px-5 pb-16 pt-6">
        <h1 className="text-xl font-semibold tracking-tight">Where are you heading?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a destination first, then scan the nearest QR point to set your starting position.
        </p>

        <div className="pixel-grid relative mt-5 rounded-[8px] border border-border bg-card">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
            <PixelIcon name="destination" size={14} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search buildings, labs, offices…"
            aria-label="Search destinations"
            className="h-12 w-full rounded-[8px] bg-transparent pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <h2 className="mb-2 mt-7 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {searching
            ? `${results.length} result${results.length === 1 ? "" : "s"}`
            : "Popular destinations"}
        </h2>

        {results.length === 0 ? (
          <p className="rounded-[8px] border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
            No destination matches “{query}”.
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-[8px] border border-border bg-card">
            {results.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => navigate({ to: "/scan", search: { to: d.id } })}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                >
                  <PixelIcon name={d.icon} size={16} className="text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {d.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {d.block} · {d.floor}
                    </span>
                  </span>
                  <span className="size-[6px] bg-border" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-10 flex items-center justify-center gap-2 opacity-60">
          <span className="size-[3px] bg-primary/50" />
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            No login · QR-based indoor positioning
          </span>
          <span className="size-[3px] bg-primary/50" />
        </div>
      </div>
    </main>
  );
}
