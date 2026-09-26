# 🐔 Chicken Horde — Golden Egg Defense V2

A no-build HTML5 cooperative horde-survival prototype designed for GitHub Pages + classroom phones.

## V2 gameplay

- **Simple mobile controls:** one joystick moves and aims in the same direction; hold FIRE to shoot.
- **Fire button:** hold to use the machine gun.
- **Defense layout:** Momma Hen and the Golden Eggs are now at the bottom.
- **Predator attack direction:** waves primarily enter from the top.
- **Dynamic camera:** zooms/pans to keep the cooperative group and defense zone readable.
- **Visual feedback:** muzzle flash, bullet trails, impact particles, warning markers, elite rings, pickups and score popups.
- **Enemies:** fox, wolf, hawk, elite variants and an Alpha predator during every fifth wave.
- **Pickups:** green hearts restore player HP; gold pickups add score.
- **Combo:** rapid kills build a temporary combo.
- **Environment:** crop fields, road, trees, plants, fence and a bottom golden coop.
- **PC fallback:** WASD/arrows move, mouse aims, hold Space or left mouse to fire.

## Deploy

Upload the files to a GitHub repository and enable GitHub Pages.

Open the Pages URL on the host PC. The game creates a room-specific QR code. Phones scan it and open `controller.html?room=...`.

No npm/build process is required.

## Network

The prototype uses PeerJS/WebRTC. PeerJS provides signaling so the host and phone browsers can establish peer connections. For a production classroom deployment, consider a controlled signaling/relay setup and room authentication.

## Planned V3.1

- Final transparent chicken spritesheet and animation states.
- True collision/navigation around farm obstacles.
- Weapon classes and upgrade/voting system.
- Revive system.
- Boss telegraphs and attack patterns.
- Audio, music and announcer voice.
- Persistent player stats and end-of-wave scoreboard.


## V2.1
One joystick only: its direction controls both chicken movement and gun direction. Hold FIRE to shoot.

## V3 direction
The mobile control remains intentionally simple:
- One joystick controls movement and gun direction simultaneously.
- FIRE is the only second input and can be held for continuous fire.
- The host remains the main visual battlefield.
- The next visual pass should use the real chicken spritesheet, recoil, hit animation, enemy death animation, and stronger projectile effects.


## V3.1 — Player Identity Polish
- Animated chicken movement and idle bob.
- Recoil and muzzle-flash feedback while firing.
- Hit flash and stronger visual readability.
- Persistent colored player identity badge and nameplate.
- HP bar remains directly under each player.
- Keeps the proven one-stick mobile control: joystick direction = movement + firing direction; FIRE shoots.
