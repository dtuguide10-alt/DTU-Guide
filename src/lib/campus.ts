/**
 * Public navigation API used by the screens.
 *
 * This is a thin facade over the graph engine in `./nav`. Screens work with
 * lightweight `Destination` / `QrPoint` view-models; all real routing (shortest
 * path, distance, turn-by-turn steps, multi-floor transitions) lives in
 * `./nav/engine`.
 */
import type { PixelIconName } from "@/components/PixelIcon";
import { FLOORS } from "./nav/floors";
import { QR_POINTS as RAW_QR } from "./nav/qr";
import { CATEGORY_ICON, type Room } from "./nav/types";
import { getFloor, getRoom, routeBetweenNodes, type Route } from "./nav/engine";

export type { Route } from "./nav/engine";

/** A searchable place the user can navigate to. */
export type Destination = {
  id: string;
  name: string;
  block: string;
  floor: string;
  icon: PixelIconName;
  room: Room;
};

/** A scannable QR marker view-model. */
export type QrPoint = {
  code: string;
  name: string;
  block: string;
  floor: string;
  node: string;
};

function toDestination(room: Room): Destination {
  const floor = getFloor(room.floor)!;
  return {
    id: room.id,
    name: room.name,
    block: floor.building,
    floor: floor.name,
    icon: CATEGORY_ICON[room.category],
    room,
  };
}

export const DESTINATIONS: Destination[] = FLOORS.flatMap((f) =>
  f.rooms.filter((r) => r.searchable !== false).map(toDestination),
);

/** Turn a raw checkpoint record (bundled or from the DB) into the UI view-model. */
export function toQrPoint(q: { code: string; name: string; floor: string; node: string }): QrPoint {
  const floor = getFloor(q.floor);
  return {
    code: q.code,
    name: q.name,
    block: floor ? `${floor.building} · ${floor.name}` : q.floor,
    floor: q.floor,
    node: q.node,
  };
}

/** Bundled checkpoints — used as the offline fallback / initial data. */
export const QR_POINTS: QrPoint[] = RAW_QR.map(toQrPoint);

export function findDestination(id: string | undefined): Destination | undefined {
  if (!id) return undefined;
  const room = getRoom(id);
  return room ? toDestination(room) : undefined;
}

export function findQrPoint(
  code: string | undefined,
  list: QrPoint[] = QR_POINTS,
): QrPoint | undefined {
  return list.find((q) => q.code === code);
}

export function searchDestinations(query: string): Destination[] {
  const q = query.trim().toLowerCase();
  if (!q) return DESTINATIONS;
  return DESTINATIONS.filter((d) =>
    [d.name, d.block, d.floor, d.room.code ?? "", ...(d.room.keywords ?? [])]
      .join(" ")
      .toLowerCase()
      .includes(q),
  );
}

/** A short, curated set shown on Home before the user searches. */
const POPULAR_IDS = [
  "ab4-4-408", // Library
  "ab4-2-207", // IoT Lab
  "ab4-2-206", // Mobile Computing Lab
  "ab4-4-406", // Computing & Automation Lab
  "ab4-1-101", // Meeting Room
  "ab4-4-407", // Record Room
];

export const POPULAR_DESTINATIONS: Destination[] = POPULAR_IDS.map((id) =>
  findDestination(id),
).filter((d): d is Destination => Boolean(d));

/** Full computed route between a scanned QR point and a destination. */
export function computeRoute(from: QrPoint, dest: Destination): Route {
  return routeBetweenNodes(from.node, dest.room.door, from.name, dest.name);
}

export function routeDistance(from: QrPoint, dest: Destination): number {
  return computeRoute(from, dest).distanceM;
}

export function routeMinutes(from: QrPoint, dest: Destination): number {
  return computeRoute(from, dest).minutes;
}

export function routeSteps(from: QrPoint, dest: Destination): string[] {
  return computeRoute(from, dest).steps;
}
