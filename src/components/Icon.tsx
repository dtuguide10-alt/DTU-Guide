import {
  Building2,
  Crosshair,
  DoorClosed,
  FlaskConical,
  Library,
  MapPin,
  Navigation,
  QrCode,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Clean line-icon set (Apple-minimal). Keeps the app's semantic names so it is a
 * drop-in replacement for the old PixelIcon. Icons inherit `currentColor` and use
 * a light 1.75 stroke for a refined, restrained feel.
 *
 * `stairs` and `elevator` are drawn locally because lucide ships no matching glyph.
 */
export type IconName =
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

const LUCIDE: Partial<Record<IconName, LucideIcon>> = {
  current: Crosshair,
  destination: MapPin,
  building: Building2,
  library: Library,
  lab: FlaskConical,
  qr: QrCode,
  navigate: Navigation,
  door: DoorClosed,
};

export function Icon({
  name,
  size = 16,
  className,
  strokeWidth = 1.75,
}: {
  name: IconName;
  size?: number;
  className?: string;
  strokeWidth?: number;
}) {
  const cls = cn("inline-block shrink-0", className);

  if (name === "stairs") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        className={cls}
      >
        <path d="M4 20h4v-4h4v-4h4V8h4" />
      </svg>
    );
  }

  if (name === "elevator") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        className={cls}
      >
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M12 3v18" />
        <path d="M8 9l-1.5 2h3L8 9z" />
        <path d="M16 15l1.5-2h-3L16 15z" />
      </svg>
    );
  }

  const L = LUCIDE[name] ?? MapPin;
  return (
    <L size={size} strokeWidth={strokeWidth} aria-hidden="true" className={cls} />
  );
}
