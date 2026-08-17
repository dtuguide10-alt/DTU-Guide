import { cn } from "@/lib/utils";

/** Very low contrast 2x2 pixel cluster used sparingly as an identity mark. */
export function PixelCluster({ className }: { className?: string }) {
  return (
    <span className={cn("inline-grid grid-cols-2 gap-[2px] opacity-40", className)} aria-hidden>
      <span className="size-[3px] bg-primary" />
      <span className="size-[3px] bg-primary/40" />
      <span className="size-[3px] bg-primary/40" />
      <span className="size-[3px] bg-primary" />
    </span>
  );
}

/** Four crisp stepped corner brackets. Children render inside. */
export function PixelFrame({
  className,
  children,
  tone = "primary",
}: {
  className?: string;
  children?: React.ReactNode;
  tone?: "primary" | "muted";
}) {
  const color = tone === "primary" ? "bg-primary" : "bg-border";
  const corner = (pos: string, h: string, v: string) => (
    <span className={cn("pointer-events-none absolute", pos)} aria-hidden>
      <span className={cn("absolute block h-[3px] w-6", color, h)} />
      <span className={cn("absolute block h-6 w-[3px]", color, v)} />
      <span className={cn("absolute size-[6px]", color, "opacity-60", h)} />
    </span>
  );
  return (
    <div className={cn("relative", className)}>
      {corner("left-0 top-0", "left-0 top-0", "left-0 top-0")}
      {corner("right-0 top-0", "right-0 top-0", "right-0 top-0")}
      {corner("bottom-0 left-0", "bottom-0 left-0", "bottom-0 left-0")}
      {corner("bottom-0 right-0", "bottom-0 right-0", "bottom-0 right-0")}
      {children}
    </div>
  );
}
