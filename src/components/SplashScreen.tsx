import { useEffect, useState } from "react";
import campusNight from "@/assets/campus-night.jpg";

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 2200);
    const t2 = setTimeout(onDone, 2800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div
      onClick={onDone}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-end overflow-hidden bg-night transition-opacity duration-500 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      <img
        src={campusNight}
        alt="Pixel-art illustration of the campus at night"
        width={1536}
        height={1024}
        className="pixelated absolute inset-0 size-full object-cover opacity-90"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-night via-night/40 to-night/60" />

      <div className="relative mb-24 flex flex-col items-center px-6 text-center">
        <div className="mb-5 grid grid-cols-3 gap-[3px]" aria-hidden>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <span
              key={i}
              className="size-[5px] bg-primary-wash"
              style={{
                opacity: [0.9, 0.25, 0.9, 0.25, 1, 0.25, 0.9, 0.25, 0.9][i],
                animation: `pixel-pulse 2.4s ${i * 0.12}s infinite steps(3, end)`,
              }}
            />
          ))}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-primary-wash">
          Campus Wayfinder
        </h1>
        <p className="mt-2 max-w-xs text-sm text-primary-wash/60">
          Scan a QR point anywhere on campus to find your way indoors.
        </p>
      </div>
    </div>
  );
}
