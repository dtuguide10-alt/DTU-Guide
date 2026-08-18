import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  ArrowUp,
  CornerUpLeft,
  CornerUpRight,
  Flag,
  Maximize2,
  Navigation as NavIcon,
  QrCode,
  X,
} from "lucide-react";
import { RouteCanvas, type CanvasMode } from "@/components/RouteCanvas";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/ui/button";
import { computeRoute, findDestination, findQrPoint } from "@/lib/campus";
import { useQrPoints } from "@/lib/useQrPoints";
import { logScan } from "@/lib/qrFns";
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

function ManeuverGlyph({ kind }: { kind: Maneuver["kind"] }) {
  switch (kind) {
    case "left":
      return <CornerUpLeft size={24} strokeWidth={2.25} />;
    case "right":
      return <CornerUpRight size={24} strokeWidth={2.25} />;
    case "straight":
      return <ArrowUp size={24} strokeWidth={2.25} />;
    default:
      return null;
  }
}

function Navigate() {
  const { to, from } = Route.useSearch();
  const qrPoints = useQrPoints();
  const dest = findDestination(to);
  const origin = findQrPoint(from, qrPoints);
  const navigate = useNavigate();

  const route = dest && origin ? computeRoute(origin, dest) : null;

  // log the navigation session start (fire-and-forget analytics)
  useEffect(() => {
    if (origin && dest) {
      logScan({ data: { qrCode: origin.code, destId: dest.id } }).catch(() => {});
    }
  }, [origin?.code, dest?.id, origin, dest]);

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
  const hasTurnGlyph = ["left", "right", "straight"].includes(upcoming.kind);
  const stairKind =
    upcoming.kind.startsWith("stairs") ? "stairs" : upcoming.kind.startsWith("lift") ? "elevator" : null;
  const progress = last > 0 ? Math.min(1, step / last) : atEnd ? 1 : 0;

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
        <div className="animate-rise pointer-events-auto mx-auto max-w-md overflow-hidden rounded-[16px] bg-primary text-primary-foreground shadow-[var(--elevation-2)]">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="grid size-12 shrink-0 place-items-center rounded-[12px] bg-white/15">
              {hasTurnGlyph ? (
                <ManeuverGlyph kind={upcoming.kind} />
              ) : stairKind ? (
                <Icon name={stairKind} size={24} strokeWidth={2} className="text-white" />
              ) : atEnd ? (
                <Flag size={22} strokeWidth={2.25} />
              ) : (
                <NavIcon size={22} strokeWidth={2.25} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-overline text-white/75">
                {atEnd ? "Destination ahead" : distToUpcoming > 0 ? `In ${distToUpcoming} m` : "Now"}
              </p>
              <p className="mt-0.5 truncate text-[16px] font-semibold leading-snug">{upcoming.text}</p>
            </div>
            <Link
              to="/"
              aria-label="Exit navigation"
              className="grid size-9 shrink-0 place-items-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
            >
              <X size={17} />
            </Link>
          </div>
          {/* progress */}
          <div className="flex items-center gap-2 px-4 pb-2.5">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-[width] duration-500 [transition-timing-function:var(--ease-soft)]"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <span className="text-[11px] font-medium tabular-nums text-white/75">
              Step {Math.min(step + 1, last + 1)} of {last + 1}
            </span>
          </div>
        </div>
      </div>

      {/* recenter / overview floating controls */}
      <div className="pointer-events-none absolute inset-x-0 bottom-44 flex justify-end px-4">
        <div className="pointer-events-auto flex flex-col gap-2.5">
          {/* zoom to current position — always available */}
          <button
            type="button"
            onClick={recenter}
            className={`grid size-12 place-items-center rounded-full border shadow-[var(--elevation-2)] transition-colors ${
              mode === "follow"
                ? "border-primary/40 bg-primary text-primary-foreground"
                : "border-border bg-card text-primary hover:bg-accent"
            }`}
            aria-label="Zoom to my position"
          >
            <Icon name="current" size={19} />
          </button>
          <button
            type="button"
            onClick={() => setMode("overview")}
            className="grid size-12 place-items-center rounded-full border border-border bg-card text-foreground shadow-[var(--elevation-2)] transition-colors hover:bg-accent"
            aria-label="Overview"
          >
            <Maximize2 size={18} />
          </button>
        </div>
      </div>

      {/* bottom sheet */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0">
        <div className="animate-sheet-in pointer-events-auto mx-auto max-w-md rounded-t-[22px] border border-border border-b-0 bg-card px-5 pb-6 pt-3 shadow-[0_-10px_32px_oklch(0.22_0.014_260/9%)]">
          <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-border" />

          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-[11px] bg-primary-wash text-primary">
              <Icon name={dest.icon} size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold leading-tight">{dest.name}</p>
              <p className="truncate text-[13px] text-muted-foreground">
                {dest.block} · {dest.floor}
              </p>
            </div>
            <div className="flex items-baseline gap-1.5 rounded-full bg-secondary px-3 py-1.5">
              <span className="text-[15px] font-semibold tabular-nums text-primary-deep">
                {remaining.min}
              </span>
              <span className="text-[12px] text-muted-foreground">min</span>
              <span className="mx-0.5 text-muted-foreground/40">·</span>
              <span className="text-[13px] font-medium tabular-nums text-foreground">{remaining.m}</span>
              <span className="text-[12px] text-muted-foreground">m</span>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2.5">
            {!started ? (
              <Button variant="pixel" size="pixel" onClick={start}>
                <NavIcon size={16} />
                Start navigation
              </Button>
            ) : atEnd ? (
              <Button variant="pixel" size="pixel" onClick={() => navigate({ to: "/" })}>
                <Flag size={16} />
                You have arrived · Finish
              </Button>
            ) : (
              <Button variant="pixel" size="pixel" onClick={next}>
                Next step
              </Button>
            )}

            <div className="flex gap-2.5">
              <Button asChild variant="pixelOutline" size="pixel" className="flex-1">
                <Link to="/scan" search={{ to: dest.id, from: origin.code }}>
                  <QrCode size={16} />
                  Scan again
                </Link>
              </Button>
              <Button variant="pixelQuiet" size="pixel" className="flex-1" onClick={() => navigate({ to: "/" })}>
                Exit
              </Button>
            </div>
          </div>

          <p className="mt-3.5 text-center text-[11px] tracking-wide text-muted-foreground">
            From {origin.name} · Position not tracked live
          </p>
        </div>
      </div>
    </main>
  );
}
