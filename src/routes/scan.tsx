import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { PixelIcon } from "@/components/PixelIcon";
import { QrScanner } from "@/components/QrScanner";
import { Button } from "@/components/ui/button";
import { QR_POINTS, findDestination, findQrPoint, type QrPoint } from "@/lib/campus";

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
function matchScanned(text: string): QrPoint | undefined {
  const t = text.trim();
  const exact = findQrPoint(t);
  if (exact) return exact;
  const m = t.toUpperCase().match(/AB4-\d-[A-Z0-9]+/);
  return m ? findQrPoint(m[0]) : undefined;
}

function Scan() {
  const { to, from } = Route.useSearch();
  const dest = findDestination(to);
  const navigate = useNavigate();
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
    const q = matchScanned(text);
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
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-md items-center gap-3 px-5 py-4">
          {rescan ? (
            <Link
              to="/navigate"
              search={{ to: dest.id, from }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back
            </Link>
          ) : (
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back
            </Link>
          )}
          <span className="text-sm font-semibold tracking-tight">
            {rescan ? "Scan a new QR code" : "Scan QR code"}
          </span>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-5">
        <div className="flex items-center gap-2.5 rounded-[8px] border border-border bg-card px-4 py-3">
          <PixelIcon name={dest.icon} size={16} className="text-primary" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Destination selected
            </p>
            <p className="truncate text-sm font-medium">{dest.name}</p>
          </div>
          <Link
            to="/"
            className="ml-auto text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Change
          </Link>
        </div>

        <div className="relative mt-4 aspect-square w-full overflow-hidden rounded-[8px] border border-border bg-black">
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
                className="absolute inset-x-2 h-[3px] bg-primary shadow-[0_0_8px_var(--primary)]"
                style={{ top: 0, animation: "scan-sweep 1.1s ease-in-out infinite" }}
              />
            )}
            {detected && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex items-center gap-2 rounded-[6px] bg-card px-3 py-2 shadow-[var(--shadow-soft)]">
                  <PixelIcon name="current" size={14} className="text-primary" />
                  <span className="text-xs font-medium">{detected.code} detected</span>
                </div>
              </div>
            )}
          </div>
          <div className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-[11px] text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]">
            {detected ? "Position locked" : "Point the camera at a DTU Guide QR code"}
          </div>
        </div>

        {invalid && !detected && (
          <p className="mt-2 rounded-[6px] bg-[color:var(--error)]/10 px-3 py-2 text-center text-[11px] text-[color:var(--error)]">
            {invalid}
          </p>
        )}

        <div className="mt-4 rounded-[8px] border border-border bg-card p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Your position
          </p>
          <p className="mt-1 text-sm font-medium">{detected ? detected.name : "Waiting for a scan…"}</p>
          <p className="text-xs text-muted-foreground">
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
              className="h-10 min-w-0 flex-1 rounded-[8px] border border-border bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <datalist id="qr-codes">
              {QR_POINTS.map((q) => (
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
          <span className="absolute left-0 top-0 h-[3px] w-7 bg-primary" />
          <span className="absolute left-0 top-0 h-7 w-[3px] bg-primary" />
          <span className="absolute left-[9px] top-[9px] size-[5px] bg-primary-deep" />
        </span>
      ))}
    </>
  );
}

export { findQrPoint };
