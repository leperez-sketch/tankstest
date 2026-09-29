# Chicken Horde V6.1 3D — Farm Defense

Static multiplayer game for GitHub Pages. The host runs the match; phones join as controllers through PeerJS/WebRTC. The game keeps the V5.2 rules and changes the host rendering to real-time 3D.

## Publish on GitHub Pages

1. Upload this folder's contents to the repository root or a Pages-enabled folder.
2. Enable GitHub Pages for that branch/folder.
3. Open `https://<username>.github.io/<repository>/?host=1` on the host computer.
4. Players scan the lobby QR code and enter a name. The lobby stays open until the host presses **START GAME**.
5. The lobby preloads the 3D models before enabling the start button.

## Camera and visuals

- Fixed, tilted top-down 3D perspective inspired by the reference image.
- Dynamic camera follows the player group while keeping Mama Hen in view; it zooms out as players spread apart and eases back in when they regroup.
- Real GLB models for the player chicken, Mama Hen, fox, wolf, eagle, snake, Chupacabras, eggs, house, ground, grass, trees, and rocks. The rifle is loaded from OBJ/MTL. Missing model files fall back to simple 3D shapes.
- Nameplates, health bars, player color, shield, damage flashes, projectiles, enemy attacks, tornadoes, and wave countdown render in the 3D scene.
- The models and textures are loaded from local files in `assets/models`; Three.js itself is loaded from jsDelivr.

## Preserved gameplay

- Infinite waves with a 3-second countdown and groups of enemies. Enemy count increases 25% for each player after the first.
- Enemies start 30% faster than V4; speed rises another 5% each wave after wave 3. Foxes jump, wolves attack in packs, eagles dive, snakes arrive in groups, and the later waves include moles, aliens, mages, ghosts, plants, and tornadoes. Chupacabras appears at wave 5 and rarely as an elite from wave 6 onward, with an eye-fire attack.
- Drops are limited to shields and occasional medkits, at the existing 10% drop chance. No laser, double-shot, or triple-shot pickups.
- Tornadoes grow while aiming toward the henhouse, then dash across the map. Four nearby boulders provide defensive cover and block movement/projectiles. Moles and plants pressure the center.
- Mama Hen heals 8% after each completed wave. Player movement remains 15% faster; aiming auto-fires rapidly while held.
- Sound options, player scoring, nameplates, game-over screen, and local all-time high scores remain.

## Controls

- Left virtual stick: move.
- Right virtual stick: aim and rapid-fire while held off-center.
- Desktop: WASD/arrows to move, mouse to aim, hold left-click or Space to fire.

## Files

- `index.html`: host lobby and phone controller; includes the Three.js import map.
- `app.js`: multiplayer, controls, waves, enemy AI, combat, drops, audio, and scoring.
- `renderer3d.mjs`: Three.js scene, dynamic camera, model preloader, and game rendering.
- `style.css`: responsive host and mobile controller styles.
- `assets/models/`: GLB, GLTF, OBJ/MTL models and required buffers/textures.

## Multiplayer notes

Pages and game assets are static. PeerJS is loaded from its public CDN and uses its public signaling service to establish browser-to-browser WebRTC connections. Internet access is needed for the CDN and signaling. For large groups, use a dedicated signaling service and test the school network's WebRTC policy.

## Asset credits

Forest models/texture: Kay Lousberg, KayKit Forest Nature Pack (CC0 1.0). Floor Grass Sliced B: Isa Lousberg. Grass and Shack: Quaternius. Fertile soil: Frank Lynam. Egg and animal models retain their original creator attribution from the supplied files.
