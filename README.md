# 🐔 Chicken Horde — Golden Egg Defense

A browser prototype for a cooperative classroom horde-survival game.

## What is included

- Host game on desktop/projector.
- Phone controller opened from a QR code.
- Peer-to-peer WebRTC networking through PeerJS Cloud signaling.
- Dynamic camera zoom based on player spread.
- Procedural cartoon art matching the cute/tough chicken style.
- Player nameplates and HP bars.
- Automatic targeting + machine-gun firing.
- Fox, wolf and hawk enemies.
- Momma Hen + golden eggs as the defense objective.
- Wave system, particles, muzzle flashes, hit effects and score popups.
- Keyboard fallback on the host: WASD/arrows + Space.
- No build step: plain HTML/CSS/JS, suitable for GitHub Pages.

## Run locally

Because browsers block some features from `file://`, use a simple local server:

```bash
python -m http.server 8080
```

Open:

`http://localhost:8080/`

For phone testing, the phones must be able to reach the deployed/public URL. GitHub Pages is the easiest route.

## GitHub Pages

1. Create a repository.
2. Upload `index.html`, `controller.html`, `style.css`, `game.js`, `controller.js`.
3. Enable GitHub Pages from the repository settings.
4. Open the Pages URL on the classroom PC.
5. The host generates a QR containing `controller.html?room=...`.
6. Students scan, enter a name and play.

## Networking note

This prototype uses PeerJS/WebRTC so the GitHub Pages site does not need its own game server. PeerJS provides signaling; gameplay input is sent peer-to-peer to the host.

For a classroom prototype this is convenient. For production, replace the public signaling infrastructure with a controlled deployment and add room authentication/rate limits.

## Next upgrades

- Replace procedural chicken art with final transparent spritesheets.
- Add real sprite animations: idle/run/shoot/hit/death.
- Add obstacle collision around trees and fences.
- Add weapon upgrades and team voting.
- Add boss waves.
- Add sound/music.
- Add player respawn/revive.
- Add persistent room state and host migration.
- Add touch aim / twin-stick option.
