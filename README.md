# Chicken Horde V4 — Farm Defense

A static, no-build multiplayer prototype for GitHub Pages. The host renders the game and runs the lobby; phones connect as controllers through PeerJS/WebRTC.

## Publish on GitHub Pages

1. Upload the contents of this folder to the repository root (or a Pages-enabled folder).
2. Enable GitHub Pages for the branch/folder containing `index.html`.
3. Open `https://<username>.github.io/<repository>/?host=1` on the host computer.
4. Players scan the lobby QR code, enter a name, and tap **JOIN GAME**.
5. The host presses **START GAME** when everyone is ready. The lobby never starts a match by itself.

## Controls

- Left virtual stick: move only.
- Right virtual stick: aim and fire while held off-center. Releasing it stops firing.
- Desktop controller fallback: WASD/arrows to move, mouse to aim, hold left-click or Space to fire.

Touch controls remain unchanged. The playfield uses a near top-down view with slight depth compression; joystick directions map directly to the same visible screen directions. The camera tracks all living players and the henhouse, zooming out when the group spreads out and back in when it gathers. Touch input uses pointer events, independent touch identifiers, a dead zone, pointer capture, and `touch-action: none`. Trees block players and shots; enemies steer around trees. Foxes occasionally leap; wolves are slower, tougher, and coordinate in packs; fast eagles dive toward the farm. From wave 6 onward, enemy movement speed rises by 5% per wave. Each additional joined player increases that wave's enemy count by 25% (2 players: +25%, 3: +50%, and so on). Fast, fragile snakes first appear from wave 2 and always spawn in groups of three. The Chupacabras boss fires aimed fireballs at nearby players or the henhouse. The henhouse has a visible health bar and flashes red when hit; players flash red when damaged. Completing a wave restores 8% henhouse health. Each wave has a remaining-enemy counter, then shows a centered 3-second countdown before the next wave. Waves continue indefinitely and grow more difficult; enemy counts are 50% higher than in the previous build. Waves 5, 10, 15, and onward add 1, 2, 4, then 8 Chupacabras bosses. Laser power shoots a straight beam instead of bullets. Double Shot and Laser are permanent; Shield and Invincibility are timed. Effects can coexist, and duplicate timed effects extend their duration. Player scores count enemy defeats. A game-over screen shows the run's scores and the all-time high-score table. High scores are stored locally in the host browser and persist across sessions on that browser. The host's optional synthesized sound effects include firing, impacts, enemy defeats, wave cues, boss fire, and a short hen cry when the farm is attacked. Click **SOUND OFF** to enable them; browsers require a user gesture before audio can play.

The host lobby preloads the nature sprite sheet and disables **START GAME** until loading completes (or the emoji fallback is selected after a load failure). Clean, complete tree, rock, and shrub sprites keep the map readable. Player and enemy movement are checked along their full paths against solid obstacle footprints; enemy spawns avoid them. Regular enemies have a 30% power-up drop chance, and each Chupacabras drops one on defeat. Regular enemies have a 30% power-up drop chance, and each Chupacabras drops one on defeat.

## Multiplayer notes

The pages and game assets are static. PeerJS is loaded from its public CDN and uses the PeerJS signaling service to establish browser-to-browser WebRTC connections. Players send control state to the host; the host broadcasts the match state. Internet access is needed for the CDN/signaling service. This is a classroom prototype; for dependable large groups, use a dedicated signaling service and test the school network's WebRTC policy.

## Files

- `index.html`: host lobby/game and phone controller pages.
- `style.css`: responsive display and touch controls.
- `app.js`: lobby, peer connections, controls, farm map, and game loop.
- `assets/nature/forest-sprites.svg`: lightweight, complete 2D forest sprite atlas used by the map and preloaded in the lobby.
- `assets/nature/forest_texture.png`: supplied KayKit source texture atlas, retained with the project assets.

## Nature asset credit

Forest models and texture: Kay Lousberg, **KayKit - Forest Nature Pack** (CC0 1.0). Official pack page: https://kaylousberg.itch.io/kaykit-forest
