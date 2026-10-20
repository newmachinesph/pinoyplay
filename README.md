# PinoyPlay

Ten Filipino single-player games in one offline-first portrait PWA: five Phaser
2D games and five Three.js 3D games. The collection has illustrated covers,
individual logos, search, categories, favorites and recently played games.
Platform colors are Philippine flag blue, red, yellow and white.

| Game | Engine | Play |
| --- | --- | --- |
| Jeepney Rush | Three.js | Traffic, fares and yielding at pedestrian crossings |
| Tricycle Parking | Three.js | Steer, reverse and stop inside a parking bay |
| Island Boat Racing | Three.js | Guide an outrigger bangka through buoy gates |
| Tumbang Preso | Three.js | Knock down the can, retrieve the slipper, return home |
| Basketball sa Kanto | Three.js | Aim and time physical basketball shots |
| Patintero | Phaser | Cross line guards and return home before time runs out |
| Piko Challenge | Phaser | Follow the chalk sequence out and back |
| Halo-Halo Shop | Phaser | Layer ingredients in the customer's requested order |
| Coconut Catcher | Phaser | Catch buko and dodge falling branches |
| Volcano Escape | Phaser | Climb rock platforms above rising lava |

Every game offers Easy, Normal and Hard, with increasing pressure during play.
Scores are separate for each game and difficulty. There is no multiplayer.

## Run

Use Node 22.12+ or Node 24. In Windows PowerShell, use `npm.cmd`.

```powershell
npm.cmd ci
npm.cmd run dev
```

Development: http://localhost:5173. For the installable offline build:

```powershell
npm.cmd run build
npm.cmd run preview
```

Open http://localhost:4173 and wait for the offline-ready message. Install through
the browser's Install app / Add to Home Screen action. Development does not
register the production service worker.

Publish `dist/` to an HTTPS static host. Relative asset paths support subdirectory
hosting. A phone accessing a LAN address needs HTTPS for service workers and
installation; desktop localhost is allowed. All engines, fonts, covers, logos
and game art are cached after the first complete download. Updates use an
explicit button so they do not interrupt a run.

## Controls

Every welcome screen has a How to play panel. Touch buttons work alongside
arrow keys/WASD. Enter starts/restarts and P/Escape pauses/resumes.
Jeepney uses Space/Down to brake. Tumbang and Basketball use held Space to charge
and release to throw/shoot. Volcano uses Space to jump. Piko uses 1–8; Halo-Halo
uses 1–6 for ingredients, Backspace to undo and Enter to serve.
Boat and Coconut also support dragging the scene.

Opening a dialog or leaving the browser window pauses a run. Sound is optional
and its preference is saved. Original music and effects are synthesized locally
with Web Audio; no runtime AI or streaming audio is required.

## One folder per game

```text
src/
  games/
    jeepney-rush/           model.ts, world.ts, jeepney.ts, traffic.ts, crossing.ts
    patintero/              model.ts, world.ts, character.ts, motion.ts
    tricycle-parking/       model.ts, world.ts, vehicle.ts
    island-boat-racing/     model.ts, world.ts, vehicle.ts
    tumbang-preso/          model.ts, world.ts
    basketball-sa-kanto/    model.ts, world.ts
    piko-challenge/         model.ts, world.ts
    halo-halo-shop/         model.ts, world.ts, art.ts
    coconut-catcher/        model.ts, world.ts, art.ts
    volcano-escape/         model.ts, world.ts, art.ts
    registry.ts            Lazy-loads each game's scene
  core/
    game-model.ts          Shared lifecycle, input and score events
    rendering/             Shared scene utilities, generated-prop library, street layout, particles
    audio.ts               Music, effects and engine sound
  sdk/                     Profile, local scores, queue and Nakama adapter
  catalog.ts               Game metadata and asset paths
  gallery.ts, gallery.css  Collection browsing
  main.ts, player.css      Shared portrait player and dialogs
public/
  games/<game-id>/         cover.webp, logo.svg, optional background.webp
  models/                  21 generated 3D props (TRELLIS.2, optimized GLB)
  art/                     Shared court, character atlases and storefront textures
  brand/                   Platform wordmark and icon
```

Each game's rules and scene live in its own directory. There is no combined
`arcade` implementation. The SDK and reusable rendering helpers remain shared.
Original generated files and previous builds are preserved outside the published
assets.

## Deploy (Railway)

Live: https://pinoyplay-production.up.railway.app (Railway project `pinoyplay`,
workspace Sumnora). Railpack detects Vite, runs `npm run build` and serves `dist/`
with Caddy. `.railwayignore` uploads only `src`, `public`, `index.html`, the
package files, `tsconfig.json` and `vite.config.ts`.

```powershell
railway up --ci
```

`VITE_NAKAMA_*` is not set on Railway, so the public site keeps scores on each
device; set those variables in Railway and redeploy once a public HTTPS Nakama
server exists.

## Generated 3D props

Buildings, trees, islands, street props and the bangka in the 3D games are
TRELLIS.2 image-to-3D models generated on Modal. To regenerate (needs a Modal
account; about one GPU-minute per model):

```powershell
python -m modal run scripts/trellis2_modal.py --src <reference PNGs> --out artifacts/props-raw --texture 2048 --decimation 10000
node scripts/optimize-props.mjs artifacts/props-raw public/models
```

Prompts, source sheets and per-model budgets are recorded in
[asset provenance](docs/ASSETS.md).

## Optional online scores

[Nakama](https://github.com/heroiclabs/nakama) is the open-source server. The
project-owned SDK saves results locally before attempting an upload.

```powershell
docker compose up -d
Copy-Item .env.example .env.local
npm.cmd run dev
```

If `.env.local` exists, edit it instead of overwriting it. Restart Vite after
changing environment values and rebuild production. Omit `VITE_NAKAMA_*` for
local-only play.

Local API: http://127.0.0.1:7350. Development console:
http://127.0.0.1:7351 (`admin` / `pinoyplay-local`). Compose uses development
credentials and loopback-only ports. A deployed client needs a reachable HTTPS
Nakama URL.

The 30 leaderboards cover ten games × three difficulties. The pending queue
retains one highest unsent score per game/mode; server-side best-score semantics
make retries idempotent. Failed requests retry after reconnection and on a
30-second timer. Scores, profile, mode and sound preferences survive reloads.
Each device has an anonymous identity; usernames are display names, not unique
account handles. Clearing browser storage resets that identity.

Rankings are casual client-reported scores. Server validation, account linking
and multiplayer are future extensions.

## Validation

```powershell
npm.cmd test
npm.cmd run build
npx.cmd tsx scripts/check-online.ts
```

The integration command requires the local backend and removes its own test
account. Current verification: 48 tests, a successful production build, all 30
online boards, all ten games starting offline, and real offline score/reload/sync
checks. See [quality evidence](docs/QUALITY.md) and
[asset provenance](docs/ASSETS.md). The requested 9/10 quality is a human review
target; physical iOS/Android testing remains outstanding.

