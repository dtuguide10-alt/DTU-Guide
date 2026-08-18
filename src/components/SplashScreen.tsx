import { useEffect, useState } from "react";

/**
 * Minimal branded intro: a crisp wordmark over a subtle self-drawing route line.
 * No pixel art, no glow — calm and premium. Shows once per session.
 */
export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 1900);
    const t2 = setTimeout(onDone, 2400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div
      onClick={onDone}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-background transition-opacity duration-500 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Subtle self-drawing route line behind the mark */}
      <svg
        viewBox="0 0 400 400"
        className="pointer-events-none absolute inset-0 size-full opacity-[0.5]"
        aria-hidden
        preserveAspectRatio="xMidYMid slice"
      >
        <path
          d="M40 320 L40 180 L200 180 L200 90 L360 90"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="620"
          strokeDashoffset="620"
          style={{ animation: "route-draw 1.6s var(--ease-soft) 0.15s forwards" }}
        />
        <circle cx="40" cy="320" r="6" fill="var(--primary)" opacity="0.9" />
        <circle
          cx="360"
          cy="90"
          r="7"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2.5"
          style={{ animation: "soft-pulse 1.8s var(--ease-soft) infinite" }}
        />
      </svg>

      <div className="relative flex flex-col items-center px-6 text-center">
        <span className="grid size-14 place-items-center rounded-[16px] bg-primary text-primary-foreground shadow-[var(--elevation-2)]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M12 3l7 16-7-4-7 4 7-16z"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <h1 className="mt-5 text-display">DTU Guide</h1>
        <p className="mt-2 max-w-xs text-[15px] leading-relaxed text-muted-foreground">
          Indoor navigation for Academic Block 4 — scan a QR point to find your way.
        </p>
      </div>
    </div>
  );
}
