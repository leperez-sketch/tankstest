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

Touch controls remain unchanged. Touch input uses pointer events, independent touch identifiers, a dead zone, pointer capture, and `touch-action: none` to avoid page scrolling while playing. Trees block players, enemies, and shots. Foxes occasionally leap through obstacles; wolves are slower, tougher, and coordinate in packs; fast eagles dive toward the henhouse. All enemies can switch between nearby players and the henhouse. Each wave has a visible remaining-enemy count and the next wave begins after the field is cleared. Waves continue indefinitely and increase enemy count, durability, speed, and spawn rate. Drops remain rare; Double Shot, Laser, Shield, and Invincibility effects can coexist and last longer, while duplicate drops extend that effect. The map is a 3600 × 2400 farm with a central henhouse, broad paths, crop plots, trees, and a perimeter fence. The host camera frames the arena with responsive scaling.

## Multiplayer notes

The pages and game assets are static. PeerJS is loaded from its public CDN and uses the PeerJS signaling service to establish browser-to-browser WebRTC connections. Players send control state to the host; the host broadcasts the match state. Internet access is needed for the CDN/signaling service. This is a classroom prototype; for dependable large groups, use a dedicated signaling service and test the school network's WebRTC policy.

## Files

- `index.html`: host lobby/game and phone controller pages.
- `style.css`: responsive display and touch controls.
- `app.js`: lobby, peer connections, controls, farm map, and game loop.
