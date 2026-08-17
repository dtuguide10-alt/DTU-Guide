import { FLOORS, VERTICAL_LINKS } from "./floors";
import type { Floor, NavNode, Room } from "./types";

// ── indexes ────────────────────────────────────────────────────────────────
const nodesById = new Map<string, NavNode>();
const floorsById = new Map<string, Floor>();
const roomsById = new Map<string, Room>();

for (const floor of FLOORS) {
  floorsById.set(floor.id, floor);
  for (const n of floor.nodes) nodesById.set(n.id, n);
  for (const r of floor.rooms) roomsById.set(r.id, r);
}

export const FLOOR_ORDER = [...FLOORS].sort((a, b) => a.level - b.level);

export function getFloor(id: string): Floor | undefined {
  return floorsById.get(id);
}
export function getNode(id: string): NavNode | undefined {
  return nodesById.get(id);
}
export function getRoom(id: string): Room | undefined {
  return roomsById.get(id);
}

// ── walkable graph ───────────────────────────────────────────────────────────
type Edge = { to: string; w: number };
const adjacency = new Map<string, Edge[]>();

function link(a: string, b: string, w: number) {
  if (!adjacency.has(a)) adjacency.set(a, []);
  if (!adjacency.has(b)) adjacency.set(b, []);
  adjacency.get(a)!.push({ to: b, w });
  adjacency.get(b)!.push({ to: a, w });
}

function dist(a: NavNode, b: NavNode) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

for (const floor of FLOORS) {
  for (const [a, b] of floor.edges) {
    const na = nodesById.get(a);
    const nb = nodesById.get(b);
    if (na && nb) link(a, b, dist(na, nb));
  }
}

// Equal cost so the router uses whichever vertical element you are standing at
// (reaching the other one always costs extra horizontal walking).
const STAIR_STEP_COST = 85; // graph cost of one floor by stairs
const LIFT_STEP_COST = 85; // one floor by lift

for (const vl of VERTICAL_LINKS) {
  const cost = vl.mode === "stairs" ? STAIR_STEP_COST : LIFT_STEP_COST;
  for (let i = 1; i < vl.nodes.length; i++) {
    link(vl.nodes[i - 1]!, vl.nodes[i]!, cost);
  }
}

// ── Dijkstra ─────────────────────────────────────────────────────────────────
function shortestPath(start: string, goal: string): string[] | null {
  if (start === goal) return [start];
  const dists = new Map<string, number>([[start, 0]]);
  const prev = new Map<string, string>();
  const visited = new Set<string>();
  // Simple priority selection over the frontier; graph size is small.
  const frontier = new Set<string>([start]);

  while (frontier.size) {
    let current = "";
    let best = Infinity;
    for (const id of frontier) {
      const d = dists.get(id) ?? Infinity;
      if (d < best) {
        best = d;
        current = id;
      }
    }
    frontier.delete(current);
    if (current === goal) break;
    visited.add(current);

    for (const edge of adjacency.get(current) ?? []) {
      if (visited.has(edge.to)) continue;
      const nd = best + edge.w;
      if (nd < (dists.get(edge.to) ?? Infinity)) {
        dists.set(edge.to, nd);
        prev.set(edge.to, current);
        frontier.add(edge.to);
      }
    }
  }

  if (!prev.has(goal) && start !== goal) return null;
  const path: string[] = [goal];
  let cur = goal;
  while (cur !== start) {
    const p = prev.get(cur);
    if (!p) return null;
    path.unshift(p);
    cur = p;
  }
  return path;
}

// ── route model ──────────────────────────────────────────────────────────────
export type RouteLeg = {
  floor: Floor;
  points: Array<[number, number]>;
};

export type ManeuverKind =
  | "start"
  | "left"
  | "right"
  | "straight"
  | "stairs-up"
  | "stairs-down"
  | "lift-up"
  | "lift-down"
  | "arrive";

/** A single turn-by-turn instruction with its position on the plan. */
export type Maneuver = {
  kind: ManeuverKind;
  text: string;
  floor: string;
  x: number;
  y: number;
  /** Straight-line-along-corridor distance (metres) from here to the next maneuver. */
  distToNextM: number;
};

export type Route = {
  ok: boolean;
  nodes: NavNode[];
  legs: RouteLeg[];
  distanceM: number;
  minutes: number;
  floorChanges: number;
  steps: string[];
  maneuvers: Maneuver[];
};

const EMPTY: Route = {
  ok: false,
  nodes: [],
  legs: [],
  distanceM: 0,
  minutes: 0,
  floorChanges: 0,
  steps: [],
  maneuvers: [],
};

function isVertical(a: NavNode, b: NavNode) {
  return a.floor !== b.floor;
}

/** Split the node path into one polyline per floor (in travel order). */
function buildLegs(nodes: NavNode[]): RouteLeg[] {
  const legs: RouteLeg[] = [];
  let current: RouteLeg | null = null;
  for (const n of nodes) {
    const floor = floorsById.get(n.floor)!;
    if (!current || current.floor.id !== floor.id) {
      current = { floor, points: [] };
      legs.push(current);
    }
    current.points.push([n.x, n.y]);
  }
  return legs;
}

function turnWord(prev: NavNode, node: NavNode, next: NavNode): "left" | "right" | null {
  const v1x = node.x - prev.x;
  const v1y = node.y - prev.y;
  const v2x = next.x - node.x;
  const v2y = next.y - node.y;
  const cross = v1x * v2y - v1y * v2x;
  const dot = v1x * v2x + v1y * v2y;
  const angle = Math.atan2(Math.abs(cross), dot); // 0..π
  if (angle < 0.6) return null; // < ~34°, treat as straight
  // screen coords have y pointing down, so a positive cross is a right turn
  return cross > 0 ? "right" : "left";
}

function buildManeuvers(nodes: NavNode[], originName: string, destName: string): Maneuver[] {
  type Raw = { kind: ManeuverKind; text: string; nodeIndex: number };
  const raw: Raw[] = [{ kind: "start", text: `Start at ${originName}`, nodeIndex: 0 }];

  for (let i = 1; i < nodes.length; i++) {
    const prev = nodes[i - 1]!;
    const cur = nodes[i]!;

    // vertical transition between floors
    if (isVertical(prev, cur)) {
      const up = floorsById.get(cur.floor)!.level > floorsById.get(prev.floor)!.level;
      const mode = prev.kind === "lift" || cur.kind === "lift" ? "lift" : "stairs";
      raw.push({
        kind: `${mode === "lift" ? "lift" : "stairs"}-${up ? "up" : "down"}` as ManeuverKind,
        text: `Take the ${mode} ${up ? "up" : "down"} to ${floorsById.get(cur.floor)!.name}`,
        nodeIndex: i - 1,
      });
      continue;
    }

    // turn detection needs three consecutive same-floor nodes
    const next = nodes[i + 1];
    if (next && !isVertical(cur, next) && !isVertical(prev, cur)) {
      const turn = turnWord(prev, cur, next);
      if (turn) raw.push({ kind: turn, text: `Turn ${turn}`, nodeIndex: i });
    }
  }

  raw.push({ kind: "arrive", text: `Arrive at ${destName}`, nodeIndex: nodes.length - 1 });

  // merge consecutive vertical maneuvers (a multi-floor climb) into one, keeping
  // the first departure point but pointing at the final floor
  const isVert = (k: ManeuverKind) => k.includes("-up") || k.includes("-down");
  const merged: Raw[] = [];
  for (const r of raw) {
    const prev = merged[merged.length - 1];
    if (prev && isVert(prev.kind) && isVert(r.kind)) {
      prev.text = r.text; // r.text already names the higher/lower target floor
    } else {
      merged.push({ ...r });
    }
  }
  raw.length = 0;
  raw.push(...merged);

  // distance (m) from each maneuver's node to the next maneuver's node, along the path
  const arc: number[] = [0];
  for (let i = 1; i < nodes.length; i++) {
    const a = nodes[i - 1]!;
    const b = nodes[i]!;
    const seg = isVertical(a, b) ? 4 / (floorsById.get(a.floor)?.scale ?? 0.036) : dist(a, b);
    arc.push(arc[i - 1]! + seg);
  }

  const maneuvers: Maneuver[] = raw.map((r, i) => {
    const node = nodes[r.nodeIndex]!;
    const nextIdx = raw[i + 1]?.nodeIndex ?? r.nodeIndex;
    const units = arc[nextIdx]! - arc[r.nodeIndex]!;
    const scale = floorsById.get(node.floor)?.scale ?? 0.036;
    return {
      kind: r.kind,
      text: r.text,
      floor: node.floor,
      x: node.x,
      y: node.y,
      distToNextM: Math.round(units * scale),
    };
  });

  // enrich turn instructions with the landmark they lead toward
  for (let i = 0; i < maneuvers.length; i++) {
    const m = maneuvers[i]!;
    if (m.kind !== "left" && m.kind !== "right") continue;
    const nxt = maneuvers[i + 1];
    if (nxt?.kind === "arrive") m.text = `Turn ${m.kind} toward ${destName}`;
    else if (nxt?.kind.startsWith("stairs")) m.text = `Turn ${m.kind} toward the staircase`;
    else if (nxt?.kind.startsWith("lift")) m.text = `Turn ${m.kind} toward the lift`;
    else m.text = `Turn ${m.kind} and continue down the corridor`;
  }

  // collapse consecutive duplicate texts
  return maneuvers.filter((m, i) => i === 0 || m.text !== maneuvers[i - 1]!.text);
}

/** Compute a full route between two graph nodes. */
export function routeBetweenNodes(
  fromNode: string,
  toNode: string,
  originName: string,
  destName: string,
): Route {
  const path = shortestPath(fromNode, toNode);
  if (!path) return EMPTY;
  const nodes = path.map((id) => nodesById.get(id)!).filter(Boolean);
  if (nodes.length === 0) return EMPTY;

  let distanceUnits = 0;
  let floorChanges = 0;
  for (let i = 1; i < nodes.length; i++) {
    const a = nodes[i - 1]!;
    const b = nodes[i]!;
    if (isVertical(a, b)) floorChanges++;
    else distanceUnits += dist(a, b);
  }

  const floor = floorsById.get(nodes[0]!.floor)!;
  const distanceM = Math.round(distanceUnits * floor.scale);
  const minutes = Math.max(1, Math.round(distanceM / (1.3 * 60) + floorChanges * 0.5));
  const maneuvers = buildManeuvers(nodes, originName, destName);

  return {
    ok: true,
    nodes,
    legs: buildLegs(nodes),
    distanceM,
    minutes,
    floorChanges,
    steps: maneuvers.map((m) => m.text),
    maneuvers,
  };
}
