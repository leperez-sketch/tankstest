# Chicken Horde V6.2.3 3D — Farm Defense

Static multiplayer game for GitHub Pages. The host runs the match; phones join as controllers through PeerJS/WebRTC. The game keeps the V5.2 rules and changes the host rendering to real-time 3D.

## Publish on GitHub Pages

1. Upload this folder's contents to the repository root or a Pages-enabled folder.
2. Enable GitHub Pages for that branch/folder.
3. Open `https://<username>.github.io/<repository>/?host=1` on the host computer.
4. Players scan the lobby QR code and enter a name. The lobby stays open until the host presses **START GAME**. After Game Over, **RETURN TO LOBBY** keeps the same room, QR code, and roster.
5. The lobby preloads the 3D models before enabling the start button.

## Camera and visuals

- Fixed, tilted top-down 3D perspective inspired by the reference image.
- Dynamic camera follows the player group while keeping Mama Hen in view; it zooms out as players spread apart and eases back in when they regroup.
- Real GLB models for the player chicken, Mama Hen, fox, wolf, eagle, snake, Chupacabras, eggs, house, ground, grass, trees, and rocks. The rifle is loaded from OBJ/MTL. Missing model files fall back to simple 3D shapes.
- Nameplates, health bars, player color, shield, damage flashes, angel-style player death animation, stylized enemy blood splashes, projectiles, enemy attacks, tornadoes, and wave countdown render in the 3D scene. Lobby player models are enlarged for easier recognition. Battle fog softens the outer 10% of the arena and blends into an extended pasture plane; the center and outer map have additional obstacle lanes. Grass tufts are rendered as instanced meshes to increase ground detail with few draw calls. Enemy health bars are depth-tested so they do not float through the house or other scenery.
- The models and textures are loaded from local files in `assets/models`; Three.js itself is loaded from jsDelivr.

## Preserved gameplay

- Infinite waves with a 3-second countdown and groups of enemies. Enemy count increases 25% for each player after the first.
- All enemies, including Chupacabras, use one fixed speed on every wave. Enemy damage is reduced by 60%. Foxes jump, wolves attack in packs, eagles dive, snakes arrive in groups, and the later waves include moles, aliens, mages, ghosts, plants, and tornadoes. Chupacabras appears at wave 5 and rarely as an elite from wave 6 onward, with an eye-fire attack. Mole, tornado, alien, mage, ghost, and plant enemies use visible procedural 3D models, so separate GLB files are optional.
- Drops use a 10% chance per defeated enemy: shield, occasional medkit, permanent non-stacking double-shot, or permanent non-stacking rapid-fire. Duplicate shot upgrades do not stack.
- Tornadoes grow while aiming toward the henhouse, then dash across the map. Four nearby boulders provide defensive cover and block movement/projectiles. Moles and plants pressure the center.
- Mama Hen heals 8% after each completed wave. Player movement remains 15% faster; aiming auto-fires rapidly while held.
- Background music (Farm Rave) has its own play toggle and volume slider. Sound effects have a separate toggle; the chick death cue is synthesized with Web Audio.

## Controls

- Left virtual stick: move.
- Right virtual stick: aim and rapid-fire while held off-center.
- Desktop: WASD/arrows to move, mouse to aim, hold left-click or Space to fire.

## Files

- `index.html`: host lobby and phone controller; includes the Three.js import map.
- `app.js`: multiplayer, controls, waves, enemy AI, combat, drops, audio, and scoring.
- `renderer3d.mjs`: Three.js scene, dynamic camera, model preloader, and game rendering.

## V6.2.3 fixes

- Wolf, snake, and Chupacabras GLB skeletons now play their walk/run animations. Frustum culling is disabled for skinned meshes so stale bind-pose bounds cannot make moving models disappear.
- Tornado contact damage is fixed at 2 points per hit.
- `style.css`: responsive host and mobile controller styles.
- `assets/models/`: GLB, GLTF, OBJ/MTL models and required buffers/textures.

## Multiplayer notes

Pages and game assets are static. PeerJS is loaded from its public CDN and uses its public signaling service to establish browser-to-browser WebRTC connections. Internet access is needed for the CDN and signaling. The host retains disconnected players for 45 seconds. Controllers keep a stable local player ID and retry with backoff; if they reconnect during this window, their player and score are preserved. The host can kick a player from the lobby roster or from the PLAYERS menu during a match. An idle connection is treated as lost after 12 seconds, then kept for the 45-second reconnect window. A QR join panel is available from the host toolbar during a match and supports hover, keyboard focus, and tap.

PeerJS/WebRTC can retry signaling and recover brief dropouts, but browser-only static hosting cannot bypass networks that block WebRTC or require a TURN relay. For restrictive school proxies, configure a dedicated PeerServer plus TURN service; retry logic alone cannot make blocked UDP/TCP relay traffic pass.

## Asset credits

Forest models/texture: Kay Lousberg, KayKit Forest Nature Pack (CC0 1.0). Floor Grass Sliced B: Isa Lousberg. Grass and Shack: Quaternius. Fertile soil: Frank Lynam. Egg and animal models retain their original creator attribution from the supplied files.
