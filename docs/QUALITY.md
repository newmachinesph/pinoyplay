# PinoyPlay quality evidence

Verified on 20 October 2026 in desktop Chromium with phone/tablet viewport
emulation. Current scope: ten single-player games, five 2D and five 3D, in one
offline-first portrait PWA. The requested 9/10 is a human review target, not an
independently measured rating.

## 9/10 revision (20 October 2026)

What changed, and how it was checked:

- **Generated 3D scenery.** 21 TRELLIS.2 models (see [assets](ASSETS.md)) replace
  box buildings, procedural palms and sphere islands in the five 3D games: a shared
  barangay street (Tumbang Preso, Basketball, Tricycle Parking), five district
  mixes along the Jeepney route, and karst islands, sea stacks, a stilt hut, a
  karst skyline and the player's bangka at sea. Crisp canvas signs cover the
  generator's pseudo-lettering. Models total 6.1 MB, 4k-9k triangles each.
- **Surfaces and sky.** Seeded canvas textures for asphalt (scrolls with the
  jeepney), packed dirt, concrete and court paint; gradient skies.
- **Feedback.** Pooled particle bursts: confetti on a fallen can, a basket and a
  clean park; dust on slipper landings, floor bounces and jeepney hits; splashes
  at sea gates; fare sparkles; a short camera shake on jeepney collisions. Effects
  run on wall-clock time so they settle on the game-over screen.
- **Players.** Tumbang players are 30% larger; neighbourhood kids watch from the
  sidelines in Tumbang and Basketball and cheer on a hit or a basket.
- **2D.** Piko's court is chalk drawn on the alley instead of a flat box.
- **Website.** Hero sentence spacing fixed; solid HUD panels; small text raised to
  at least 10 px (most metadata 11-12 px); five-column grid on wide screens; cards
  show the player's best for the selected difficulty, or the game's tagline before
  a first run; separate full-bleed maskable app icon.
- **Robustness.** A missing model leaves an empty spot instead of stopping the game
  (checked by loading every 3D game before any model existed). An independent code
  review found no shared-resource disposal bugs; its eight minor findings (frozen
  effects at game over, mislocated parking confetti and slipper dust, late loads
  after dispose, instanced buffers, sign font loading, skyline shadows, an
  overlapping legacy tower) were fixed.

Verification: **48 tests pass** (two new particle-pool tests); TypeScript and the
production build pass; the service worker precaches 89 unique files
(15.2 MiB). On the production preview, installed then reloaded offline, all ten
games started with one canvas, every model loaded and no game errors occurred
([offline check](offline-v3-check.json)); the only failed request was the optional
score server retrying. Visual review in Chromium at 390 × 844 for all ten games and
768 × 1024 for Basketball.

Not verified: frame rate and battery on physical phones (renders here use a
software rasterizer), Safari/iOS, and long play sessions. Jeepney districts after
Cubao use the same code path but were not screenshotted at speed.

## Automated rules and integration

- **46 tests pass.** Covers pause/reset, collisions, progressive difficulty,
  four-way facing and stride, traffic spacing while braking, pedestrian
  crossings, full-footprint parking, outrigger clearance, slipper retrieval,
  physical hoop crossing, Piko sequence/timing, ordered recipes, fruit/hazards,
  reachable volcano ledges, score migration, corrupt storage and upload races.
- TypeScript and production build pass. Scenes dynamically import from individual
  game folders. The gallery starts no game engine.
- Service worker precaches **69 entries / approximately 9.25 MiB**. Vite reports expected
  large Phaser and Three.js engine chunks; both are lazy loaded and precached.
- Real local Nakama integration passes authentication, **30 difficulty
  leaderboards**, queue draining and best-score retries. The script removes
  its temporary test account.

## Actual playthroughs

In the preceding collection revision, all eight additional games reached their next stage through real keyboard input,
with three lives remaining. The development harness observed model state to
choose inputs; it did not change game rules or assign scores.

| Game | Completed progression | Score |
| --- | --- | --- |
| Tricycle Parking | One aligned, stopped park; second bay | 410 |
| Island Boat Racing | Five gates; second leg, 234 m | 575 |
| Tumbang Preso | Hit can, retrieve slipper, return home | 170 |
| Basketball sa Kanto | Three baskets; second round | 360 |
| Piko Challenge | Fifteen out-and-back hops; second round | 690 |
| Halo-Halo Shop | Three correct orders; second set | 585 |
| Coconut Catcher | Twelve catches; second harvest | 465 |
| Volcano Escape | Climb to 505; second ridge | 505 |

See [progression results](collection-playthroughs.json).

Original-game checks from the preceding revision remain applicable: Patintero
completed scoring/tag/game-over/restart flows and directional animation review.
A real Jeepney run reached 408 m with three lives and a safe +100 crossing.
The replacement jeepney and traffic models have articulated wheels, visible
windows, readable signs and recognizable body details.

## Offline and update checks

- Updated an installed two-game PWA using its Update button. Existing Jeepney
  and Patintero scores, player name and muted sound preference survived.
- Blocked network requests and set the browser offline. An uncached fetch failed.
  All ten games loaded, started, displayed one canvas and loaded logo/cover
  assets without horizontal overflow or uncaught errors. Generated scene
  backgrounds also loaded correctly.
- Completed production **Piko 690** and **Basketball 110** offline using actual
  keyboard controls. Both displayed “Saved offline · sync pending”. The two
  queued results survived a full reload.
- Reconnection and the scheduled retry drained the queue from two to zero.
  Authentication already in flight during reconnection can wait for the next
  30-second retry. Existing scores and preferences stayed intact.
- Earlier production offline runs saved Patintero Hard 175 and Jeepney Normal
  183 and drained those queues on reconnection.

Evidence: [all ten cached games](offline-games-check.json),
[score/reconnect results](offline-score-check.json),
[Piko result](screenshots/piko-offline-score.png),
[Basketball result](screenshots/basketball-offline-score.png).

## UI and responsive review

- Gallery reviewed at 320 × 568, 390 × 844, 768 × 1024 and 1440 × 1000. It uses
  two, three and four columns as space allows, with no horizontal overflow.
- Dimension filters and badges have been removed. Search finds Halo-Halo, empty search
  resets, favorites persist after reload, and profile editing updates the
  header. The previous display name was restored after testing.
- Installation help contains iOS and Android browser instructions.
- All eight additional games reviewed live at 320 × 568 and 390 × 844. Touch
  buttons remain visible and at least 44 px high. Small-phone refinements keep
  the HUD clear of Halo-Halo's recipe and separate controls from the parking,
  slipper-retrieval, coconut and volcano play areas.
- Both originals were reviewed at 320 × 568, 390 × 844, 768 × 1024 and
  desktop 1440 × 900 before the expansion.
- Halo-Halo and Basketball also passed the final tablet player check at
  768 × 1024, with visible controls and no overflow.
- The final 3D neighborhood pass adds textured Filipino shop houses, tin roofs,
  awnings, signs and potted plants behind the court and parking area.
- Each switch disposes the previous renderer. The final ten-game offline sweep
  retained one canvas and had no uncaught JavaScript errors. Disconnected console
  messages were expected from the blocked probe and optional score uploads.

Visual evidence: [desktop](screenshots/collection-desktop.png),
[phone](screenshots/collection-mobile.png),
[tablet](screenshots/collection-tablet.png). Individual live-game screenshots
are named by game ID under `screenshots/`.

## Practical limits

These checks used Chromium emulation, not physical iOS or Android hardware.
Safari installation, real multi-touch ergonomics, low-end GPU performance,
battery usage and longer balance testing still need device review. Short desktop
frame samples are not phone performance guarantees.

Online boards accept client-reported scores and suit casual play. Docker is
configured for local development. Multiplayer and account linking are not included.

## Final gameplay and artwork pass

- Patintero uses an articulated running rig with support/swing feet, bent knees,
  counter-swinging arms and interpolated facing. Stride continuity and standing/
  pause behavior have regression coverage.
- Basketball walks with four directions and dribbles before setting its feet
  to shoot. Substepped sphere/backboard and sphere/rim contacts prevent tunnelling.
  Tests cover 100-unit/s shots from either board side, rim rebounds, descending
  versus ascending scoring, ground energy loss, walking bounds and pause.
- Boat steering has acceleration and coasting. Hull, buoys and water sample the
  same wave field; a damped hull follows pitch/roll and a fading wake follows
  previous positions. Tests compare analytic slopes and 30/60 Hz stability.
  The camera follows lateral travel so the boat stays visible at either edge.
- Coconut catches settle behind the correctly scaled near basket rim and in
  front of its interior. Live falling fruit stays above the basket in depth.
  Catch visuals freeze on pause and cannot duplicate points.
- Lava uses a generated basalt texture with moving molten seams, a glowing
  animated surface edge, bubbles and embers, replacing flat geometric crust.
- Jeepney scenery cycles through Cubao, Palengke, Quiapo, Binondo and Baywalk.
  Market produce, a bell tower, lanterns, coastal railings/water, shop palettes,
  building heights and lighting vary by district. New sections enter from the
  distant road as the level advances. Restart restores Cubao.
- The crossing glyph is a contained SVG. Controls have opaque backgrounds and
  minimum 44px touch heights. Basketball, Patintero, Tricycle, Halo-Halo and
  Volcano were additionally checked at 320 × 568.
- All ten final posters were visually reviewed for title spelling, framing and
  absence of flags/pennants. The gallery was reviewed at 320, 390, 768 and 1440px.
  Favorite buttons sit below artwork; no title is hidden behind a heart button.
- Three MP3 loops fetch successfully offline, alongside the new lava and covers.
  All ten final production games start offline with one canvas, no overflowing
  controls, and no uncaught runtime errors. The uncached network probe fails as
  expected. Evidence: [offline revision check](offline-polish-v2.json).
- A live Web Audio check confirmed a decoded 59-second loop, source playback
  during a run, stopping on pause and resuming at the retained offset.

Screenshots with `fixture` in their name use deliberately assigned scene states
to inspect catch layering, lava, crossing layout and district appearance.
They are visual checks, not evidence of earning a score or reaching a level.
Screenshots ending `final-offline` show actual start/input flows.
The preceding score upload integration evidence was not re-run because no SDK
or Nakama behavior changed in this pass.

