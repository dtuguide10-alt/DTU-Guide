import type { Floor, NavNode, Room, RoomCategory } from "./types";

/**
 * Builds a Floor whose map background is the real traced floor-plan image.
 * The navigation graph is authored in the image's own pixel coordinates so the
 * route line and markers line up with the drawing. Rooms are not drawn as
 * rectangles (the image already shows them) — each room only contributes a
 * doorway node on the corridor and a marker position.
 */
export type ImgRoom = {
  key: string;
  num?: string;
  name: string;
  cat: RoomCategory;
  side: "left" | "right";
  /** Vertical centre of the room's doorway, in image pixels. */
  yc: number;
  vertical?: "stairs" | "lift";
  vshaft?: string;
  noSearch?: boolean;
  keywords?: string[];
};

export type ImgFloorSpec = {
  id: string;
  name: string;
  level: number;
  building: string;
  image: string;
  imgW: number;
  imgH: number;
  /** Corridor centre-line x for the straight run (image pixels). */
  corridorX: number;
  leftDoorX: number;
  rightDoorX: number;
  leftMarkerX: number;
  rightMarkerX: number;
  /** y where the corridor begins at the top. */
  topY: number;
  /** Extra corridor polyline points after the last room (the bend to the store). */
  tail: Array<[number, number]>;
  rooms: ImgRoom[];
  store: { key: string; num?: string; name: string; cat: RoomCategory; mx: number; my: number; keywords?: string[] };
};

export type BuiltFloor = {
  floor: Floor;
  shafts: Record<string, string>;
};

function makeRoom(
  id: string,
  name: string,
  category: RoomCategory,
  floor: string,
  door: string,
  marker: { x: number; y: number },
  opts: { code?: string | undefined; searchable?: boolean | undefined; keywords?: string[] | undefined },
): Room {
  const room: Room = {
    id,
    name,
    category,
    floor,
    shape: { type: "rect", x: marker.x - 12, y: marker.y - 12, w: 24, h: 24 },
    door,
    label: { x: marker.x, y: marker.y },
  };
  if (opts.code !== undefined) room.code = opts.code;
  if (opts.keywords !== undefined) room.keywords = opts.keywords;
  if (opts.searchable === false) room.searchable = false;
  return room;
}

export function buildImageFloor(spec: ImgFloorSpec): BuiltFloor {
  const fid = spec.id;
  const nodes: NavNode[] = [];
  const edges: Array<[string, string]> = [];
  const rooms: Room[] = [];
  const shafts: Record<string, string> = {};

  // one corridor node per distinct room y, plus a top node
  const corridorByY = new Map<number, string>();
  function corridorNode(y: number): string {
    const key = Math.round(y / 6) * 6;
    const found = corridorByY.get(key);
    if (found) return found;
    const id = `${fid}-c${key}`;
    corridorByY.set(key, id);
    nodes.push({ id, floor: fid, x: spec.corridorX, y: key, kind: "corridor" });
    return id;
  }

  const topId = `${fid}-ctop`;
  nodes.push({ id: topId, floor: fid, x: spec.corridorX, y: spec.topY, kind: "corridor" });

  for (const r of spec.rooms) {
    const doorX = r.side === "left" ? spec.leftDoorX : spec.rightDoorX;
    const markerX = r.side === "left" ? spec.leftMarkerX : spec.rightMarkerX;
    const doorId = `${fid}-d-${r.key}`;
    const kind: NavNode["kind"] =
      r.vertical === "stairs" ? "stair" : r.vertical === "lift" ? "lift" : "door";
    nodes.push({ id: doorId, floor: fid, x: doorX, y: r.yc, kind });
    edges.push([doorId, corridorNode(r.yc)]);
    if (r.vertical && r.vshaft) shafts[r.vshaft] = doorId;

    rooms.push(
      makeRoom(`${fid}-${r.key}`, r.name, r.cat, fid, doorId, { x: markerX, y: r.yc }, {
        code: r.num,
        keywords: r.keywords,
        searchable: r.noSearch ? false : true,
      }),
    );
  }

  // chain the corridor: top -> sorted room stations -> tail -> store
  const stations = [...corridorByY.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]);
  edges.push([topId, stations[0]!]);
  for (let i = 1; i < stations.length; i++) edges.push([stations[i - 1]!, stations[i]!]);

  let prev = stations[stations.length - 1]!;
  spec.tail.forEach(([x, y], i) => {
    const id = `${fid}-t${i}`;
    nodes.push({ id, floor: fid, x, y, kind: "corridor" });
    edges.push([prev, id]);
    prev = id;
  });

  const storeDoorId = `${fid}-d-${spec.store.key}`;
  nodes.push({ id: storeDoorId, floor: fid, x: spec.store.mx, y: spec.store.my, kind: "door" });
  edges.push([prev, storeDoorId]);
  rooms.push(
    makeRoom(
      `${fid}-${spec.store.key}`,
      spec.store.name,
      spec.store.cat,
      fid,
      storeDoorId,
      { x: spec.store.mx, y: spec.store.my },
      { code: spec.store.num, keywords: spec.store.keywords },
    ),
  );

  const floor: Floor = {
    id: fid,
    name: spec.name,
    level: spec.level,
    building: spec.building,
    viewBox: [0, 0, spec.imgW, spec.imgH],
    image: spec.image,
    // Calibrated from the plan's own dimension labels (e.g. Meeting Room 101 =
    // 16.8 m over ~445 px, Room 111 = 16.2 m over ~450 px) → ~0.036 m per pixel.
    scale: 0.036,
    rooms,
    nodes,
    edges,
  };

  return { floor, shafts };
}
