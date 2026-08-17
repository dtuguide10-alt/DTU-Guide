import { getFloor, getNode, type Route } from "@/lib/nav/engine";
import type { Destination, QrPoint } from "@/lib/campus";
import type { Room, RoomShape } from "@/lib/nav/types";

function centroid(shape: RoomShape): [number, number] {
  if (shape.type === "rect") return [shape.x + shape.w / 2, shape.y + shape.h / 2];
  const pts = shape.points;
  const n = pts.length;
  const c = pts.reduce((a, p) => [a[0] + p[0], a[1] + p[1]] as [number, number], [0, 0]);
  return [c[0] / n, c[1] / n];
}

function shapeAttrs(shape: RoomShape) {
  if (shape.type === "rect") {
    return { tag: "rect" as const, x: shape.x, y: shape.y, w: shape.w, h: shape.h };
  }
  return { tag: "poly" as const, points: shape.points.map((p) => p.join(",")).join(" ") };
}

/**
 * Renders one floor's map — the traced plan image as the background when the
 * floor provides one, otherwise a flat schematic — with the portion of the
 * route that runs on that floor drawn on top.
 */
export function FloorMap({
  route,
  floorId,
  from,
  dest,
}: {
  route: Route;
  floorId: string;
  from: QrPoint;
  dest: Destination;
}) {
  const floor = getFloor(floorId);
  if (!floor) return null;
  const [, , vw, vh] = floor.viewBox;
  const hasImage = Boolean(floor.image);

  const leg = route.legs.find((l) => l.floor.id === floorId);
  const d = leg ? leg.points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x} ${y}`).join(" ") : "";

  const originNode = from.floor === floorId ? getNode(from.node) : undefined;
  const destOnFloor = dest.room.floor === floorId ? dest.room : undefined;

  // scale marker/stroke sizes to the coordinate width (schematic vw=300 -> u=1)
  const u = vw / 300;

  return (
    <svg
      viewBox={floor.viewBox.join(" ")}
      className="h-auto w-full"
      role="img"
      aria-label={`${floor.name} plan with route to ${dest.name}`}
    >
      {hasImage ? (
        <image href={floor.image} x="0" y="0" width={vw} height={vh} preserveAspectRatio="none" />
      ) : (
        <>
          <defs>
            <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M8 0H0V8" fill="none" stroke="var(--primary)" strokeOpacity="0.07" strokeWidth="1" />
            </pattern>
          </defs>
          <rect x="0" y="0" width={vw} height={vh} fill="var(--card)" />
          <rect x="0" y="0" width={vw} height={vh} fill="url(#grid)" />
          {floor.rooms.map((r) => (
            <RoomShapeView key={r.id} room={r} />
          ))}
        </>
      )}

      {/* route on this floor */}
      {d && (
        <>
          <path d={d} fill="none" stroke="#fff" strokeOpacity="0.75" strokeWidth={9 * u} strokeLinecap="round" strokeLinejoin="round" />
          <path d={d} fill="none" stroke="var(--primary)" strokeOpacity="0.18" strokeWidth={8 * u} strokeLinecap="round" strokeLinejoin="round" />
          <path
            key={`${from.code}-${dest.id}-${floorId}`}
            d={d}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={3 * u}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4000"
            strokeDashoffset="4000"
            style={{ animation: "route-draw 1.4s ease-out forwards" }}
          />
          {leg!.points.slice(1, -1).map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={2 * u} fill="var(--primary-deep)" />
          ))}
        </>
      )}

      {/* scanned QR location */}
      {originNode && (
        <g>
          <circle cx={originNode.x} cy={originNode.y} r={9 * u} fill="var(--primary)" fillOpacity="0.15" />
          <rect x={originNode.x - 4 * u} y={originNode.y - 4 * u} width={8 * u} height={8 * u} fill="var(--primary-deep)" />
        </g>
      )}

      {/* destination marker */}
      {destOnFloor && <DestinationMarker room={destOnFloor} u={u} />}
    </svg>
  );
}

function RoomShapeView({ room }: { room: Room }) {
  const [cx, cy] = room.label ? [room.label.x, room.label.y] : centroid(room.shape);
  const s = shapeAttrs(room.shape);
  const isVertical = room.category === "stairs" || room.category === "lift";
  return (
    <g>
      {s.tag === "rect" ? (
        <>
          <rect x={s.x} y={s.y} width={s.w} height={s.h} fill={isVertical ? "var(--secondary)" : "var(--muted)"} stroke="var(--border)" strokeWidth="2" />
          <rect x={s.x + s.w - 6} y={s.y} width="6" height="6" fill="var(--card)" />
        </>
      ) : (
        <polygon points={s.points} fill="var(--muted)" stroke="var(--border)" strokeWidth="2" />
      )}
      <text x={cx} y={cy} fontSize="8" fill="var(--muted-foreground)" textAnchor="middle" dominantBaseline="middle" fontFamily="ui-sans-serif, system-ui">
        {room.code ?? room.name}
      </text>
    </g>
  );
}

function DestinationMarker({ room, u }: { room: Room; u: number }) {
  const [x, y] = room.label ? [room.label.x, room.label.y] : centroid(room.shape);
  const s = 11 * u;
  return (
    <g>
      <circle cx={x} cy={y} r={s + 3 * u} fill="#fff" fillOpacity="0.85" />
      <rect x={x - s} y={y - s} width={s * 2} height={s * 2} fill="var(--primary-wash)" />
      <rect x={x - s} y={y - s} width={s * 2} height={s * 2} fill="none" stroke="var(--primary)" strokeWidth={2 * u} />
      <rect x={x - 4 * u} y={y - 4 * u} width={8 * u} height={8 * u} fill="var(--primary)" />
      <rect x={x - s} y={y - s} width={4 * u} height={4 * u} fill="var(--primary-deep)" />
      <rect x={x + s - 4 * u} y={y + s - 4 * u} width={4 * u} height={4 * u} fill="var(--primary-deep)" />
    </g>
  );
}
