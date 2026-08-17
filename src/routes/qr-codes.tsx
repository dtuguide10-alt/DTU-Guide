import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { QR_POINTS } from "@/lib/campus";
import { getFloor } from "@/lib/nav/engine";

export const Route = createFileRoute("/qr-codes")({
  head: () => ({ meta: [{ title: "Printable QR Codes — DTU Guide" }] }),
  component: QrCodes,
});

function QrCodes() {
  const [urls, setUrls] = useState<Record<string, string>>({});

  // group checkpoints by floor (in order)
  const groups = useMemo(() => {
    const byFloor = new Map<string, typeof QR_POINTS>();
    for (const q of QR_POINTS) {
      if (!byFloor.has(q.floor)) byFloor.set(q.floor, []);
      byFloor.get(q.floor)!.push(q);
    }
    return [...byFloor.entries()]
      .map(([floorId, points]) => ({ floor: getFloor(floorId), points }))
      .sort((a, b) => (a.floor?.level ?? 0) - (b.floor?.level ?? 0));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const QRCode = (await import("qrcode")).default;
      const out: Record<string, string> = {};
      for (const q of QR_POINTS) {
        // Each QR encodes just the checkpoint code, which the in-app scanner reads.
        out[q.code] = await QRCode.toDataURL(q.code, { margin: 1, width: 320, errorCorrectionLevel: "M" });
      }
      if (!cancelled) setUrls(out);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="min-h-screen bg-background">
      {/* toolbar (screen only) */}
      <div className="border-b border-border bg-card print:hidden">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <h1 className="text-sm font-semibold tracking-tight">Printable QR codes</h1>
            <p className="text-xs text-muted-foreground">
              {QR_POINTS.length} checkpoints · each code is a QR the app scanner reads. Print, cut,
              and stick each one at its location.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-[8px] bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-soft)] hover:bg-primary/90"
          >
            Print / Save PDF
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-5 py-6 print:px-0 print:py-0">
        {groups.map(({ floor, points }) => (
          <section key={floor?.id} className="mb-8 break-inside-avoid">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {floor?.name ?? "Floor"} — {points.length} codes
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 print:grid-cols-3">
              {points.map((q) => (
                <div
                  key={q.code}
                  className="flex break-inside-avoid flex-col items-center rounded-[10px] border border-border bg-white p-3 text-center"
                >
                  {urls[q.code] ? (
                    <img src={urls[q.code]} alt={q.code} className="aspect-square w-full max-w-[150px]" />
                  ) : (
                    <div className="aspect-square w-full max-w-[150px] animate-pulse rounded bg-muted" />
                  )}
                  <p className="mt-2 font-mono text-sm font-bold tracking-tight text-foreground">{q.code}</p>
                  <p className="text-[11px] leading-tight text-muted-foreground">{q.name}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
