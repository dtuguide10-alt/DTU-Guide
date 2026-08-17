import { cn } from "@/lib/utils";

/**
 * Small monochrome pixel-grid icons drawn on a 12x12 unit grid.
 * They inherit `currentColor` so they stay muted-blue / neutral by default.
 */
export type PixelIconName =
  | "current"
  | "destination"
  | "building"
  | "library"
  | "lab"
  | "stairs"
  | "elevator"
  | "qr"
  | "navigate"
  | "door";

const PATHS: Record<PixelIconName, Array<[number, number, number, number]>> = {
  // [x, y, w, h] on a 12x12 grid
  current: [
    [4, 4, 4, 4],
    [1, 1, 2, 1],
    [1, 1, 1, 2],
    [9, 1, 2, 1],
    [10, 1, 1, 2],
    [1, 10, 2, 1],
    [1, 9, 1, 2],
    [9, 10, 2, 1],
    [10, 9, 1, 2],
  ],
  destination: [
    [3, 1, 6, 1],
    [2, 2, 8, 5],
    [3, 7, 6, 1],
    [5, 8, 2, 3],
    [5, 3, 2, 3],
  ],
  building: [
    [2, 2, 8, 9],
    [3, 3, 2, 2],
    [7, 3, 2, 2],
    [3, 6, 2, 2],
    [7, 6, 2, 2],
    [5, 8, 2, 3],
  ],
  library: [
    [2, 2, 3, 8],
    [6, 2, 2, 8],
    [8, 3, 2, 7],
    [2, 10, 8, 1],
  ],
  lab: [
    [5, 1, 2, 3],
    [4, 4, 4, 2],
    [3, 6, 6, 5],
    [4, 8, 2, 1],
    [7, 9, 1, 1],
  ],
  stairs: [
    [2, 8, 3, 3],
    [5, 6, 3, 5],
    [8, 4, 3, 7],
  ],
  elevator: [
    [2, 1, 8, 10],
    [3, 2, 3, 8],
    [7, 2, 2, 3],
    [7, 7, 2, 3],
  ],
  qr: [
    [1, 1, 4, 4],
    [7, 1, 4, 4],
    [1, 7, 4, 4],
    [7, 7, 1, 1],
    [9, 7, 2, 2],
    [7, 9, 2, 2],
    [10, 10, 1, 1],
  ],
  navigate: [
    [6, 1, 1, 1],
    [5, 2, 3, 1],
    [4, 3, 5, 1],
    [3, 4, 7, 1],
    [5, 5, 3, 5],
  ],
  door: [
    [3, 1, 6, 10],
    [4, 2, 4, 8],
    [7, 6, 1, 1],
  ],
};

const HOLLOW: Partial<Record<PixelIconName, Array<[number, number, number, number]>>> = {
  building: [],
  elevator: [],
};

export function PixelIcon({
  name,
  size = 14,
  className,
}: {
  name: PixelIconName;
  size?: number;
  className?: string;
}) {
  const rects = PATHS[name];
  const holes = HOLLOW[name] ?? [];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      className={cn("inline-block shrink-0", className)}
    >
      {rects.map(([x, y, w, h], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill="currentColor" />
      ))}
      {holes.map(([x, y, w, h], i) => (
        <rect key={`h${i}`} x={x} y={y} width={w} height={h} fill="var(--card)" />
      ))}
    </svg>
  );
}
