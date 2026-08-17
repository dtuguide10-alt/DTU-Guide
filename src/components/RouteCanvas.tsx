import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Route } from "@/lib/nav/engine";
import type { Destination, QrPoint } from "@/lib/campus";
import { PixelIcon } from "@/components/PixelIcon";

const SCREEN_W = 400;
const SCREEN_H = 640;
const CENTER = { x: SCREEN_W / 2, y: SCREEN_H / 2 };
const FOLLOW_SCALE = 1.65;

export type CanvasMode = "overview" | "follow" | "free";

type Cam = { x: number; y: number; scale: number; rot: number };
type Pt = { x: number; y: number };

function rot2(x: number, y: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { x: x * c - y * s, y: x * s + y * c };
}
function shortestAngle(target: number, current: number) {
  let d = target - current;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return current + d;
}
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function RouteCanvas({
  route,
  from,
  dest,
  mode,
  activeStep,
  recenterNonce,
  onUserInteract,
}: {
  route: Route;
  from: QrPoint;
  dest: Destination;
  mode: CanvasMode;
  activeStep: number;
  recenterNonce: number;
  onUserInteract: () => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const worldRef = useRef<SVGGElement>(null);
  const puckRef = useRef<SVGGElement>(null);
  const camRef = useRef<Cam>({ x: 0, y: 0, scale: 1, rot: 0 });
  const arcRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const drawKey = `${from.code}-${dest.id}`;

  // ── per-floor legs + maneuver positions ─────────────────────────────────────
  const world = useMemo(() => {
    const legMap: Record<
      string,
      { floor: Route["legs"][number]["floor"]; pts: Pt[]; arc: number[]; total: number; bbox: { minX: number; maxX: number; minY: number; maxY: number } }
    > = {};
    for (const leg of route.legs) {
      const pts = leg.points.map(([x, y]) => ({ x, y }));
      const arc: number[] = [0];
      for (let i = 1; i < pts.length; i++) arc.push(arc[i - 1]! + Math.hypot(pts[i]!.x - pts[i - 1]!.x, pts[i]!.y - pts[i - 1]!.y));
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      legMap[leg.floor.id] = {
        floor: leg.floor,
        pts,
        arc,
        total: arc[arc.length - 1] ?? 0,
        bbox: { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) },
      };
    }
    const manInfo = route.maneuvers.map((m) => {
      const leg = legMap[m.floor];
      if (!leg) return { floorId: m.floor, arc: 0 };
      let best = 0;
      let bestD = Infinity;
      for (let i = 0; i < leg.pts.length; i++) {
        const d = Math.hypot(leg.pts[i]!.x - m.x, leg.pts[i]!.y - m.y);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      return { floorId: m.floor, arc: leg.arc[best]! };
    });
    return { legMap, manInfo, firstFloor: route.legs[0]?.floor.id ?? "" };
  }, [route]);

  const [displayFloor, setDisplayFloor] = useState(world.firstFloor);
  const displayFloorRef = useRef(world.firstFloor);
  const [transition, setTransition] = useState<{ text: string; up: boolean; lift: boolean } | null>(null);

  const sampleAt = useCallback(
    (floorId: string, a: number): { pos: Pt; dir: Pt } => {
      const leg = world.legMap[floorId];
      if (!leg || leg.pts.length === 0) return { pos: { x: 0, y: 0 }, dir: { x: 0, y: -1 } };
      if (leg.pts.length === 1) return { pos: leg.pts[0]!, dir: { x: 0, y: -1 } };
      const clamped = Math.max(0, Math.min(a, leg.total));
      let i = 1;
      while (i < leg.arc.length && leg.arc[i]! < clamped) i++;
      const p0 = leg.pts[i - 1]!;
      const p1 = leg.pts[i]!;
      const seg = leg.arc[i]! - leg.arc[i - 1]! || 1;
      const t = (clamped - leg.arc[i - 1]!) / seg;
      return { pos: { x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t }, dir: { x: p1.x - p0.x, y: p1.y - p0.y } };
    },
    [world],
  );

  const applyCam = useCallback(() => {
    const c = camRef.current;
    worldRef.current?.setAttribute("transform", `translate(${CENTER.x} ${CENTER.y}) rotate(${c.rot}) scale(${c.scale}) translate(${-c.x} ${-c.y})`);
    const s = sampleAt(displayFloorRef.current, arcRef.current);
    const dirDeg = (Math.atan2(s.dir.y, s.dir.x) * 180) / Math.PI + 90;
    puckRef.current?.setAttribute("transform", `translate(${s.pos.x} ${s.pos.y}) scale(${1 / c.scale}) rotate(${dirDeg + c.rot})`);
  }, [sampleAt]);

  const fitFloor = useCallback(
    (floorId: string): Cam => {
      const leg = world.legMap[floorId];
      if (!leg) return { x: 300, y: 1300, scale: 0.3, rot: 0 };
      const b = leg.bbox;
      const w = b.maxX - b.minX;
      const h = b.maxY - b.minY;
      if (w < 12 && h < 12) return { x: b.minX, y: b.minY, scale: FOLLOW_SCALE, rot: 0 };
      const scale = Math.min((SCREEN_W - 70) / Math.max(1, w), (SCREEN_H - 120) / Math.max(1, h));
      return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2, scale, rot: 0 };
    },
    [world],
  );

  const followCamFor = useCallback(
    (floorId: string, a: number, prevRot: number): Cam => {
      const s = sampleAt(floorId, a);
      // heading-up: rotate the plan so the direction of travel points up. This
      // keeps the puck's arrow pointing straight up (your heading) while the map
      // turns underneath, like a car navigation view.
      const theta = (Math.atan2(s.dir.y, s.dir.x) * 180) / Math.PI;
      return { x: s.pos.x, y: s.pos.y, scale: FOLLOW_SCALE, rot: shortestAngle(-90 - theta, prevRot) };
    },
    [sampleAt],
  );

  const stopAnim = () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const walkOnFloor = useCallback(
    (floorId: string, targetArc: number, follow: boolean) => {
      stopAnim();
      const startArc = arcRef.current;
      // slower, calmer walking pace
      const dur = Math.max(900, Math.min(Math.abs(targetArc - startArc) * 3.4, 5200));
      const t0 = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / dur);
        const e = easeInOut(t);
        arcRef.current = startArc + (targetArc - startArc) * e;
        if (follow) {
          const target = followCamFor(floorId, arcRef.current, camRef.current.rot);
          const c = camRef.current;
          camRef.current = {
            x: c.x + (target.x - c.x) * 0.25,
            y: c.y + (target.y - c.y) * 0.25,
            scale: c.scale + (target.scale - c.scale) * 0.16,
            rot: c.rot + (shortestAngle(target.rot, c.rot) - c.rot) * 0.2,
          };
        }
        applyCam();
        rafRef.current = t < 1 ? requestAnimationFrame(step) : null;
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [applyCam, followCamFor],
  );

  const flyCam = useCallback(
    (target: Cam, dur = 650) => {
      stopAnim();
      const f = { ...camRef.current };
      const rotTarget = shortestAngle(target.rot, f.rot);
      const t0 = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / dur);
        const e = easeInOut(t);
        camRef.current = { x: f.x + (target.x - f.x) * e, y: f.y + (target.y - f.y) * e, scale: f.scale + (target.scale - f.scale) * e, rot: f.rot + (rotTarget - f.rot) * e };
        applyCam();
        rafRef.current = t < 1 ? requestAnimationFrame(step) : null;
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [applyCam],
  );

  // reset on new route
  useEffect(() => {
    displayFloorRef.current = world.firstFloor;
    setDisplayFloor(world.firstFloor);
    arcRef.current = 0;
    camRef.current = fitFloor(world.firstFloor);
    requestAnimationFrame(applyCam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawKey]);

  // keep transform synced after any re-render (floor image swap)
  useEffect(() => {
    applyCam();
  }, [displayFloor, applyCam]);

  // react to step / mode / recenter
  useEffect(() => {
    const info = world.manInfo[activeStep];
    if (!info) return;
    setTransition(null); // clear any previous floor-change card when advancing

    if (info.floorId !== displayFloorRef.current) {
      // floor change: cross-fade to the new floor and show a card that STAYS
      // on screen until the user advances to the next step
      const tman = route.maneuvers[activeStep - 1];
      displayFloorRef.current = info.floorId;
      setDisplayFloor(info.floorId);
      if (tman) setTransition({ text: tman.text, up: tman.kind.includes("-up"), lift: tman.kind.includes("lift") });
      arcRef.current = 0;
      requestAnimationFrame(() => {
        camRef.current = mode === "overview" ? fitFloor(info.floorId) : followCamFor(info.floorId, 0, 0);
        applyCam();
      });
      const t = setTimeout(() => {
        if (mode === "overview") flyCam(fitFloor(info.floorId));
        else if (mode !== "free") walkOnFloor(info.floorId, info.arc, true);
      }, 700);
      return () => clearTimeout(t);
    }

    if (mode === "overview") flyCam(fitFloor(info.floorId));
    else if (mode === "follow") walkOnFloor(info.floorId, info.arc, true);
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, activeStep, recenterNonce, drawKey]);

  // ── manual gestures ─────────────────────────────────────────────────────────
  const toLogical = (cx: number, cy: number) => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = cx;
    pt.y = cy;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const p = pt.matrixTransform(ctm.inverse());
    return { x: p.x, y: p.y };
  };
  const screenToWorld = (sx: number, sy: number) => {
    const c = camRef.current;
    const v = rot2(sx - CENTER.x, sy - CENTER.y, -c.rot);
    return { x: c.x + v.x / c.scale, y: c.y + v.y / c.scale };
  };
  // don't allow zooming out past showing the whole floor (keeps the map usable)
  const minScaleFor = (floorId: string) => {
    const f = world.legMap[floorId]?.floor;
    const vh = f ? f.viewBox[3] : 2620;
    return (SCREEN_H - 24) / vh;
  };
  const zoomAt = (lx: number, ly: number, factor: number) => {
    const c = camRef.current;
    const anchor = screenToWorld(lx, ly);
    const scale = Math.max(minScaleFor(displayFloorRef.current), Math.min(6, c.scale * factor));
    const v = rot2(lx - CENTER.x, ly - CENTER.y, -c.rot);
    camRef.current = { ...c, scale, x: anchor.x - v.x / scale, y: anchor.y - v.y / scale };
    applyCam();
  };
  const drag = useRef<Pt | null>(null);
  const pinch = useRef<{ dist: number } | null>(null);
  const pointers = useRef<Map<number, Pt>>(new Map());
  const interacted = useRef(false);
  const flagInteract = () => {
    if (!interacted.current) {
      interacted.current = true;
      onUserInteract();
    }
  };
  const onPointerDown = (e: React.PointerEvent) => {
    stopAnim();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) drag.current = toLogical(e.clientX, e.clientY);
    else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a!.x - b!.x, a!.y - b!.y) };
      drag.current = null;
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      const mid = toLogical((a!.x + b!.x) / 2, (a!.y + b!.y) / 2);
      zoomAt(mid.x, mid.y, d / pinch.current.dist);
      pinch.current.dist = d;
      flagInteract();
      return;
    }
    if (drag.current) {
      const l = toLogical(e.clientX, e.clientY);
      const c = camRef.current;
      const dW = rot2(l.x - drag.current.x, l.y - drag.current.y, -c.rot);
      camRef.current = { ...c, x: c.x - dW.x / c.scale, y: c.y - dW.y / c.scale };
      applyCam();
      drag.current = l;
      flagInteract();
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) drag.current = null;
  };
  // native, non-passive wheel handler so we can preventDefault the browser's
  // ctrl+wheel / trackpad pinch page-zoom and zoom only the map
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      stopAnim();
      const l = toLogical(e.clientX, e.clientY);
      zoomAt(l.x, l.y, e.deltaY < 0 ? 1.12 : 1 / 1.12);
      flagInteract();
    };
    svg.addEventListener("wheel", handler, { passive: false });
    return () => svg.removeEventListener("wheel", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => stopAnim(), []);

  const leg = world.legMap[displayFloor];
  const routeD = leg && leg.pts.length > 1 ? leg.pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ") : "";
  const showDest = dest.room.floor === displayFloor && dest.room.label;
  const showOrigin = from.floor === displayFloor;
  const originNode = leg?.pts[0];

  return (
    <div className="relative h-full w-full overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SCREEN_W} ${SCREEN_H}`}
        className="h-full w-full touch-none select-none bg-white"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <g ref={worldRef}>
          {leg && (
            <g key={displayFloor} style={{ animation: "map-fade-in 350ms ease-out" }}>
              <image href={leg.floor.image} x={0} y={0} width={leg.floor.viewBox[2]} height={leg.floor.viewBox[3]} preserveAspectRatio="none" />
            </g>
          )}

          {routeD && (
            <>
              {/* white casing for clear separation from the plan's fine lines */}
              <path d={routeD} fill="none" stroke="#ffffff" strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              <path d={routeD} fill="none" stroke="var(--primary-deep)" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity={0.35} />
              <path d={routeD} fill="none" stroke="var(--primary)" strokeWidth={6.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </>
          )}

          {showOrigin && originNode && (
            <circle cx={originNode.x} cy={originNode.y} r={6} fill="#fff" stroke="var(--primary-deep)" strokeWidth={3} vectorEffect="non-scaling-stroke" />
          )}

          {showDest && (
            <g transform={`translate(${dest.room.label!.x} ${dest.room.label!.y})`}>
              <circle r={17} fill="var(--primary)" opacity={0.16} />
              <path d="M0 14 C -9 2 -9 -6 0 -6 C 9 -6 9 2 0 14 Z" fill="var(--primary)" stroke="#fff" strokeWidth={2} vectorEffect="non-scaling-stroke" transform="translate(0 -6) scale(1.2)" />
              <circle cx={0} cy={-13} r={3.4} fill="#fff" />
            </g>
          )}

          <g ref={puckRef}>
            <circle r={15} fill="var(--primary)" opacity={0.2} />
            <circle r={9} fill="#fff" />
            <circle r={7} fill="var(--primary)" />
            <path d="M0 -14 L7 -4 L-7 -4 Z" fill="var(--primary-deep)" />
          </g>
        </g>
      </svg>

      {/* floor badge */}
      {leg && (
        <div className="pointer-events-none absolute left-3 top-20 rounded-full border border-border bg-card/90 px-3 py-1 text-xs font-semibold text-primary-deep shadow-[var(--shadow-soft)] backdrop-blur">
          {leg.floor.name}
        </div>
      )}

      {/* floor transition card — stays until the user advances */}
      {transition && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center px-6">
          <div
            className="flex items-center gap-3 rounded-[14px] border border-white/20 bg-primary px-5 py-4 text-primary-foreground shadow-[0_12px_32px_rgba(23,32,42,0.28)]"
            style={{ animation: "floor-card-in 300ms ease-out" }}
          >
            <div className="grid size-11 shrink-0 place-items-center rounded-full bg-white/15">
              <PixelIcon name={transition.lift ? "elevator" : "stairs"} size={24} className="text-white" />
            </div>
            <div>
              <p className="text-[15px] font-semibold leading-tight">{transition.text}</p>
              <p className="text-[12px] text-white/80">
                {transition.up ? "Going up" : "Going down"} · tap Next when you arrive
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
