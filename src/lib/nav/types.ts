import type { IconName } from "@/components/Icon";

/** A node in the walkable navigation graph (corridor point, doorway, stair or lift landing). */
export type NavNode = {
  id: string;
  floor: string;
  x: number;
  y: number;
  kind?: "corridor" | "door" | "stair" | "lift" | "entrance";
};

/** Shape used to draw a room on the floor plan. */
export type RoomShape =
  | { type: "rect"; x: number; y: number; w: number; h: number }
  | { type: "poly"; points: Array<[number, number]> };

export type RoomCategory =
  | "classroom"
  | "lab"
  | "office"
  | "washroom"
  | "stairs"
  | "lift"
  | "library"
  | "hall"
  | "entrance"
  | "facility"
  | "other";

/** A labelled space on a floor. Searchable rooms become navigation destinations. */
export type Room = {
  id: string;
  name: string;
  code?: string;
  category: RoomCategory;
  floor: string;
  shape: RoomShape;
  /** Optional explicit label anchor; defaults to the shape centroid. */
  label?: { x: number; y: number };
  /** Graph node the route terminates at (the room's doorway). */
  door: string;
  /** Hidden from search/destinations when false (e.g. plain corridors). */
  searchable?: boolean;
  keywords?: string[];
};

/** One physical floor of a building. */
export type Floor = {
  id: string;
  name: string;
  /** 0 = ground, 1 = first, … Used to order the floor switcher. */
  level: number;
  building: string;
  /** [minX, minY, width, height] */
  viewBox: [number, number, number, number];
  /** Optional traced floor-plan image drawn as the map background (URL). */
  image?: string;
  /** Approximate real-world metres per plan unit, for distance/time estimates. */
  scale: number;
  rooms: Room[];
  /** Extra wall / structure polygons drawn under the rooms (optional). */
  walls?: RoomShape[];
  nodes: NavNode[];
  /** Undirected walkable connections between nodes on this floor. */
  edges: Array<[string, string]>;
};

/**
 * Connects the same stairwell or lift shaft across floors.
 * Consecutive node ids (ordered by level) become traversable with a fixed cost.
 */
export type VerticalLink = {
  mode: "stairs" | "lift";
  /** Stair/lift landing node ids, ordered from lowest floor to highest. */
  nodes: string[];
};

/** A physical QR marker installed in the building, pinned to a graph node. */
export type QrPoint = {
  code: string;
  name: string;
  floor: string;
  node: string;
};

export const CATEGORY_ICON: Record<RoomCategory, IconName> = {
  classroom: "door",
  lab: "lab",
  office: "building",
  washroom: "door",
  stairs: "stairs",
  lift: "elevator",
  library: "library",
  hall: "door",
  entrance: "navigate",
  facility: "building",
  other: "destination",
};
