import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

const UNIT = 40;
const PALETTE = ['#f4c542', '#58b7e6', '#e77a72', '#a885dc', '#62c58e', '#f39a4a'];
const FILES = [
  ['ground', 'ground.glb'], ['chick', 'chick.glb'], ['mama', 'mama-hen.glb'], ['fox', 'fox.glb'],
  ['wolf', 'wolf.glb'], ['eagle', 'eagle.glb'], ['snake', 'snake.glb'], ['boss', 'chupacabras.glb'],
  ['egg', 'egg.glb'], ['grass', 'grass.glb'], ['house', 'hen-house.glb'],
  ['treeA', 'nature/Tree_1_A_Color1.gltf'], ['treeB', 'nature/Tree_3_B_Color1.gltf'], ['rock', 'nature/Rock_1_A_Color1.gltf']
];

export function createGameRenderer({ canvas, world, trees, grassTufts, status, startButton }) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#8fb878');
  scene.fog = new THREE.Fog('#8fb878', 46, 92);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 160);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.45));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  scene.add(new THREE.HemisphereLight('#fff2d7', '#527b4b', 1.35));
  const sun = new THREE.DirectionalLight('#fff0cd', 2.35);
  sun.position.set(-15, 26, 17);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -31;
  sun.shadow.camera.right = 31;
  sun.shadow.camera.top = 25;
  sun.shadow.camera.bottom = -25;
  sun.shadow.bias = -0.00025;
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#d8e7ff', 0.45);
  fill.position.set(18, 11, -18);
  scene.add(fill);

  const loader = new GLTFLoader();
  const models = {};
  const playerNodes = new Map();
  const enemyNodes = new Map();
  const projectileNodes = new Map();
  const fireballNodes = new Map();
  const dropNodes = new Map();
  const beamNodes = new Map();
  const bloodNodes = new Map();
  const actorPalette = new Map();
  let farmBar = null;
  let farmBarCanvas = null;
  let countdownSprite = null;
  let countdownCanvas = null;
  let ready = false;
  let lastFarmValue = -1;
  let lastCountdown = -1;
  let target = new THREE.Vector3(0, 1, 0);
  let cameraDistance = 27;

  const actorPosition = (x, y, height = 0) => new THREE.Vector3((x - world.home.x) / UNIT, height, (y - world.home.y) / UNIT);

  function statusUpdate(done, failed) {
    if (failed) status.textContent = `Modelos 3D precargados (${done}/${FILES.length}); algunos usarán respaldo.`;
    else if (done >= FILES.length) status.textContent = 'Modelos 3D listos. Ya puedes abrir la partida.';
    else status.textContent = `Precargando modelos 3D en el lobby… ${done}/${FILES.length}`;
  }

  async function loadModels() {
    if (document.fonts?.load) await Promise.race([document.fonts.load('12px Bungee'), new Promise(resolve => setTimeout(resolve, 1400))]);
    let done = 0;
    let failed = 0;
    statusUpdate(done, false);
    startButton.disabled = true;
    const results = await Promise.all(FILES.map(async ([key, file]) => {
      try {
        const data = await loader.loadAsync(`./assets/models/${file}`);
        models[key] = data.scene;
      } catch (error) {
        failed++;
        console.warn(`No se pudo cargar el modelo ${file}; se usará un modelo de respaldo.`, error);
      } finally {
        done++;
        statusUpdate(done, failed > 0);
      }
    }));
    try {
      const materials = await new MTLLoader().loadAsync('./assets/models/weapon/materials.mtl');
      materials.preload();
      models.rifle = await new OBJLoader().setMaterials(materials).loadAsync('./assets/models/weapon/model.obj');
    } catch (error) {
      failed++;
      console.warn('Capacitor Rifle no cargó; se usará un arma geométrica de respaldo.', error);
    }
    buildMap(world, trees, grassTufts);
    ready = true;
    statusUpdate(done, failed > 0);
    startButton.disabled = false;
    return results;
  }

  function setupMaterial(root, tint = null) {
    root.traverse(node => {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
      node.frustumCulled = true;
      const apply = material => {
        const copy = material.clone();
        copy.side = THREE.DoubleSide;
        if (tint && copy.color) copy.color.lerp(new THREE.Color(tint), 0.28);
        if (copy.transparent) {
          copy.transparent = true;
          copy.depthWrite = false;
        }
        return copy;
      };
      node.material = Array.isArray(node.material) ? node.material.map(apply) : apply(node.material);
    });
  }

  function makeModel(template, targetHeight, tint = null) {
    if (!template) return null;
    const outer = new THREE.Group();
    const model = template.clone(true);
    outer.add(model);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const max = Math.max(size.x, size.y, size.z, 0.00001);
    let isSkinned = false;
    model.traverse(node => { if (node.isSkinnedMesh) isSkinned = true; });
    const skinScaleCorrection = isSkinned ? 0.04 : 1;
    model.scale.multiplyScalar((targetHeight / max) * skinScaleCorrection);
    model.updateMatrixWorld(true);
    const fitted = new THREE.Box3().setFromObject(model);
    const center = fitted.getCenter(new THREE.Vector3());
    model.position.x -= center.x;
    model.position.y -= fitted.min.y;
    model.position.z -= center.z;
    setupMaterial(outer, tint);
    return outer;
  }

  function makeGround() {
    const width = world.w / UNIT;
    const depth = world.h / UNIT;
    let map = null;
    if (models.ground) {
      models.ground.traverse(node => {
        if (node.isMesh && !map && node.material?.map) map = node.material.map.clone();
      });
    }
    if (map) {
      map.wrapS = THREE.RepeatWrapping;
      map.wrapT = THREE.RepeatWrapping;
      map.repeat.set(width * 0.78, depth * 0.78);
      map.colorSpace = THREE.SRGBColorSpace;
      map.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
      map.needsUpdate = true;
    }
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(width, depth),
      new THREE.MeshStandardMaterial({ map, color: map ? '#ffffff' : '#80bd5f', roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.04;
    ground.receiveShadow = true;
    scene.add(ground);

    const pathMaterial = new THREE.MeshStandardMaterial({ color: '#b99b67', roughness: 1 });
    for (const [x, z, w, d] of [[0, 0, 2.05, depth], [0, 0, width, 1.92]]) {
      const path = new THREE.Mesh(new THREE.PlaneGeometry(w, d), pathMaterial);
      path.rotation.x = -Math.PI / 2;
      path.position.set(x, 0.006, z);
      path.receiveShadow = true;
      scene.add(path);
    }
    const clearing = new THREE.Mesh(new THREE.CircleGeometry(3.2, 48), new THREE.MeshStandardMaterial({ color: '#9ac66d', roughness: 1 }));
    clearing.rotation.x = -Math.PI / 2;
    clearing.position.y = 0.014;
    clearing.receiveShadow = true;
    scene.add(clearing);

    const cropMaterialA = new THREE.MeshStandardMaterial({ color: '#e0bd5b', roughness: 1 });
    const cropMaterialB = new THREE.MeshStandardMaterial({ color: '#729e42', roughness: 1 });
    for (let row = 0; row < 2; row++) for (let col = 0; col < 5; col++) {
      const crop = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.035, 0.72), (row + col) % 2 ? cropMaterialA : cropMaterialB);
      crop.position.set(-17 + col * 1.05, 0.015, -9 + row * 1.3);
      crop.receiveShadow = true;
      scene.add(crop);
    }
  }

  function placeNature(template, x, y, h, yaw = 0, collidable = false) {
    const obj = makeModel(template, h);
    if (!obj) return;
    const pos = actorPosition(x, y);
    obj.position.copy(pos);
    obj.rotation.y = yaw;
    obj.userData.collidable = collidable;
    scene.add(obj);
  }

  function createMapTrees(list) {
    for (const t of list) {
      const source = t.cover || t.model === 4 || t.model === 5 ? models.rock : (t.model % 2 ? models.treeB : models.treeA);
      const height = t.cover ? 0.9 : (t.radius || t.s * 0.35) * 0.11 + 0.8;
      placeNature(source || models.treeA || models.treeB, t.x, t.y, height, (t.model || 0) * 0.7, true);
    }
  }

  function createGrass(tufts) {
    if (!models.grass) return;
    let placed = 0;
    for (const tuft of tufts) {
      if (placed >= 24) break;
      const h = Math.max(0.36, tuft.s * 2.1 / UNIT);
      placeNature(models.grass, tuft.x, tuft.y, h, tuft.r, false);
      placed++;
    }
  }

  function makePlaneDisc(radius, color, opacity = 0.5) {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false }));
    disc.rotation.x = -Math.PI / 2;
    return disc;
  }

  function makeBillboard(width, height) {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 256;
    const context = c.getContext('2d');
    context.scale(2, 2);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false }));
    sprite.scale.set(width, height, 1);
    sprite.renderOrder = 10;
    return { canvas: c, context, texture, sprite };
  }

  function rounded(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + width, y, x + width, y + height, r); ctx.arcTo(x + width, y + height, x, y + height, r); ctx.arcTo(x, y + height, x, y, r); ctx.arcTo(x, y, x + width, y, r); ctx.closePath();
  }

  function drawNameplate(node, player) {
    const labelText = `${player.name} · ${player.score}`;
    const health = Math.max(0, Math.min(100, player.hp));
    if (node.lastName === labelText && node.lastHealth === health) return;
    const { canvas: c, context: g, texture } = node;
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = '#10251fee';
    g.strokeStyle = player.color;
    g.lineWidth = 7;
    rounded(g, 7, 7, 498, 114, 24); g.fill(); g.stroke();
    g.fillStyle = player.color; g.beginPath(); g.arc(37, 45, 13, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff8de'; g.font = '800 36px Bungee, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(labelText.slice(0, 24), 63, 46);
    g.fillStyle = '#536252'; rounded(g, 25, 78, 462, 18, 8); g.fill();
    g.fillStyle = health > 55 ? '#72d77f' : health > 25 ? '#f2c64c' : '#fa6262'; rounded(g, 25, 78, 462 * health / 100, 18, 8); g.fill();
    texture.needsUpdate = true;
    node.lastName = labelText;
    node.lastHealth = health;
  }

  function makeFallbackActor(type) {
    const group = new THREE.Group();
    const material = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts });
    const bodyColors = { PLAYER: '#f4c542', FOX: '#d57936', WOLF: '#68665e', EAGLE: '#a76c41', SNAKE: '#58a84d', BOSS: '#6f303e', MOLE: '#7c553a', TORNADO: '#b3d4db', ALIEN: '#77bb68', MAGE: '#7552b2', GHOST: '#cad7e5', PLANT: '#558f37' };
    const body = new THREE.Mesh(new THREE.SphereGeometry(type === 'BOSS' ? 0.85 : 0.43, 12, 8), material(bodyColors[type] || '#cc8050', type === 'GHOST' ? { transparent: true, opacity: 0.75 } : {}));
    body.position.y = type === 'BOSS' ? 0.82 : 0.43;
    body.scale.set(type === 'SNAKE' ? 1.5 : 1, type === 'SNAKE' ? 0.42 : 0.86, type === 'SNAKE' ? 0.7 : 0.9);
    group.add(body);
    if (type === 'TORNADO') {
      group.clear();
      for (let i = 0; i < 4; i++) {
        const swirl = new THREE.Mesh(new THREE.TorusGeometry(0.34 - i * 0.045, 0.075, 6, 18), material(i % 2 ? '#c4e6ec' : '#8dbfc9', { transparent: true, opacity: 0.82 }));
        swirl.rotation.x = Math.PI / 2; swirl.position.y = 0.22 + i * 0.28; group.add(swirl);
      }
    } else if (type === 'MOLE') {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.17, 8, 6), material('#9a7052'));
      ear.position.set(-0.24, 0.75, 0); ear.scale.y = 1.5; group.add(ear); const other = ear.clone(); other.position.x = 0.24; group.add(other);
    } else if (type === 'GHOST') {
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.55, 8), material('#d7e2ec', { transparent: true, opacity: 0.66 })); tail.position.y = -0.18; tail.rotation.x = Math.PI; group.add(tail);
    } else if (type === 'MAGE') {
      const robe = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.9, 8), material('#514282')); robe.position.y = 0.25; group.add(robe);
      const hat = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.7, 8), material('#36294f')); hat.position.y = 1.05; group.add(hat);
    } else if (type === 'ALIEN') {
      for (const x of [-0.16, 0.16]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), material('#17251d')); eye.position.set(x, 0.5, 0.36); group.add(eye); }
    } else if (type === 'PLANT') {
      group.clear(); const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.75, 7), material('#3d8535')); stem.position.y = 0.38; group.add(stem);
      for (let i = 0; i < 5; i++) { const petal = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), material(i % 2 ? '#e5b957' : '#7ea63a')); const a = i * Math.PI * 2 / 5; petal.position.set(Math.cos(a) * 0.28, 0.9, Math.sin(a) * 0.24); group.add(petal); }
    }
    if (!['TORNADO', 'PLANT', 'MAGE', 'GHOST'].includes(type)) {
      for (const x of [-0.14, 0.14]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), material('#14231c')); eye.position.set(x, 0.49, 0.37); group.add(eye); }
    }
    return group;
  }

  function actorFor(type, height, tint = null) {
    const key = ({ FOX: 'fox', WOLF: 'wolf', EAGLE: 'eagle', SNAKE: 'snake', BOSS: 'boss' })[type];
    return makeModel(key ? models[key] : null, height, tint) || makeFallbackActor(type);
  }

  function makeWeapon() {
    if (!models.rifle) {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.7), new THREE.MeshStandardMaterial({ color: '#448bad', metalness: 0.5, roughness: 0.4 }));
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 8), new THREE.MeshStandardMaterial({ color: '#35414a', metalness: 0.7, roughness: 0.35 }));
      barrel.rotation.x = Math.PI / 2; barrel.position.z = 0.46; body.add(barrel); return body;
    }
    const weapon = models.rifle.clone(true);
    const bounds = new THREE.Box3().setFromObject(weapon);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 0.88 / Math.max(size.x, size.y, size.z, 0.001);
    weapon.scale.setScalar(scale);
    weapon.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
    setupMaterial(weapon);
    return weapon;
  }

  function makePlayer(player) {
    const color = player.color || PALETTE[Math.floor(Math.random() * PALETTE.length)];
    const root = makeModel(models.chick, 1.3, color) || makeFallbackActor('PLAYER');
    root.traverse(part => { if (part.isMesh) { part.castShadow = false; part.receiveShadow = false; } });
    if (!models.chick) {
      root.clear();
      const chicken = new THREE.Mesh(new THREE.SphereGeometry(0.48, 14, 10), new THREE.MeshStandardMaterial({ color }));
      chicken.position.y = 0.47; chicken.scale.set(1, 0.92, 0.82); root.add(chicken);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8), new THREE.MeshStandardMaterial({ color: '#fff0ce' })); head.position.set(0, 0.95, 0.18); root.add(head);
    }
    root.userData.model = true;
    const aura = makePlaneDisc(0.62, color, 0.25); aura.position.y = 0.03; root.add(aura);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.57, 0.035, 8, 36), new THREE.MeshBasicMaterial({ color })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.045; root.add(ring);
    const weaponPivot = new THREE.Group(); weaponPivot.position.set(0.28, 0.55, 0.16); weaponPivot.add(makeWeapon()); root.add(weaponPivot);
    const label = makeBillboard(1.9, 0.48); label.sprite.position.set(0, 1.68, 0); root.add(label.sprite);
    const shield = new THREE.Mesh(new THREE.SphereGeometry(0.82, 16, 12), new THREE.MeshBasicMaterial({ color: '#76e8ff', wireframe: true, transparent: true, opacity: 0.45 })); shield.position.y = 0.67; shield.visible = false; root.add(shield);
    const angel = new THREE.Group(); angel.visible = false;
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.035, 8, 28), new THREE.MeshBasicMaterial({ color: '#ffe88a', emissive: '#ffe88a' })); halo.position.set(0, 1.75, 0.04); halo.rotation.x = Math.PI / 2; angel.add(halo);
    for (const side of [-1, 1]) { const wing = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 8), new THREE.MeshStandardMaterial({ color: '#fff9e9', emissive: '#e9dfc5', emissiveIntensity: 0.18, roughness: 0.65 })); wing.scale.set(1.25, 0.17, 0.72); wing.position.set(side * 0.48, 0.98, -0.12); wing.rotation.z = side * -0.3; angel.add(wing); } root.add(angel);
    scene.add(root);
    root.userData.aura = aura;
    root.userData.ring = ring;
    root.userData.weapon = weaponPivot;
    root.userData.label = label;
    root.userData.shield = shield;
    root.userData.angel = angel;
    return root;
  }

  function makeEnemy(enemy) {
    const heightByType = { BOSS: 2.25, EAGLE: 1.0, SNAKE: 0.62, WOLF: 1.25, FOX: 0.92, MOLE: 0.86, TORNADO: 1.25, ALIEN: 0.95, MAGE: 0.98, GHOST: 1.0, PLANT: 1.15 };
    const height = heightByType[enemy.type] || 0.95;
    const root = actorFor(enemy.type, height);
    root.traverse(part => { if (part.isMesh) { part.castShadow = false; part.receiveShadow = false; } });
    const health = makeBillboard(enemy.type === 'BOSS' ? 2.55 : 1.25, enemy.type === 'BOSS' ? 0.5 : 0.3);
    health.sprite.position.y = height + 0.35;
    root.add(health.sprite);
    root.userData.health = health;
    root.userData.height = height;
    root.userData.baseScale = 1;
    scene.add(root);
    return root;
  }

  function drawHealth(node, enemy) {
    const ratio = Math.max(0, enemy.hp / Math.max(1, enemy.maxHp));
    const key = `${enemy.type}:${Math.ceil(ratio * 100)}`;
    if (node.lastHealth === key) return;
    node.lastHealth = key;
    const { canvas: c, context: g, texture } = node;
    g.clearRect(0, 0, c.width, c.height);
    if (enemy.type === 'BOSS') { g.fillStyle = '#10251fee'; rounded(g, 5, 8, 502, 106, 22); g.fill(); g.fillStyle = '#ffe4a0'; g.font = '800 31px Bungee, sans-serif'; g.textAlign = 'center'; g.fillText('CHUPACABRAS', 256, 42); }
    g.fillStyle = '#263d30'; rounded(g, 24, enemy.type === 'BOSS' ? 67 : 46, 464, 28, 10); g.fill();
    g.fillStyle = enemy.type === 'BOSS' ? '#ff5360' : '#ee6260'; rounded(g, 24, enemy.type === 'BOSS' ? 67 : 46, 464 * ratio, 28, 10); g.fill();
    texture.needsUpdate = true;
  }

  function buildMap(mapData, obstacles, tufts) {
    makeGround();
    const home = actorPosition(mapData.home.x, mapData.home.y);
    if (models.house) {
      const house = makeModel(models.house, 3.1);
      house.position.copy(home); house.rotation.y = Math.PI; scene.add(house);
    } else {
      const house = new THREE.Mesh(new THREE.BoxGeometry(3.3, 2.7, 2.7), new THREE.MeshStandardMaterial({ color: '#86593a' })); house.position.set(0, 1.35, 0); house.castShadow = true; scene.add(house);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.5, 4), new THREE.MeshStandardMaterial({ color: '#b64e3d' })); roof.position.set(0, 3.25, 0); roof.rotation.y = Math.PI / 4; roof.castShadow = true; scene.add(roof);
    }
    if (models.mama) {
      const mama = makeModel(models.mama, 1.45);
      mama.position.copy(actorPosition(mapData.home.x, mapData.home.y + 92)); mama.rotation.y = Math.PI; scene.add(mama); farmBar = makeBillboard(4.0, 1.0); farmBar.sprite.position.set(0, 5.05, 0); scene.add(farmBar.sprite); farmBarCanvas = farmBar.canvas;
    }
    if (models.egg) for (const [dx, dy, size] of [[-38,56,.34],[0,62,.38],[38,56,.34]]) {
      const egg = makeModel(models.egg, size); egg.position.copy(actorPosition(mapData.home.x + dx, mapData.home.y + dy)); scene.add(egg);
    }
    createMapTrees(obstacles);
    createGrass(tufts);
    const boundary = new THREE.Mesh(new THREE.BoxGeometry(mapData.w / UNIT, 0.04, mapData.h / UNIT), new THREE.EdgesGeometry(new THREE.BoxGeometry(mapData.w / UNIT - 0.5, 0.02, mapData.h / UNIT - 0.5)));
    boundary.material = new THREE.LineBasicMaterial({ color: '#d6c17d', transparent: true, opacity: 0.36 });
    boundary.position.y = 0.02; scene.add(boundary);
    countdownSprite = makeBillboard(4.2, 2.1); countdownSprite.sprite.position.set(0, 8.2, 0); scene.add(countdownSprite.sprite); countdownCanvas = countdownSprite.canvas;
  }

  function updateFarmBar(hp, henFlash, now) {
    if (!farmBar || lastFarmValue === Math.ceil(hp) && farmBar.sprite.userData.hit === henFlash) return;
    lastFarmValue = Math.ceil(hp); farmBar.sprite.userData.hit = henFlash;
    const { canvas: c, context: g, texture } = farmBar;
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = '#10251fee'; rounded(g, 5, 8, 502, 110, 20); g.fill();
    g.fillStyle = '#fff7dc'; g.font = '850 29px Rye, Georgia, serif'; g.textAlign = 'center'; g.fillText(`MAMA HEN · ${Math.ceil(hp)}%`, 256, 42);
    g.fillStyle = '#263d30'; rounded(g, 28, 65, 456, 34, 10); g.fill();
    g.fillStyle = henFlash && Math.floor(now / 70) % 2 === 0 ? '#ff3546' : '#53d57a'; rounded(g, 31, 68, 450 * Math.max(0, hp) / 100, 28, 8); g.fill();
    texture.needsUpdate = true;
  }

  function syncPlayers(players, now, dt, lobby = false) {
    const seen = new Set();
    for (const player of players.values()) {
      seen.add(player.id);
      let node = playerNodes.get(player.id);
      if (!node) { node = makePlayer(player); playerNodes.set(player.id, node); }
      const position = actorPosition(player.x, player.y);
      node.position.x += (position.x - node.position.x) * Math.min(1, dt * 13);
      node.position.z += (position.z - node.position.z) * Math.min(1, dt * 13);
      node.position.y = 0.035 + Math.sin(now / 170 + player.x) * 0.018;
      node.rotation.y = Math.PI / 2 - player.aim;node.scale.setScalar(lobby && player.hp>0 ? 1.55 : 1);
      node.userData.shield.visible = now < (player.effects.SHIELD || 0);
      const hit = player.lastHit > 0 && now - player.lastHit < 460 && Math.floor(now / 65) % 2 === 0;
      node.userData.aura.material.color.set(hit ? '#ff273b' : player.color);
      node.userData.ring.material.color.set(hit ? '#ff273b' : player.color);
      drawNameplate(node.userData.label, player);
      const dead = player.hp <= 0;node.userData.angel.visible = dead;node.userData.shield.visible = !dead && now < (player.effects.SHIELD || 0);node.userData.weapon.visible = !dead;node.visible = player.connected !== false || dead;
      if (dead) { const t = Math.max(0, (now - (player.deathAt || now)) / 1000);node.position.y = 0.12 + Math.min(1.7,t * 0.42) + Math.sin(now / 130) * 0.06;node.rotation.z = Math.sin(now / 210) * 0.04;node.userData.angel.rotation.z = Math.sin(now / 95) * 0.2;node.userData.angel.rotation.y = Math.sin(now / 600) * 0.2;node.userData.aura.material.color.set('#fff0a6');node.userData.ring.material.color.set('#fff0a6')}else {node.position.y = 0.035 + Math.sin(now / 170 + player.x) * 0.018;node.rotation.z = 0;}
    }
    for (const [id, node] of playerNodes) if (!seen.has(id)) { scene.remove(node); playerNodes.delete(id); }
  }

  function syncEnemies(enemies, now, dt) {
    const seen = new Set();
    for (const enemy of enemies) {
      seen.add(enemy);
      let node = enemyNodes.get(enemy);
      if (!node) { node = makeEnemy(enemy); enemyNodes.set(enemy, node); }
      const position = actorPosition(enemy.x, enemy.y);
      node.position.set(position.x, enemy.type === 'TORNADO' ? (enemy.visualScale || 1) * 0.08 : 0, position.z);
      node.rotation.y = enemy.type === 'TORNADO' ? Math.PI / 2 - enemy.travelAngle : enemy.type === 'EAGLE' ? Math.PI / 2 - (enemy.dashUntil > now ? Math.atan2(enemy.dashY-enemy.y, enemy.dashX-enemy.x) : Math.PI / 2) : 0;
      const jump = enemy.type === 'FOX' && now < enemy.jumpUntil ? Math.sin((enemy.jumpUntil - now) / 360 * Math.PI) * 0.75 : 0;
      node.position.y += jump;
      const size = enemy.type === 'TORNADO' ? 0.45 + (enemy.visualScale || 0.35) * 0.65 : 1;
      node.scale.setScalar(size);
      if (enemy.type === 'TORNADO' && enemy.launchAt > now) {
        node.position.y = 0.5 + size;
        node.rotation.y = Math.PI / 2 - enemy.travelAngle;
      }
      const hitFlash = now < (enemy.hitUntil || 0) && Math.floor(now / 45) % 2 === 0;
      if (node.userData.materialColors === undefined) { node.userData.materialColors = []; node.traverse(part => { if (part.isMesh) for (const mat of (Array.isArray(part.material) ? part.material : [part.material])) if (mat?.color) node.userData.materialColors.push({ mat, color: mat.color.clone() }); }); }
      for (const entry of node.userData.materialColors) entry.mat.color.copy(hitFlash ? new THREE.Color('#ff5b5b') : entry.color);
      node.userData.health.sprite.visible = enemy.type === 'BOSS' || enemy.hp < enemy.maxHp;
      drawHealth(node.userData.health, enemy);
      if (enemy.type === 'MAGE' && now < (enemy.teleportUntil || 0)) node.rotation.y += now / 300;
    }
    for (const [enemy, node] of enemyNodes) if (!seen.has(enemy)) { scene.remove(node); enemyNodes.delete(enemy); }
  }

  function sphere(color, radius, emissive = color) {
    return new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 8), new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: 0.45, roughness: 0.35 }));
  }

  function syncProjectiles(kind, items, pool, now) {
    const seen = new Set();
    for (const item of items) {
      seen.add(item);
      let node = pool.get(item);
      if (!node) {
        if (kind === 'shot') node = sphere('#fff1a2', 0.105, '#e9b942');
        else if (kind === 'drop') {
          if (item.type === 'MEDKIT') {
            node = new THREE.Group();
            const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.3), new THREE.MeshStandardMaterial({ color: '#fff', roughness: 0.7 })); box.castShadow = true; node.add(box);
            const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.28, 0.035), new THREE.MeshBasicMaterial({ color: '#d52d39' })); crossV.position.z = 0.17; node.add(crossV);
            const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.09, 0.035), new THREE.MeshBasicMaterial({ color: '#d52d39' })); crossH.position.z = 0.17; node.add(crossH);
          } else if (item.type === 'DOUBLE') { node = new THREE.Group();const mat=new THREE.MeshBasicMaterial({color:'#ffd95d',emissive:'#f2a900'});for(const side of [-1,1]){const orb=new THREE.Mesh(new THREE.SphereGeometry(.18,10,8),mat);orb.position.x=side*.17;node.add(orb)}
          } else if (item.type === 'RAPID') { node = new THREE.Group();const bolt=new THREE.Mesh(new THREE.ConeGeometry(.2,.62,5),new THREE.MeshBasicMaterial({color:'#8ceaff',emissive:'#28a9dc'}));bolt.rotation.z=-.2;node.add(bolt);
          } else { node = new THREE.Group(); const orb = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8), new THREE.MeshBasicMaterial({ color: '#81ddf5', wireframe: true })); node.add(orb);
          }
        } else if (kind === 'fireball') node = sphere(item.kind === 'seed' ? '#b8ed53' : '#ff552d', item.kind === 'seed' ? 0.16 : 0.22, item.kind === 'seed' ? '#b8ed53' : '#ff2600');
        else node = new THREE.Group();
        pool.set(item, node); scene.add(node);
      }
      if (kind === 'beam') {
        const a = actorPosition(item.x1, item.y1, 0.7), b = actorPosition(item.x2, item.y2, 0.7);
        node.clear(); const geometry = new THREE.BufferGeometry().setFromPoints([a, b]);
        const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: item.color || '#7cfff0', transparent: true, opacity: Math.min(1, item.t / 0.24) })); node.add(line);
      } else {
        const position = actorPosition(item.x, item.y, kind === 'shot' ? 0.36 : 0.22 + Math.sin(now / 120) * 0.05);
        node.position.copy(position);
        if (kind === 'drop') { node.rotation.y += 0.025; node.scale.setScalar(1 + Math.sin(now / 130) * 0.08); }
      }
    }
    for (const [item, node] of pool) if (!seen.has(item)) { scene.remove(node); pool.delete(item); }
  }


  function syncBlood(items, now) {
    const seen = new Set();
    for (const item of items) {
      seen.add(item);
      let group = bloodNodes.get(item);
      if (!group) {
        group = new THREE.Group();
        const red = new THREE.MeshBasicMaterial({ color: '#a91f25', transparent: true, opacity: 0.78, depthWrite: false });
        const bright = new THREE.MeshBasicMaterial({ color: '#df3832', transparent: true, opacity: 0.82, depthWrite: false });
        const center = new THREE.Mesh(new THREE.CircleGeometry(0.28, 12), red); center.rotation.x = -Math.PI / 2; center.position.y = 0.035; group.add(center);
        for (let i = 0; i < 7; i++) { const drop = new THREE.Mesh(new THREE.CircleGeometry(i % 3 === 0 ? 0.085 : 0.055, 8), i % 2 ? bright : red); const a = item.seed * 0.001 + i * 2.399, r = 0.28 + ((i * 37) % 100) / 100 * 0.48; drop.rotation.x = -Math.PI / 2; drop.position.set(Math.cos(a) * r, 0.038, Math.sin(a) * r); group.add(drop); }
        bloodNodes.set(item, group); scene.add(group);
      }
      group.position.copy(actorPosition(item.x, item.y));
      const fade = Math.min(1, item.life / 2.4);group.children.forEach(mesh => { mesh.material.opacity = 0.82 * fade; });
    }
    for (const [item, group] of bloodNodes) if (!seen.has(item)) { scene.remove(group); group.traverse(obj => { obj.geometry?.dispose(); }); bloodNodes.delete(item); }
  }

  function updateCountdown(countdown, wave) {
    if (!countdownSprite) return;
    const value = countdown > 0 ? `${wave}\n${Math.ceil(countdown)}` : '';
    if (value === lastCountdown) return;
    lastCountdown = value;
    const { canvas: c, context: g, texture } = countdownSprite;
    g.clearRect(0, 0, c.width, c.height);
    if (value) {
      g.fillStyle = '#10251feb'; rounded(g, 7, 7, 498, 114, 24); g.fill(); g.strokeStyle = '#f4d579'; g.lineWidth = 5; g.stroke();
      g.fillStyle = '#f4d579'; g.font = '800 24px Bungee, sans-serif'; g.textAlign = 'center'; g.fillText(`WAVE ${wave} · GET READY`, 256, 39);
      g.fillStyle = '#fff'; g.font = '900 63px Bungee, sans-serif'; g.fillText(String(Math.ceil(countdown)), 256, 99);
    }
    texture.needsUpdate = true;
    countdownSprite.sprite.visible = !!value;
  }

  function updateCamera(players, dt) {
    const living = [...players.values()].filter(player => player.hp > 0);
    let cx = world.home.x, cy = world.home.y;
    if (living.length) {
      const mx = living.reduce((sum, player) => sum + player.x, 0) / living.length;
      const my = living.reduce((sum, player) => sum + player.y, 0) / living.length;
      cx = mx * 0.67 + world.home.x * 0.33;
      cy = my * 0.67 + world.home.y * 0.33;
    }
    let spread = Math.hypot(cx - world.home.x, cy - world.home.y) / UNIT;
    for (const player of living) spread = Math.max(spread, Math.hypot(cx - player.x, cy - player.y) / UNIT);
    const targetDistance = THREE.MathUtils.clamp(27 + spread * 1.35, 27, 56);
    cameraDistance += (targetDistance - cameraDistance) * Math.min(1, dt * 1.6);
    const desired = actorPosition(cx, cy, 0.8);
    target.lerp(desired, Math.min(1, dt * 2.5));
    camera.position.set(target.x, target.y + cameraDistance * 0.78, target.z + cameraDistance * 0.62);
    camera.lookAt(target);
  }

  function resize() {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();
  const readyPromise = loadModels();

  return {
    ready: readyPromise,
    resize,
    render(state, dt, now) {
      if (ready) {
        syncPlayers(state.players, now, dt, !!state.lobby);
        syncEnemies(state.enemies, now, dt);
        syncProjectiles('shot', state.shots, projectileNodes, now);
        syncProjectiles('fireball', state.fireballs, fireballNodes, now);
        syncProjectiles('drop', state.drops, dropNodes, now);
        syncProjectiles('beam', state.enemyBeams, beamNodes, now);
        syncBlood(state.bloodSplats || [], now);
        const henFlash = state.henLastHit > 0 && now - state.henLastHit < 500;
        updateFarmBar(state.farmHp, henFlash, now);
        updateCountdown(state.countdown, state.wave);
        updateCamera(state.players, dt);
      }
      renderer.render(scene, camera);
    }
  };
}

