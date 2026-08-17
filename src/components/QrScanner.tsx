import { useEffect, useRef, useState } from "react";

type ScannerState = "starting" | "scanning" | "error";

/**
 * Live camera QR scanner. Opens the rear camera, decodes QR codes and calls
 * `onDecode` with the raw text. SSR-safe: the decoder is imported only in the
 * browser. Requires a secure context (https:// or localhost) for camera access.
 */
export function QrScanner({
  onDecode,
  active,
  className,
}: {
  onDecode: (text: string) => void;
  active: boolean;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onDecodeRef = useRef(onDecode);
  onDecodeRef.current = onDecode;
  const [state, setState] = useState<ScannerState>("starting");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let controls: { stop: () => void } | null = null;

    (async () => {
      try {
        setState("starting");
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        const reader = new BrowserQRCodeReader();
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          videoRef.current!,
          (result) => {
            if (result) onDecodeRef.current(result.getText());
          },
        );
        if (cancelled) controls.stop();
        else setState("scanning");
      } catch (e) {
        const name = (e as { name?: string })?.name;
        setMessage(
          name === "NotAllowedError"
            ? "Camera permission denied. Allow camera access, or enter the code below."
            : name === "NotFoundError"
              ? "No camera found on this device. Enter the code below."
              : "Camera needs a secure (https) connection. Enter the code below.",
        );
        setState("error");
      }
    })();

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [active]);

  if (state === "error") {
    return (
      <div className={`flex h-full w-full flex-col items-center justify-center gap-1 px-6 text-center ${className ?? ""}`}>
        <p className="text-xs text-muted-foreground">{message}</p>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      className={`h-full w-full object-cover ${className ?? ""}`}
      playsInline
      muted
      autoPlay
    />
  );
}
