# Project Environment

Initial argent-environment-inspector result (2026-10-20): empty workspace,
project_type=other, is_react_native=false, no native iOS/Android/Expo project,
no prior configs/build tooling. Node 24.18.0, Python 3.14.6.
The parent scaffolded a browser PWA, not a native app.

Current stack: TypeScript, Vite, Three.js (five games), Phaser (five games),
vite-plugin-pwa, project-owned offline-first SDK and optional Nakama adapter.
Windows PowerShell: use npm.cmd / npx.cmd. Commands: npm.cmd run dev,
npm.cmd test, npm.cmd run build, npm.cmd run preview. Docker Compose runs
local Nakama/Postgres. .env.local is ignored; do not print credentials.
Development port 5173; production preview 4173; Nakama API 7350, console 7351.

## User scope and permissions

Original Jeepney Rush + Patintero were expanded by eight additional games
(user explicitly confirmed ten total, five 2D and five 3D). Offline-first,
portrait mobile PWA, tablet responsive, non-multiplayer. Each game has its own
logo and featured image. Gallery and platform logo use Philippine blue, red,
yellow and white. Latest user constraint: **never use flags in images**.
Final posters, court, PWA icon and 3D decorative props have no flags/pennants.
Quality target is 9/10; do not claim independent certification or physical-device QA.

Latest organization request completed: one src/games/<game-id>/ folder per game,
with model.ts, world.ts and game-specific vehicle/art helpers. Matching
public/games/<game-id>/ folders contain cover.webp, logo.svg and optional
background.webp. No combined arcade implementation remains in src. Shared
rendering, audio, lifecycle and SDK remain under src/core and src/sdk.
The original combined expansion code is preserved in artifacts/arcade-before-folderization.

User said to keep working through the full task while queuing chat, unless
explicitly stopped or redirected. The authorized ten-game collection is now
implemented and verified. Future physical-device and longer balance review
remain outside the completed desktop browser checks.

Docker and Modal were authorized. Grok and Modal authenticated earlier.
User explicitly approved built-in image generation after Grok image saves failed.
No Modal GPU job or Gemini/audio generation was used. Initial Grok-generated
jeepney GLB was rejected for visual quality and archived. Current jeepney,
traffic vehicles, tricycle, bangka and 3D characters use authored Three.js
geometry. Three Gemini-generated instrumental MP3 loops are packaged locally.
Web Audio synthesizes effects, engine hum and water wash. Grok audio attempt
failed with HTTP 402 usage balance exhausted; no quality comparison was possible.

## Completed games

3D: Jeepney Rush, Tricycle Parking, Island Boat Racing, Tumbang Preso,
Basketball sa Kanto.
2D: Patintero, Piko Challenge, Halo-Halo Shop, Coconut Catcher, Volcano Escape.

The two originals have directional running/idle animation, improved jeepney
and traffic vehicles, three difficulty modes, progressive pressure, timed
Patintero rounds and safe yielding at pedestrian crossings.
New games have distinct rules and renderers, three modes, local scores,
game-over/restart/pause and progressively harder stages.

Gallery: generated platform logo, ten generated featured illustrations with
unique integrated titles, ten outlined SVG game wordmarks, collections, search/category filters,
favorites, recent games, profile and install help. Three additional generated
gameplay backgrounds: Halo-Halo, Coconut and Volcano.
No dimension badges/filters or SVG cover-title overlays. Hearts sit below artwork.
Asset prompts/source paths: docs/art/collection-prompts.json (initial revision);
docs/art/poster-sources-v2.json (final flag-free posters, court and lava).
Shared directional sprites, court and storefront atlas: public/art/.
3D neighborhood scenes also use the storefront atlas on authored buildings.

## Verification

46 model/SDK tests pass. Basketball restart also explicitly resets aim.
TypeScript and production build pass. PWA precache: 69 entries, about 9.25 MiB.
Real Nakama integration passes all 30 game/difficulty boards and idempotent
best-score retries; temporary integration accounts are removed.

Before the final polish revision, all eight new games reached stage two through actual keyboard inputs with
three lives remaining. The QA harness observed model state; it did not assign
scores or bypass rules. Evidence: docs/collection-playthroughs.json.
An installed two-game PWA upgraded while retaining prior scores, name and mute.
All ten production games loaded and started with networking disabled, one
canvas each and no uncaught errors. New production offline scores Piko 690 and
Basketball 110 survived reload; two queued results drained on reconnect/retry.
Evidence: docs/offline-games-check.json and docs/offline-score-check.json.

Final polish: continuous Patintero canvas running rig; sphere/backboard/rim
basketball physics plus walking/dribbling; shared wave-field buoyancy, inertial
boat steering, foam wake and following camera; corrected coconut front-rim scale
and catch layering; generated lava crust with moving molten surface; contained
crossing SVG; opaque 44px controls; five cycling Jeepney districts.
Three Gemini tracks normalized into 59-second loops, paused/resumed with play.
Music files and new artwork verified available offline. All ten final production
games started offline with one canvas and no runtime errors or control overflow.
Evidence: docs/offline-polish-v2.json. Only the intentional uncached probe failed.
Gallery final layouts: docs/collection-responsive-v2.json.
Final tablet basketball controls: docs/basketball-tablet-v2.json (768x1024,
all visible controls at least 44px, one canvas, no overflow).
Visual fixture screenshots are explicitly named as fixtures; their assigned
states are not score/playthrough evidence. No SDK/backend changes this pass.

Gallery checked at 320x568, 390x844, 768x1024 and 1440x1000. New games checked
live at both phone sizes; original games already checked phone/tablet/desktop.
Halo-Halo and Basketball additionally checked at 768x1024. Small phone touch
controls are at least 44px high, with layout adjustments to keep the recipe
and play areas visible. No physical iOS/Android, battery or low-end GPU claim.

## Graph and tooling

Graph project: C-Users-Developer-Desktop-PinoyGames, Tier 2.
Full refresh 2026-10-20T10:39:48Z: 906 nodes / 3242 edges after final
rendering edits. All source/test/script/doc paths were coverage-checked.
Windows reports metadata_changed immediately after indexing, so implementation
claims also rely on direct source reads and runtime/build evidence.
Known CSS parser gaps: src/style.css lines 14,24,25 and src/player.css
lines 2,49,70,71; read directly. Images are intentionally not indexed.
Registry createWorld graph trace confirms main.loadGame calls the ten per-game
world classes through the shared registry. Recheck generation in future sessions.

Argent is available; Chromium target chromium-cdp-9222 was used. Required skills
were read earlier. Fresh describe before every tap; never derive tap coordinates
from screenshots. Argent cannot hold keys or emulate offline/viewport/full-page
captures, so persistent node_repl Playwright was used for these bounded checks.
Argent tool output can contain images/base64: emit image blocks, never dump them
as JSON. ToolSearch failed earlier; metadata was discovered via functions.exec
ALL_TOOLS instead. Do not update Argent just because its update notice appears.

README.md covers run/setup and per-game folders. docs/ASSETS.md records provenance.
docs/QUALITY.md records verified scope and limits. Screenshots live under
docs/screenshots/. Artifacts/backups are excluded from public PWA assets.



## 9/10 revision (2026-10-20)

User asked for a 9/10 rating pass and to use modal.com with an open-source
image-to-3D model. Done: TRELLIS.2-4B on Modal A100-80GB (scripts/trellis2_modal.py;
gated DINOv3/RMBG replaced by timm DINOv3 weights + ZhengPeng7/BiRefNet; Modal's
add_python needs apt clang). Reference sheets from gpt-image-bridge (codex CLI).
21 models in public/models (6.1 MB) via scripts/optimize-props.mjs; per-asset yaw
there (bangka 19, botika -90). Runtime: src/core/rendering/props.ts (PropLibrary,
canvas sign overlays), barangay.ts (shared street layout), bursts.ts (particles).
Jeepney falls back to authored blocks unless every roadside model loads.
48 tests; precache 89 unique files / 15.2 MiB; offline check docs/offline-v3-check.json
(service worker uses prompt mode: test offline after a reload). Still unverified:
physical phone FPS/battery, iOS Safari.

Painted title logos (public/games/<id>/logo.webp, cover-referenced gpt-image-2,
white flood-fill cutout) replaced the SVG wordmarks (archived in artifacts/logos-svg-v1).
Deployed to Railway project `pinoyplay` (workspace Sumnora) at
https://pinoyplay-production.up.railway.app via `railway up --ci`; .railwayignore
whitelists build inputs (a locked local file broke indexing of the whole folder).
Live offline check: docs/offline-live-check.json (all ten games, no errors).
