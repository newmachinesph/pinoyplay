# PinoyPlay collection expansion

User-confirmed scope: **eight additional games, ten total**, five 2D and five 3D.
Continue through the whole build; new chat messages join the queue unless the user
explicitly stops or redirects work. Offline-first portrait PWA, no multiplayer.

## Games

| Game | Engine | Distinct play |
| --- | --- | --- |
| Jeepney Rush | Three.js | Traffic, fares, progressively harder routes, yielding crossings |
| Patintero | Phaser | Four-way running, line guards, timed out-and-back rounds |
| Tricycle Parking | Three.js | Steer/reverse an authored tricycle into parking bays |
| Island Boat Racing | Three.js | Steer an outrigger bangka through island gates |
| Tumbang Preso | Three.js | Aim a slipper at a can; recover it during the safe window |
| Basketball sa Kanto | Three.js | Aim and release basketball shots on a barangay court |
| Piko Challenge | Phaser | Precision hopping through chalk-numbered court sequences |
| Halo-Halo Shop | Phaser | Assemble customer orders from Filipino dessert ingredients |
| Coconut Catcher | Phaser | Move a basket to catch ripe coconuts and avoid hazards |
| Volcano Escape | Phaser | Jump between platforms above rising lava |

## Art and brand

Platform: Philippine blue `#0038A8`, red `#CE1126`, yellow `#FCD116`, white `#FFFFFF`,
navy text `#071D49`, pale background `#F3F6FF`. Keep authentic game worlds colorful.
Barlow Condensed for display/logotypes, DM Sans for interface copy.
Signature: a bold blue “Laro tayo.” feature wall with illustrated game posters;
distinct game wordmarks rather than anonymous numbered tiles.

Every game gets a local featured image and a distinct logo. Generate poster
illustrations with the approved built-in image tool. Author scalable game
wordmarks as native vector assets with outlined lettering and game-specific motifs.
The generated platform logo is optimized as `public/brand/pinoyplay.webp`.
Its original is preserved in the generated-images directory and archived
under `artifacts/retired-public-assets/`.

Gallery: searchable game grid, 2D/3D and category filters, favorites, recent games,
collections, profile/high scores, clear play actions, accessible empty states.
Mobile starts with useful games above the fold; tablet and desktop expand the grid.

## Implementation direction

- Introduce one catalog as the game registry, including type, category, copy,
  controls, illustration and logo paths.
- Preserve the two completed game models/worlds. Add reusable scene utilities,
  with eight distinct models and game-specific scenes.
- Extend the local-first SDK and Nakama boards to all ten IDs and three modes.
  Preserve existing player identity, saved scores and preferences.
- Gallery is the default route. Game hashes deep-link to portrait players.
  Dispose engines and stop audio when returning to the collection.
- All game assets, engines, fonts and logos remain available after PWA download.
- Test meaningful model rules, input/pause/reset, mode boards, offline/reconnect,
  all games at phone dimensions and the gallery at phone/tablet/desktop sizes.

## Completed two-game baseline before expansion

21 model/SDK tests pass; production build passes, precache 3,121.75 KiB.
Four detailed traffic vehicles, wheel animation, three modes, progressive pressure,
pedestrian crossings, timed Patintero rounds and time bonuses are implemented.
Browser crossing run: 408 m, three lives intact, one safe crossing, +100 bonus.
Offline production runs: Patintero Hard 175 and Jeepney Normal 183 saved, survived
reload/switch, and both queues drained on reconnection. Six Nakama boards passed
the integration script, including best-score retries.
Small-phone Jeepney welcome framing was fixed to keep its full model visible.
Phone 320×568 / 390×844, tablet 768×1024 and desktop 1440×900 were reviewed.
No physical iOS/Android or certified 9/10 claim.

## Completed collection

All ten games are implemented. Each has its own `src/games/<game-id>/` directory
and a matching `public/games/<game-id>/` asset directory. There is no combined
`arcade` source folder. Only reusable engine helpers, audio, player UI and SDK
remain shared.

The flag-color gallery, generated platform logo, ten covers, ten outlined
wordmarks and three additional gameplay backgrounds are integrated. All eight
new games reached stage two using real keyboard input with three lives intact.
38 tests, the production build and 30 Nakama leaderboard checks pass. All ten
games start offline; new Piko/Basketball results survive reload and sync on
reconnection. See `QUALITY.md` for evidence and device-testing limits.
