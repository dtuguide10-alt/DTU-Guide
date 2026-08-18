import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { ArrowLeft, Check } from "lucide-react";
import { Icon } from "@/components/Icon";
import { QrScanner } from "@/components/QrScanner";
import { Button } from "@/components/ui/button";
import { findDestination, findQrPoint, type QrPoint } from "@/lib/campus";
import { useQrPoints } from "@/lib/useQrPoints";

const searchSchema = z.object({ to: z.string().optional(), from: z.string().optional() });

export const Route = createFileRoute("/scan")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Scan QR Point — DTU Guide" },
      {
        name: "description",
        content:
          "Scan the nearest DTU Guide QR code to set your current indoor position and calculate the route.",
      },
    ],
  }),
  component: Scan,
});

/** Match scanned text to a checkpoint. Accepts the raw code or a code embedded in text/URL. */
function matchScanned(text: string, list: QrPoint[]): QrPoint | undefined {
  const t = text.trim();
  const exact = findQrPoint(t, list);
  if (exact) return exact;
  const m = t.toUpperCase().match(/AB4-\d-[A-Z0-9]+/);
  return m ? findQrPoint(m[0], list) : undefined;
}

function Scan() {
  const { to, from } = Route.useSearch();
  const dest = findDestination(to);
  const navigate = useNavigate();
  const qrPoints = useQrPoints();
  const [detected, setDetected] = useState<QrPoint | null>(null);
  const [invalid, setInvalid] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  if (!dest) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="text-sm text-muted-foreground">Choose a destination before scanning.</p>
        <Button asChild variant="pixel" size="pixel">
          <Link to="/">Back to destinations</Link>
        </Button>
      </main>
    );
  }

  const rescan = Boolean(from);

  function handleText(text: string) {
    const q = matchScanned(text, qrPoints);
    if (q) {
      setInvalid(null);
      setDetected(q);
    } else {
      setInvalid(`“${text.slice(0, 24)}” is not a DTU Guide checkpoint`);
    }
  }

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    if (manual.trim()) handleText(manual);
  }

  return (
    <main className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-20 glass border-b border-border/70">
        <div className="mx-auto flex max-w-md items-center gap-2.5 px-5 py-3.5">
          {rescan ? (
            <Link
              to="/navigate"
              search={{ to: dest.id, from }}
              aria-label="Back"
              className="grid size-9 -ml-1.5 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft size={18} />
            </Link>
          ) : (
            <Link
              to="/"
              aria-label="Back"
              className="grid size-9 -ml-1.5 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft size={18} />
            </Link>
          )}
          <span className="text-[15px] font-semibold tracking-tight">
            {rescan ? "Scan a new QR code" : "Scan QR code"}
          </span>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-5">
        <div className="flex items-center gap-3 rounded-[14px] border border-border bg-card px-4 py-3 shadow-[var(--elevation-1)]">
          <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary-wash text-primary">
            <Icon name={dest.icon} size={17} />
          </span>
          <div className="min-w-0">
            <p className="text-overline text-muted-foreground">Destination</p>
            <p className="truncate text-[15px] font-medium">{dest.name}</p>
          </div>
          <Link
            to="/"
            className="ml-auto rounded-full px-3 py-1.5 text-[13px] font-medium text-primary transition-colors hover:bg-accent"
          >
            Change
          </Link>
        </div>

        <div className="relative mt-4 aspect-square w-full overflow-hidden rounded-[16px] border border-border bg-black shadow-[var(--elevation-1)]">
          {!detected ? (
            <QrScanner active={!detected} onDecode={handleText} />
          ) : (
            <div className="pixel-grid absolute inset-0 bg-muted" />
          )}

          {/* frame overlay */}
          <div className="pointer-events-none absolute inset-8">
            <PixelFrameCorners />
            {!detected && (
              <div
                className="absolute inset-x-2 h-px bg-primary/80"
                style={{ top: 0, animation: "scan-sweep 1.8s var(--ease-soft) infinite" }}
              />
            )}
            {detected && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-rise flex items-center gap-2 rounded-full glass px-3.5 py-2 shadow-[var(--elevation-2)]">
                  <span className="grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check size={13} strokeWidth={2.5} />
                  </span>
                  <span className="text-[13px] font-medium">{detected.code} detected</span>
                </div>
              </div>
            )}
          </div>
          <div className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-[11px] text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">
            {detected ? "Position locked" : "Point the camera at a DTU Guide QR code"}
          </div>
        </div>

        {invalid && !detected && (
          <p className="mt-2 rounded-[10px] bg-destructive/10 px-3 py-2.5 text-center text-[12px] font-medium text-destructive">
            {invalid}
          </p>
        )}

        <div className="mt-4 rounded-[14px] border border-border bg-card p-4 shadow-[var(--elevation-1)]">
          <p className="text-overline text-muted-foreground">Your position</p>
          <p className="mt-1.5 text-[15px] font-medium">
            {detected ? detected.name : "Waiting for a scan…"}
          </p>
          <p className="text-[13px] text-muted-foreground">
            {detected ? detected.block : "Hold the phone steady over the code"}
          </p>
        </div>

        {/* manual fallback (no camera / can't scan) */}
        {!detected && (
          <form onSubmit={submitManual} className="mt-3 flex gap-2">
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              list="qr-codes"
              placeholder="Or type the code, e.g. AB4-1-01"
              className="h-11 min-w-0 flex-1 rounded-[10px] border border-border bg-card px-3.5 text-sm outline-none transition-colors focus-visible:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            />
            <datalist id="qr-codes">
              {qrPoints.map((q) => (
                <option key={q.code} value={q.code}>
                  {q.name}
                </option>
              ))}
            </datalist>
            <Button type="submit" variant="pixelOutline" size="pixel" className="shrink-0 px-4">
              Set
            </Button>
          </form>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-6">
          <Button
            variant="pixel"
            size="pixel"
            disabled={!detected}
            onClick={() => detected && navigate({ to: "/navigate", search: { to: dest.id, from: detected.code } })}
          >
            Continue
          </Button>
          {detected && (
            <Button
              variant="pixelOutline"
              size="pixel"
              onClick={() => {
                setDetected(null);
                setManual("");
              }}
            >
              Scan again
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}

function PixelFrameCorners() {
  const corners = ["left-0 top-0", "right-0 top-0 rotate-90", "bottom-0 right-0 rotate-180", "bottom-0 left-0 -rotate-90"];
  return (
    <>
      {corners.map((c) => (
        <span key={c} className={`absolute size-8 ${c}`} aria-hidden>
          <span className="absolute left-0 top-0 h-[2px] w-6 rounded-full bg-white/90" />
          <span className="absolute left-0 top-0 h-6 w-[2px] rounded-full bg-white/90" />
        </span>
      ))}
    </>
  );
}

export { findQrPoint };
