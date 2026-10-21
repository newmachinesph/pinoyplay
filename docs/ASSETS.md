# Game assets and generation notes

All runtime assets are in the repository. Generation is a development step;
none of the ten games calls an AI service while being played.

| Asset | Source and processing | Runtime size |
| --- | --- | --- |
| `public/art/patintero-court.webp` | Built-in image generation, pennants removed, 900 × 1600 WebP | 342,862 bytes |
| `public/art/run-runner.webp` | Built-in image generation; 16 running poses, four directions, 512 × 512 | 91,230 bytes |
| `public/art/run-girl.webp` | Built-in image generation; 16 running poses, four directions, 512 × 512 | 95,538 bytes |
| `public/art/run-boy.webp` | Built-in image generation; 16 running poses, four directions, 512 × 512 | 89,194 bytes |
| `public/art/idle-players.webp` | Built-in image generation; three characters × four standing directions, 512 × 384 | 68,818 bytes |
| `public/art/manila-facades.webp` | Built-in image generation; three shop-house fronts in a 1536 by 512 atlas | 246,666 bytes |
| `src/games/jeepney-rush/jeepney.ts` | Project-authored Three.js geometry, materials and canvas route signs | Included in the Three.js game chunk |
| `docs/art/jeepney-reference.png` | Built-in image generation; reference for the 3D model | Source art only |
| `public/brand/pinoyplay.webp` | Built-in generated platform logo, trimmed and resized | Local WebP |
| `public/games/<id>/cover.webp` | Ten individually generated Philippine-themed illustrations, 1024 × 683 | Local WebP files |
| `public/games/<id>/logo.webp` | Ten painted title logos from `gpt-image-2` with each game's cover as a style reference, white background removed by edge flood fill, 720 px transparent WebP (previous SVG wordmarks archived in `artifacts/logos-svg-v1/`) | 749,718 bytes total |
| `public/games/{halo-halo-shop,coconut-catcher,volcano-escape}/background.webp` | Three generated portrait gameplay backgrounds, 720 × 1260 | Local WebP files |
| `public/icon.svg`, PNG icons | Project-authored companion sun/play vector, rasterized for installation | Local files |
| `public/games/volcano-escape/lava.webp` | Built-in generated basalt and molten fissures, 768 × 768 WebP | 283,698 bytes |
| `public/audio/{barrio,islands,ascent}.mp3` | Gemini-generated instrumental music, normalized and edited into 59-second loops | 945,048 bytes each |

The user approved the built-in image generator after two Grok image attempts
failed to save an image. Grok's separate 3D generator succeeded. Modal was
not used for the first build; it runs TRELLIS.2 for the generated props below.

The first build used a generated GLB (55,989,600 bytes before optimization).
It was replaced after visual review because its geometry and painted details
were too distorted. The current jeepney has clean body panels, cut wheel arches,
a curved roof, grille, mirrors, windows, bench seats, an open rear entrance,
step and grab rails, route boards, and a left-hand driving position.
Its wheels roll and steer separately from the body.

The four traffic vehicle types, motorcycle-sidecar tricycle, outrigger bangka,
street characters, basketball court, can and slipper are also authored Three.js
geometry. They are not AI-generated GLBs. Vehicle geometry is inside the relevant
game folder; shared scene helpers provide palms, materials, neighborhood details
and articulated characters. No 3D generation service or GPU inference job runs
in the released games.

The initial collection added 14 generated images: a platform logo, ten covers and three
gameplay backgrounds. Exact prompts, source paths and output paths are recorded
in [the collection art manifest](art/collection-prompts.json).
`scripts/build-collection-art.mjs` optimizes those images, builds ten outlined
game wordmarks and writes installation icons. The SVG wordmarks use explicit,
finite path coordinates to preserve every letter. Generated originals remain
under the local Codex generated-images directory. Previous public assets and
the full-size platform logo are also archived under `artifacts/retired-public-assets/`.

Halo-Halo's glass and ingredients, Coconut's basket and fruit, Volcano's basalt
platforms, Piko's chalk marks and the bangka's moving water texture are drawn in
code over the generated setting art. Each game loads its own background from
`public/games/<game-id>/`. Character atlases and the shared court/storefront art
remain in `public/art/`.

The historical optimization script
`scripts/optimize-jeepney.mjs` uses glTF Transform and Meshoptimizer, with 1024-pixel
WebP textures and about 33,634 output triangles. Its input is the ignored
`artifacts/jeepney-original.glb`; its output now stays in `artifacts/`.
The prior optimized model and still-character atlas are archived there too.
Neither is downloaded or precached by the game.

`scripts/pack-sprites.mjs` crops the generated grid cells, preserves alpha,
normalizes scale and anchors feet into padded 128-pixel frames. See
[exact directional sprite prompts](art/directional-sprite-prompts.json).
The runner's right-facing idle cell was corrected by mirroring its left-facing
idle pose. Patintero now uses a continuous articulated canvas rig with painted
heads from this atlas, alternating support/swing legs, bent knees, opposing arms,
smooth turns and motion tied to actual distance. Piko and Volcano retain the
directional atlas animation.

Road, traffic, vehicles, characters, chalk lines and player indicators are authored
in code. Since the 9/10 revision, roadside buildings, trees, islands and street
props in the five 3D games are generated models (see below); ground textures
and skies are drawn procedurally on canvases at runtime. Web Audio synthesizes impact-specific effects, footsteps,
dribbles, jumps, ingredient sounds, engine hum and water wash. Music comes from
three locally packaged Gemini tracks, detailed below.
Fonts are installed from the local Barlow Condensed and DM Sans packages.
Generated assets remain subject to the generator service's applicable terms;
they are not labeled as open-source model outputs.

## Final poster and sound revision

User constraint: **never use flags in images**. Final posters, the shared court
and the app icon were reviewed for flags, pennants and flag-like body decorations.
Shared 3D street decorations use lights; boat gate markers use round beacons.
The UI retains blue, red, yellow and white as independent design colors.

All ten covers were regenerated with individual title lettering inside the
illustration: jeepney enamel, chalk lettering, parking-road paint, wave script,
tin-and-wood lettering, basketball brush lettering, dessert lettering, coconut
lettering and glowing basalt. No overlaid SVG titles or dimension badges appear
in the gallery. Source paths are in [the final manifest](art/poster-sources-v2.json).
Previous covers are archived in `artifacts/posters-v1/`.
The art build script uses the final manifest, including the flag-free court and lava.

Gemini's authenticated browser music tool generated:

| Original download | Original duration | Packaged loop | Games |
| --- | --- | --- | --- |
| Sunday in the Barrio | 62.38 s | `barrio.mp3` | Jeepney, Patintero, Tricycle, Tumbang, Basketball, Piko |
| Sunlight off the Water | 60.68 s | `islands.mp3` | Boat, Coconut, Halo-Halo |
| Toward the Cloud Line | 179.64 s | `ascent.mp3` | Volcano |

Prompts requested original instrumental Filipino-inspired acoustic/percussion
backing with no vocals, speech or recognizable existing melody. The adventure
prompt was titled “Mayon Ascent”; the downloaded file used a different title.
This is provenance, not an independent originality or license certification.
Source conversation: https://gemini.google.com/app/4852799af601ae2f.
Original MP3s remain in `artifacts/audio/`.
The [exact audio prompts](art/audio-prompts.json) record each request and download.

FFmpeg trims the first minute, crossfades the last second into the first second,
then outputs the continuous 59-second middle-plus-transition loop at 44.1 kHz,
128 kb/s, with a -18 LUFS / -2 dBTP normalization target. Music plays through
Web Audio, pauses without losing its position, respects mute, and is precached.
Effects are synthesized locally so collision and movement sounds match the game.

Grok CLI was authenticated, but the audio capability request returned HTTP 402,
“usage balance exhausted.” No Grok audio sample was produced. Gemini was the
working music source in this session; no head-to-head listening comparison or
claim that its audio quality beats Grok is supported.

## Generation briefs

The following two briefs record the art direction, rather than exact transcripts:

- **Patintero court:** portrait, high overhead view of a warm Philippine barangay
  lane; a generous empty concrete play area in the middle, corrugated roofs and
  sari-sari storefront details along the edges, tropical plants, a parked bicycle
  and soft afternoon shadows. The final revision removes the original pennants.
  No people or court markings:
  characters and rule-accurate chalk lines are drawn by the game.
- **Jeepney reference:** isolated full traditional Philippine passenger jeepney
  in a three-quarter view, chrome hood and grille, long passenger body, open rear
  entrance, colorful teal, yellow and coral trim, roof rails and detailed wheels.
  Whole vehicle visible with clean separation from the background.

Original still-character reference prompt (superseded at runtime):

> Use case: stylized-concept. Asset type: production 2D game character sprite sheet for a top-down Philippine patintero mobile game. Create exactly SIX separate small full-body Filipino kids, viewed from a high overhead 65-degree top-down camera, facing toward the bottom of the image. Painterly polished mobile game illustration with natural warm brown skin, black hair, subtle shaded cloth folds, charming believable proportions, short limbs, readable at 48 pixels high. Not flat icons. Arrange in a precise 3-column by 2-row grid, each character centered in its own equal-size cell with generous transparent gutters and consistent scale. Top left is PLAYER: teal T-shirt, dark shorts, yellow baseball cap, worn sneakers. Other FIVE are guards: coral-red or warm terracotta T-shirts, navy shorts, sneakers or slippers, varied short hair and ponytail, two girls and three boys. Same view and scale, relaxed athletic standing pose with arms slightly out, feet apart. Soft sunlight from upper left. A subtle small contact shadow under each character only. Transparent background, no scene, no ground, no grid lines, no text, no border, no cut off bodies, no logos. Landscape 3:2 sheet.

Exact final storefront prompt:

> Use case: stylized-concept. Asset type: texture atlas for three facade planes in a Three.js Philippine street driving game. Generate a WIDE 3:1 image divided into exactly THREE equal square panels side-by-side with NO GUTTERS or frames. Each panel is a perfectly flat orthographic front elevation of a different two-story Filipino barangay shop-house facade, filling its whole square edge to edge. Camera perpendicular to wall, absolutely NO perspective, NO visible side walls, NO sky, NO road, NO ground outside building, NO people, NO vehicles. Left panel: weathered warm ochre concrete sari-sari store, dark open shop doorway with hanging colorful sachets and rows of bottled drinks, barred upstairs windows, patched corrugated metal awning, small potted tropical plant on sill. Center panel: faded dusty teal neighborhood eatery, broad wooden shop doors, upper wood jalousie windows, pale cream trim, air conditioner and small grille balcony. Right panel: dusty coral panaderia shop-house, wood shutters, barred dark upper windows, bread shelves visible in lower window, corrugated eave, worn concrete and narrow climbing greenery. Keep all signage panels BLANK plain cream to overlay crisp game text later. Premium stylized hand-painted game texture with convincing warm material details, sun-faded paint, restrained wear, soft ambient lighting and subtle cavity shading, not photoreal. Cohesive Filipino tropical neighborhood art direction, earthy ochre teal coral and cream, medium contrast. Top of each square is roof trim, bottom is shop threshold. Perfectly cropped edge-to-edge facade texture tiles. No text, logos, labels, watermarks.

## Generated 3D props (9/10 revision, 20 October 2026)

The five 3D games use 21 generated models for buildings, trees, islands, street
props and the player's bangka. Vehicles other than the bangka, characters, the
hoop, the can, gates and roads remain authored geometry.

1. **Reference art:** six 2×2 sheets from `gpt-image-2` through the Codex CLI on
   the user's ChatGPT subscription. Exact prompts: [prop prompts](art/prop-prompts.json);
   source sheets: `docs/art/props/`. No flags, pennants, brand logos or people.
   The first island sheet painted water around each island and was replaced by a
   waterless sheet.
2. **Image to 3D:** Microsoft TRELLIS.2-4B (MIT) on a Modal A100-80GB through
   [`scripts/trellis2_modal.py`](../scripts/trellis2_modal.py), 1024 cascade, seed 1,
   10,000-face decimation, 2048 px baked PBR texture. `facebook/dinov3` and
   `briaai/RMBG-2.0` are gated on Hugging Face, so the job loads the same DINOv3
   ViT-L/16 LVD-1689M weights published ungated by `timm` (DINOv3 License) and the
   MIT `ZhengPeng7/BiRefNet`. About one minute of GPU time per model.
3. **Web optimization:** [`scripts/optimize-props.mjs`](../scripts/optimize-props.mjs)
   bakes a common convention (origin at bottom centre, front toward +Z, height 1),
   simplifies to a per-asset triangle budget, keeps base colour only (non-metal,
   roughness 0.85), resizes textures to 512 or 1024 px WebP and applies meshopt
   compression. Runtime decoding uses Three.js's bundled meshopt decoder.
4. **Signs:** generated textures turn lettering into pseudo-glyphs, so
   `src/core/rendering/props.ts` lays crisp canvas signs (SARI-SARI STORE,
   KARINDERYA, PANADERIA, BOTIKA) over the measured board positions.

Rejected: a hut-on-sand islet lost its pale sand and palms to background removal;
a first pass at 40,000 faces simplified poorly around UV seams (18 MB total).
Raw outputs are kept in `artifacts/props-raw/`, `artifacts/props-raw-40k/` and
`artifacts/props-rejected/`; none are precached.

| Model | Triangles | Texture | Bytes |
| --- | --- | --- | --- |
| `apartment.glb` | 8,999 | 1024 px | 279,192 |
| `banana-plants.glb` | 7,168 | 512 px | 232,820 |
| `bangka.glb` | 8,000 | 1024 px | 286,892 |
| `botika.glb` | 8,000 | 1024 px | 385,864 |
| `bougainvillea-planter.glb` | 9,270 | 512 px | 352,304 |
| `coconut-palm.glb` | 6,608 | 512 px | 290,632 |
| `fishball-cart.glb` | 5,248 | 512 px | 178,344 |
| `fruit-stall.glb` | 8,400 | 1024 px | 467,188 |
| `karinderya.glb` | 8,997 | 1024 px | 399,580 |
| `karst-islet.glb` | 8,784 | 512 px | 277,372 |
| `mango-tree.glb` | 7,000 | 512 px | 235,672 |
| `monobloc-set.glb` | 3,998 | 512 px | 99,216 |
| `nipa-hut-stilts.glb` | 8,324 | 512 px | 241,840 |
| `palm-islet.glb` | 7,816 | 512 px | 344,584 |
| `panaderia.glb` | 8,996 | 1024 px | 389,660 |
| `sari-sari-store.glb` | 8,903 | 1024 px | 402,416 |
| `sea-stacks.glb` | 7,036 | 512 px | 187,800 |
| `two-storey-house.glb` | 8,992 | 1024 px | 421,096 |
| `vulcanizing.glb` | 8,000 | 1024 px | 366,924 |
| `waiting-shed.glb` | 4,944 | 512 px | 143,228 |
| `water-drums.glb` | 4,178 | 512 px | 152,176 |
| **Total** | | | **6,134,800** |

Ground textures (asphalt, packed dirt, concrete, court paint) and sky gradients
are drawn on canvases at runtime from a seeded generator, so they add no download.
The reference sheets come from a hosted generator under its service terms; the
3D conversion and every model weight used are open-source or openly licensed.

## Painted title logos (20 October 2026)

The welcome-screen wordmarks were replaced so they match each cover's integrated
title lettering. Prompt per game (title spelled exactly, cover attached as the
reference): recreate only the title lettering in the cover's style, wrapped in one
thick dark navy (#0b1f4d) die-cut outline, on a flat white background with no
scene, characters, extra words, flags or pennants. Three first attempts arrived on
dark backgrounds and were regenerated with a stricter white-background line.
Sources: `docs/art/logos/<id>-source.webp`. The background is removed by flood
filling near-white pixels connected to the image border (enclosed whites such as
chalk letters survive); the anti-aliased outline edge gets alpha from its darkness.
`scripts/build-collection-art.mjs` still writes the old SVG wordmarks; the game no
longer references them.

## Third-party data

`src/server/banned-words.json` includes the
[List of Dirty, Naughty, Obscene, and Otherwise Bad Words](https://github.com/LDNOOBW/List-of-Dirty-Naughty-Obscene-and-Otherwise-Bad-Words)
(© Shutterstock, Inc., [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/),
commit `5faf2ba42d7b1c0977169ec3611df25a3c08eb13`, 27 language files, unmodified
terms) combined with the project's own `src/server/banned-extra.txt`. No
endorsement by the authors is implied. It is used server-side only and never
shipped to the browser.
