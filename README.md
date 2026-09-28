# Chicken Horde V5.2 — Farm Defense

Static multiplayer game prototype for GitHub Pages. A host runs the match and phones join as controllers through PeerJS/WebRTC.

## Publish on GitHub Pages

1. Upload this folder's contents to the repository root or a Pages-enabled folder.
2. Enable GitHub Pages for that branch/folder.
3. Open `https://<username>.github.io/<repository>/?host=1` on the host computer.
4. Players scan the lobby QR code, enter a name, and tap **JOIN GAME**.
5. The host starts the match with **START GAME**.

## Gameplay

- Compact battlefield: the playable world is 50% smaller in width and height than V4. The home, paths, scenery, and obstacle positions are scaled to fit; scenery density is reduced so routes stay open.
- Waves start with a 3-second countdown and continue indefinitely.
- Wave enemies arrive in groups of four or five. The planned enemy count rises by 25% for every player after the first.
- Enemy base movement is 30% faster than V4. Speed increases by another 5% per wave starting after wave 3.
- Wolves, foxes, eagles, and snakes retain their distinct movement and attacks. Moles burrow through obstacles; aliens fire short, direct lasers; mages teleport; ghosts pass through obstacles; plants remain near Mama Hen and shoot seeds.
- Moles and plants spawn near Mama Hen, so players need to return to defend the center.
- One Chupacabras appears in wave 5. Starting in wave 6, it can appear rarely as an elite in the regular enemy rotation. Its eye-fire attack targets players or the henhouse.
- Power-ups are now limited to a 26-second shield and a rare medkit that restores up to 35 health. Enemies have a 10% chance to drop a power-up; medkits make up about one quarter of those drops. Chupacabras guarantees a shield.
- Tornadoes pause to grow and aim at Mama Hen, then dash straight through the arena and leave the map. They no longer linger beside the henhouse.
- Four low boulders near the henhouse provide cover. They block movement and shots while leaving broad routes open.
- The henhouse heals 8% after each completed wave. Player scores, nameplates, damage feedback, audio options, and the game-over scoreboard remain.
- All-time high scores are saved in the host browser's local storage.
- Player movement is 15% faster than V5. Shot firing repeats every 120 ms while aim is held, and sound effects are boosted with a safe volume cap.

## Controls

- Left virtual stick: move.
- Right virtual stick: aim and rapid-fire while held off-center. Releasing it stops firing.
- Desktop fallback: WASD/arrows to move, mouse to aim, hold left-click or Space to fire.

The camera follows living players and the henhouse. Touch controls use pointer events, independent touch identifiers, a dead zone, pointer capture, and `touch-action: none`.

## Assets and files

The host lobby preloads the forest, ground, farm, eggs, player, and enemy sprites before enabling **START GAME**. Map art is cached for rendering; obstacle collision uses small footprints and a spatial index. The four new boulders also count as solid cover for players, enemies, and projectiles.

- `index.html`: lobby/host and phone controller.
- `style.css`: responsive display and touch layout.
- `app.js`: multiplayer lobby, gameplay, waves, controls, and scoring.
- `assets/nature/`: farm and forest scenery, textures, soil paths, shack, and eggs.
- `assets/actors/`: lightweight centered SVG sprites for the player, Mama Hen, Chupacabras, and all enemy types.

## Multiplayer notes

Pages and game assets are static. PeerJS is loaded from its public CDN and uses the PeerJS signaling service to establish browser-to-browser WebRTC connections. Internet access is needed for the CDN and signaling. For large groups, use a dedicated signaling service and test the school network's WebRTC policy.

## Credits

Forest models/texture: Kay Lousberg, **KayKit - Forest Nature Pack** (CC0 1.0). Floor Grass Sliced B: Isa Lousberg. Grass and Shack: Quaternius. Fertile soil: Frank Lynam. Egg: Poly by Google.
