import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/Icon";
import { FLOOR_ORDER } from "@/lib/nav/engine";
import type { NavNode } from "@/lib/nav/types";

export const Route = createFileRoute("/qr-editor")({
  head: () => ({ meta: [{ title: "QR Placement Editor — DTU Guide" }] }),
  component: QrEditor,
});

type Placed = {
  id: string;
  floorId: string;
  x: number;
  y: number;
  nodeId: string;
  name: string;
  code: string;
};

function nearestNode(nodes: NavNode[], x: number, y: number): NavNode {
  let best = nodes[0]!;
  let bestD = Infinity;
  for (const n of nodes) {
    const d = Math.hypot(n.x - x, n.y - y);
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best;
}

function QrEditor() {
  const [floorId, setFloorId] = useState(FLOOR_ORDER[0]!.id);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const floor = useMemo(() => FLOOR_ORDER.find((f) => f.id === floorId)!, [floorId]);
  const u = floor.viewBox[2] / 300;

  function toSvg(clientX: number, clientY: number) {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    const [, , vw, vh] = floor.viewBox;
    return {
      x: ((clientX - rect.left) / rect.width) * vw,
      y: ((clientY - rect.top) / rect.height) * vh,
    };
  }

  function addAt(clientX: number, clientY: number) {
    const { x, y } = toSvg(clientX, clientY);
    const node = nearestNode(floor.nodes, x, y);
    const level = floor.level;
    const n = placed.filter((p) => p.floorId === floorId).length + 1;
    const code = `AB4-${level}-${String(n).padStart(2, "0")}`;
    const id = `${Date.now()}`;
    setPlaced((prev) => [...prev, { id, floorId, x, y, nodeId: node.id, name: "", code }]);
    setFocusId(id);
  }

  function moveDrag(clientX: number, clientY: number) {
    if (!dragId) return;
    const { x, y } = toSvg(clientX, clientY);
    const node = nearestNode(floor.nodes, x, y);
    setPlaced((prev) =>
      prev.map((p) => (p.id === dragId ? { ...p, x, y, nodeId: node.id } : p)),
    );
  }

  const onThisFloor = placed.filter((p) => p.floorId === floorId);

  const configText = useMemo(() => {
    const lines = placed
      .slice()
      .sort((a, b) => (a.code < b.code ? -1 : 1))
      .map(
        (p) =>
          `  { code: ${JSON.stringify(p.code)}, name: ${JSON.stringify(
            p.name || p.nodeId,
          )}, floor: ${JSON.stringify(p.floorId)}, node: ${JSON.stringify(p.nodeId)} },`,
      );
    return `export const QR_POINTS: QrPoint[] = [\n${lines.join("\n")}\n];`;
  }, [placed]);

  const [, , vw, vh] = floor.viewBox;

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 glass border-b border-border/70">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-3.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary-wash text-primary">
            <Icon name="qr" size={18} />
          </span>
          <div>
            <p className="text-[15px] font-semibold tracking-tight">QR Placement Editor</p>
            <p className="text-[13px] text-muted-foreground">
              Tap the real plan to drop a QR, then drag it to the exact spot. It snaps to the
              nearest navigation point.
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-6 px-5 py-6 md:grid-cols-[minmax(0,360px)_1fr]">
        {/* map column */}
        <div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {FLOOR_ORDER.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFloorId(f.id)}
                className={`rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-all duration-200 [transition-timing-function:var(--ease-soft)] active:scale-95 ${
                  floorId === f.id
                    ? "border-primary bg-primary text-primary-foreground shadow-[var(--elevation-1)]"
                    : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>

          <div className="max-h-[74vh] overflow-y-auto rounded-[14px] border border-border bg-card shadow-[var(--elevation-1)]">
            <svg
              ref={svgRef}
              viewBox={floor.viewBox.join(" ")}
              className="w-full touch-none select-none"
              style={{ cursor: dragId ? "grabbing" : "crosshair" }}
              onClick={(e) => {
                if (dragId) return;
                addAt(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => dragId && moveDrag(e.clientX, e.clientY)}
              onPointerUp={() => setDragId(null)}
              onPointerLeave={() => setDragId(null)}
            >
              {floor.image ? (
                <image href={floor.image} x="0" y="0" width={vw} height={vh} preserveAspectRatio="none" />
              ) : (
                <rect x="0" y="0" width={vw} height={vh} fill="var(--card)" />
              )}

              {/* snap points */}
              {floor.nodes.map((n) => (
                <circle key={n.id} cx={n.x} cy={n.y} r={1.6 * u} fill="var(--primary)" opacity={0.3} />
              ))}

              {/* placed QR markers */}
              {onThisFloor.map((p) => {
                const node = floor.nodes.find((n) => n.id === p.nodeId);
                return (
                  <g key={p.id}>
                    {node && (
                      <line
                        x1={p.x}
                        y1={p.y}
                        x2={node.x}
                        y2={node.y}
                        stroke="var(--primary)"
                        strokeWidth={1 * u}
                        strokeDasharray={`${3 * u} ${3 * u}`}
                        opacity={0.7}
                      />
                    )}
                    <g
                      style={{ cursor: "grab" }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        (e.target as Element).setPointerCapture?.(e.pointerId);
                        setDragId(p.id);
                      }}
                    >
                      <circle cx={p.x} cy={p.y} r={12 * u} fill="var(--primary-wash)" stroke="var(--primary)" strokeWidth={2 * u} />
                      <rect x={p.x - 4 * u} y={p.y - 4 * u} width={8 * u} height={8 * u} fill="var(--primary-deep)" />
                      <text x={p.x} y={p.y - 17 * u} fontSize={13 * u} fill="var(--primary-deep)" fontWeight="700" textAnchor="middle">
                        {p.code}
                      </text>
                      {p.name && (
                        <text x={p.x} y={p.y + 26 * u} fontSize={12 * u} fill="var(--foreground)" textAnchor="middle">
                          {p.name}
                        </text>
                      )}
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Faint dots are navigation points. Each QR attaches to the nearest one (dashed line).
          </p>
        </div>

        {/* list + export */}
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold tracking-tight">
              Placed QR points ({placed.length} total · {onThisFloor.length} on {floor.name})
            </h2>
            {placed.length > 0 && (
              <button
                type="button"
                onClick={() => setPlaced([])}
                className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Clear all
              </button>
            )}
          </div>

          {onThisFloor.length === 0 ? (
            <p className="mt-3 rounded-[8px] border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
              No QR points on {floor.name} yet. Tap the plan to add one.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {onThisFloor.map((p) => (
                <li key={p.id} className="flex items-center gap-2 rounded-[12px] border border-border bg-card px-3 py-2.5 shadow-[var(--elevation-1)]">
                  <span className="rounded-[4px] border border-border px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                    {p.code}
                  </span>
                  <input
                    value={p.name}
                    placeholder="Name this spot (e.g. Lift Lobby)"
                    ref={(el) => {
                      if (el && focusId === p.id) {
                        el.focus();
                        el.scrollIntoView({ block: "nearest" });
                        setFocusId(null);
                      }
                    }}
                    onChange={(e) =>
                      setPlaced((prev) => prev.map((x) => (x.id === p.id ? { ...x, name: e.target.value } : x)))
                    }
                    className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <span className="shrink-0 text-[10px] text-muted-foreground">{p.nodeId}</span>
                  <button
                    type="button"
                    onClick={() => setPlaced((prev) => prev.filter((x) => x.id !== p.id))}
                    className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Remove"
                  >
                    <X size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <h3 className="mb-2 mt-8 text-overline text-muted-foreground">Generated config</h3>
          <textarea
            readOnly
            value={configText}
            onFocus={(e) => e.currentTarget.select()}
            className="h-56 w-full resize-none rounded-[12px] border border-border bg-muted p-3.5 font-mono text-[11px] leading-relaxed text-foreground outline-none"
          />
          <Button
            variant="pixel"
            size="pixel"
            className="mt-3 w-full"
            onClick={() => navigator.clipboard?.writeText(configText)}
          >
            Copy config to clipboard
          </Button>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Place all your QRs across the four floors, copy this, and paste it back to me — I'll wire
            it into the app.
          </p>
        </div>
      </div>
    </main>
  );
}
