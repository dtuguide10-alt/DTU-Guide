import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.dtuguide",
  appName: "DTU Guide",
  // Offline fallback shown if the live site can't be reached.
  webDir: "www",
  server: {
    // The native app loads the deployed app so it uses the real backend + DB.
    url: "https://dtu-guide.vercel.app",
    cleartext: false,
  },
  android: {
    // allow the WebView to use the device camera for QR scanning
    allowMixedContent: false,
  },
};

export default config;
