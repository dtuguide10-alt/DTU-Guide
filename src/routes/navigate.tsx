import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { RouteCanvas, type CanvasMode } from "@/components/RouteCanvas";
import { PixelIcon } from "@/components/PixelIcon";
import { Button } from "@/components/ui/button";
import { computeRoute, findDestination, findQrPoint } from "@/lib/campus";
import type { Maneuver } from "@/lib/nav/engine";

const searchSchema = z.object({ to: z.string().optional(), from: z.string().optional() });

export const Route = createFileRoute("/navigate")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Live Route — DTU Guide" },
      { name: "description", content: "Turn-by-turn indoor directions across AB-4." },
    ],
  }),
  component: Navigate,
});

function maneuverGlyph(kind: Maneuver["kind"]) {
  switch (kind) {
    case "left":
      return "↰";
    case "right":
      return "↱";
    case "straight":
      return "↑";
    default:
      return null;
  }
}

function Navigate() {
  const { to, from } = Route.useSearch();
  const dest = findDestination(to);
  const origin = findQrPoint(from);
  const navigate = useNavigate();

  const route = dest && origin ? computeRoute(origin, dest) : null;

  const [step, setStep] = useState(0);
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState<CanvasMode>("overview");
  const [recenterNonce, setRecenterNonce] = useState(0);

  const maneuvers = route?.maneuvers ?? [];
  const last = maneuvers.length - 1;

  const remaining = useMemo(() => {
    if (!route) return { m: 0, min: 0 };
    const ahead = maneuvers.slice(step);
    const m = ahead.reduce((s, mv) => s + mv.distToNextM, 0);
    const floorChangesAhead = ahead.filter((mv) => mv.kind.includes("-")).length;
    return { m, min: Math.max(1, Math.round(m / (1.3 * 60) + floorChangesAhead * 0.5)) };
  }, [route, maneuvers, step]);

  if (!dest || !origin || !route || !route.ok) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="text-sm text-muted-foreground">
          This navigation session has ended. Start by choosing a destination.
        </p>
        <Button asChild variant="pixel" size="pixel">
          <Link to="/">Go to Home</Link>
        </Button>
      </main>
    );
  }

  const atEnd = step >= last;
  const upcoming = maneuvers[Math.min(step + 1, last)]!;
  const distToUpcoming = maneuvers[step]?.distToNextM ?? 0;
  const glyph = maneuverGlyph(upcoming.kind);
  const stairKind =
    upcoming.kind.startsWith("stairs") ? "stairs" : upcoming.kind.startsWith("lift") ? "elevator" : null;

  const start = () => {
    setStarted(true);
    setStep(0);
    setMode("follow");
  };
  const next = () => {
    setStep((s) => Math.min(s + 1, last));
    setMode("follow");
  };
  const recenter = () => {
    setMode("follow");
    setRecenterNonce((n) => n + 1);
  };

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-secondary">
      {/* full-screen map */}
      <div className="absolute inset-0">
        <RouteCanvas
          route={route}
          from={origin}
          dest={dest}
          mode={mode}
          activeStep={step}
          recenterNonce={recenterNonce}
          onUserInteract={() => setMode("free")}
        />
      </div>

      {/* top maneuver banner */}
      <div className="pointer-events-none absolute inset-x-0 top-0 p-3">
        <div className="pointer-events-auto mx-auto flex max-w-md items-center gap-3 rounded-[14px] bg-primary px-4 py-3 text-primary-foreground shadow-[0_8px_24px_rgba(23,32,42,0.18)]">
          <div className="grid size-11 shrink-0 place-items-center rounded-[10px] bg-white/15">
            {glyph ? (
              <span className="text-2xl leading-none">{glyph}</span>
            ) : stairKind ? (
              <PixelIcon name={stairKind} size={22} className="text-white" />
            ) : atEnd ? (
              <PixelIcon name="destination" size={20} className="text-white" />
            ) : (
              <PixelIcon name="navigate" size={20} className="text-white" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-medium uppercase tracking-wide text-white/80">
              {atEnd ? "Destination ahead" : distToUpcoming > 0 ? `In ${distToUpcoming} m` : "Now"}
            </p>
            <p className="text-[15px] font-semibold leading-snug">{upcoming.text}</p>
          </div>
          <Link
            to="/"
            aria-label="Exit navigation"
            className="grid size-8 shrink-0 place-items-center rounded-full bg-white/15 text-white/90 hover:bg-white/25"
          >
            ✕
          </Link>
        </div>
      </div>

      {/* recenter / overview floating controls */}
      <div className="pointer-events-none absolute inset-x-0 bottom-44 flex justify-end px-4">
        <div className="pointer-events-auto flex flex-col gap-2">
          {/* zoom to current position — always available */}
          <button
            type="button"
            onClick={recenter}
            className={`grid size-11 place-items-center rounded-full border shadow-[var(--shadow-soft)] ${
              mode === "follow"
                ? "border-primary/40 bg-primary-wash text-primary-deep"
                : "border-border bg-card text-primary"
            }`}
            aria-label="Zoom to my position"
          >
            <PixelIcon name="current" size={18} />
          </button>
          <button
            type="button"
            onClick={() => setMode("overview")}
            className="grid size-11 place-items-center rounded-full border border-border bg-card text-foreground shadow-[var(--shadow-soft)]"
            aria-label="Overview"
          >
            ⤢
          </button>
        </div>
      </div>

      {/* bottom sheet */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0">
        <div className="pointer-events-auto mx-auto max-w-md rounded-t-[18px] border border-border border-b-0 bg-card px-5 pb-6 pt-4 shadow-[0_-8px_24px_rgba(23,32,42,0.10)]">
          <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-border" />

          <div className="flex items-center gap-3">
            <PixelIcon name={dest.icon} size={18} className="text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">{dest.name}</p>
              <p className="text-xs text-muted-foreground">
                {dest.block} · {dest.floor}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums text-primary-deep">{remaining.min} min</p>
              <p className="text-[11px] tabular-nums text-muted-foreground">{remaining.m} m left</p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {!started ? (
              <Button variant="pixel" size="pixel" onClick={start}>
                <PixelIcon name="navigate" size={14} className="text-primary-foreground" />
                Start navigation
              </Button>
            ) : atEnd ? (
              <Button variant="pixel" size="pixel" onClick={() => navigate({ to: "/" })}>
                <PixelIcon name="destination" size={14} className="text-primary-foreground" />
                You have arrived · Finish
              </Button>
            ) : (
              <Button variant="pixel" size="pixel" onClick={next}>
                Next step
              </Button>
            )}

            <div className="flex gap-2">
              <Button asChild variant="pixelOutline" size="pixel" className="flex-1">
                <Link to="/scan" search={{ to: dest.id, from: origin.code }}>
                  <PixelIcon name="qr" size={14} className="text-primary" />
                  Scan again
                </Link>
              </Button>
              <Button variant="pixelQuiet" size="pixel" className="flex-1" onClick={() => navigate({ to: "/" })}>
                Exit
              </Button>
            </div>
          </div>

          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            <span className="size-[3px] bg-primary/50" />
            From {origin.name} · Position not tracked live
            <span className="size-[3px] bg-primary/50" />
          </p>
        </div>
      </div>
    </main>
  );
}
