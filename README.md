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

Touch controls remain unchanged. The displayed joystick directions are mapped into the isometric playfield, so pushing up/right moves and aims up/right on the host screen. Touch input uses pointer events, independent touch identifiers, a dead zone, pointer capture, and `touch-action: none`. Trees block players and shots; enemies steer around trees. Foxes occasionally leap; wolves are slower, tougher, and coordinate in packs; fast eagles dive toward the farm. The henhouse has a visible health bar. Each wave has a remaining-enemy counter, then shows a centered 3-second countdown before the next wave. Waves continue indefinitely and grow more difficult. Double Shot and Laser are permanent; Shield and Invincibility are timed. Effects can coexist, and duplicate timed effects extend their duration. The farm uses a 2.5D isometric view framed to show roughly 80% of the projected map. The host's optional synthesized sound effects include firing, hits, enemy defeats, power-ups, and wave cues. Click **SOUND OFF** to enable them; browsers require a user gesture before audio can play.

## Multiplayer notes

The pages and game assets are static. PeerJS is loaded from its public CDN and uses the PeerJS signaling service to establish browser-to-browser WebRTC connections. Players send control state to the host; the host broadcasts the match state. Internet access is needed for the CDN/signaling service. This is a classroom prototype; for dependable large groups, use a dedicated signaling service and test the school network's WebRTC policy.

## Files

- `index.html`: host lobby/game and phone controller pages.
- `style.css`: responsive display and touch controls.
- `app.js`: lobby, peer connections, controls, farm map, and game loop.
