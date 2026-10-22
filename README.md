# LarongPinoy

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

Use Node 22.12+ or Node 24. In Windows PowerShell, use `npm.cmd`. The app is
Next.js 16; the games and UI are DOM-driven TypeScript mounted from `app/page.tsx`.

```powershell
npm.cmd ci
docker compose up -d                 # MySQL score database (optional)
Copy-Item .env.example .env.local    # then add OPENAI_API_KEY
npm.cmd run dev
```

Development: http://localhost:3000. For the installable offline build:

```powershell
npm.cmd run build
npm.cmd start
```

Open http://localhost:3000 and wait for "All 10 games ready offline". Install
through the browser's Install app / Add to Home Screen action. Development does
not register the service worker (Serwist, `app/sw.ts`); the production worker
precaches every file in `public/`, the page and the code chunks. Updates use an
explicit button so they do not interrupt a run. A phone on a LAN address needs
HTTPS for installation; desktop localhost is allowed.

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
app/                       Next.js: layout, page, API routes, service worker
db/schema.sql              MySQL tables
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
  sdk/                     Profile, local scores, upload queue and REST adapter
  server/                  API logic, MySQL access and AI username review
  catalog.ts               Game metadata and asset paths
  gallery.ts, gallery.css  Collection browsing
  main.ts, player.css      Shared portrait player and dialogs
public/
  games/<game-id>/         cover.webp, logo.webp, optional background.webp
  models/                  21 generated 3D props (TRELLIS.2, optimized GLB)
  art/                     Shared court, character atlases and storefront textures
  brand/                   LarongPinoy wordmark and icon
```

Each game's rules and scene live in its own directory. There is no combined
`arcade` implementation. The SDK and reusable rendering helpers remain shared.
Original generated files and previous builds are preserved outside the published
assets.

## Deploy (Hostinger)

Production runs as a Node.js website on Hostinger (larongpinoy.ph, Next.js 16,
Node 24) with a Hostinger MySQL database. DNS is on Cloudflare: an A record for
`larongpinoy.ph` to the Hostinger server and a `www` CNAME, both DNS-only.

1. Zip `app/ src/ public/ db/ package.json package-lock.json tsconfig.json next.config.ts`
   (never `.env.local`).
2. Upload it to the website and build with Node 24, app type Next.js, `npm run build`,
   output `.next`.
3. Environment variables (Hostinger Node.js settings, server-only):
   `DATABASE_URL=mysql://USER:PASS@127.0.0.1:3306/DB`, `OPENAI_API_KEY`,
   `OPENAI_NAME_MODEL`.

The app creates its tables on first use from `db/schema.sql`, and its SQL runs on
both MySQL 8+/9 and MariaDB. `.railwayignore` remains for a Railway deploy.

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

## Online scores

Scores always save on the device first. With MySQL running, `app/api` keeps
each player's best per game and difficulty and serves the top 10:

| Route | Purpose |
| --- | --- |
| `POST /api/players` | Register a device (`id` + random 64-hex `secret`, stored only as a SHA-256 hash) and review its name |
| `POST /api/scores` | Record a result; the server keeps the best (`GREATEST`), so retries are harmless |
| `GET /api/leaderboard?game=&difficulty=` | Top 10; unapproved names show as `Kalaro #1234` |

`.env.local` (gitignored, server-only):

| Variable | Use |
| --- | --- |
| `DATABASE_URL` | `mysql://pinoyplay:localdev@127.0.0.1:3306/pinoyplay` for `docker compose` |
| `OPENAI_API_KEY` | Reviews usernames. Without it names stay pending (fail closed) |
| `OPENAI_NAME_MODEL` | Optional, default `gpt-6-luna` |

**Usernames.** A name becomes public only once it passes two checks:

1. **Word list (free, instant).** `src/server/banned-words.json` holds 2,657
   terms: the LDNOOBW lists for 27 languages plus `src/server/banned-extra.txt`
   (Tagalog, Bisaya and Ilocano terms the 14-word Filipino list misses). A name
   is rejected when the whole folded name or one of its words is on the list;
   a term inside a longer word ("Therapist", "Scunthorpe") is left to step 2.
   Rebuild with `node scripts/update-banned-words.mjs`.
2. **OpenAI review** for every other new name: profanity, lewd or sexual terms,
   slurs and harassment in any language, leetspeak and spacing tricks. Each
   folded name (case, accents, leetspeak and separators removed) is reviewed
   once and cached in `name_reviews`. Measured cost: about 345 input and 50
   output tokens per name, roughly $6 per 100,000 new names with `gpt-6-luna`.
   `npx.cmd tsx --env-file=.env.local scripts/check-names.ts [names]` runs names
   through the live review.

Word list: [List of Dirty, Naughty, Obscene, and Otherwise Bad Words](https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words)
by Shutterstock, Inc., [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/),
commit `5faf2ba`, merged with project additions; no endorsement implied. To overrule a verdict:
`UPDATE name_reviews SET allowed = 1 WHERE normalized = 'example';` then the
player saves the name again. Names are display names, not unique handles.

`compose.yaml` runs MySQL 9.7 with development credentials on 127.0.0.1:3306;
`db/schema.sql` creates the tables on first start. Requests are rate-limited per
IP, and name reviews to 5 per device per hour. Scores are still client-reported
(one ceiling of 10,000,000); there is no anti-cheat.

## Validation

```powershell
npm.cmd test
npm.cmd run build
npx.cmd tsx --env-file=.env.local scripts/check-api.ts
```

The API check needs MySQL and a running server (`npm.cmd start`) and removes
its own rows. Current verification: 53 tests, a successful production build,
the API check, all ten games starting offline on the Next.js build, and a real
game-over score reaching the online board. See [quality evidence](docs/QUALITY.md) and
[asset provenance](docs/ASSETS.md). The requested 9/10 quality is a human review
target; physical iOS/Android testing remains outstanding.

