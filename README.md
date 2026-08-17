# DTU Guide

Indoor navigation for **Delhi Technological University — Academic Block 4 (AB-4)**.

Pick a destination, scan the nearest QR checkpoint, and follow a turn-by-turn
route across the building's four floors. No login, no GPS — position is set by
scanning a fixed QR code.

## Stack

- **TanStack Start** (React 19 + Nitro server) · **Tailwind v4**
- **bun** package manager
- Graph-based indoor routing engine (Dijkstra) traced onto the real AB-4 floor plans
- Live camera QR scanning (`@zxing/browser`) + printable QR generator (`qrcode`)

## Develop

```bash
bun install
bun run dev        # http://localhost:8080
```

## Key routes

| Route        | What it is                                             |
| ------------ | ------------------------------------------------------ |
| `/`          | Home — search / pick a destination                     |
| `/scan`      | Camera QR scanner (sets your position)                 |
| `/navigate`  | Full-screen turn-by-turn map                           |
| `/qr-editor` | Place QR checkpoints on the plans (dev tool)           |
| `/qr-codes`  | Printable sheet of all checkpoint QR codes             |

## Project layout

- `src/lib/nav/` — navigation engine: floor data, graph builder, Dijkstra, maneuvers
- `src/components/RouteCanvas.tsx` — the animated map
- `src/routes/` — screens
- `src/assets/floors/` — traced floor-plan images

> Camera scanning requires a secure context (`https://` or `localhost`).
