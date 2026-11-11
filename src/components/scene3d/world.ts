import * as THREE from "three";
import { hexToNumber, SECTIONS, type SectionId, type SectionMeta } from "@/data/sections";

export const WORLD_RADIUS = 34;
export const PLAYER_HEIGHT = 1.7;
const PATH_WIDTH = 2.6;

/** Where each pavilion sits around the central plaza (polar coordinates, degrees). */
const LAYOUT: Record<SectionId, { angle: number; radius: number }> = {
  about: { angle: 90, radius: 24 },
  forma: { angle: 18, radius: 24 },
  skills: { angle: -54, radius: 24 },
  projects: { angle: 198, radius: 27 },
  contact: { angle: 270, radius: 24 },
};

export type Pavilion = {
  meta: SectionMeta;
  angleRad: number;
  radius: number;
  pos: THREE.Vector3;
  centerpiece: THREE.Object3D;
  ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  light: THREE.PointLight;
};

export type Collider = { x: number; z: number; r: number };

export type World = {
  pavilions: Pavilion[];
  colliders: Collider[];
  /** Advances every ambient animation. `nearId` highlights the pavilion the player stands by. */
  update: (dt: number, t: number, nearId: SectionId | null, visited: ReadonlySet<SectionId>) => void;
  dispose: () => void;
};

const polar = (angleRad: number, radius: number) =>
  new THREE.Vector3(Math.cos(angleRad) * radius, 0, Math.sin(angleRad) * radius);

/** Deterministic PRNG: the forest looks the same on every visit and in every screenshot. */
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const buildWorld = (
  scene: THREE.Scene,
  { shadows, photoUrl }: { shadows: boolean; photoUrl: string }
): World => {
  const rand = seeded(42);
  const textures: THREE.Texture[] = [];
  const canvasTexture = (w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void) => {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    paint(canvas.getContext("2d")!);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.push(texture);
    return texture;
  };
  const cast = <T extends THREE.Object3D>(object: T) => {
    object.castShadow = shadows;
    return object;
  };

  scene.fog = new THREE.FogExp2(0xbfe0f7, 0.013);

  // ---- Sky ----
  const skyTexture = canvasTexture(2, 256, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, "#2f7fe0");
    gradient.addColorStop(0.45, "#79b8f2");
    gradient.addColorStop(0.75, "#bfe0f7");
    gradient.addColorStop(1, "#e6f3fc");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);
  });
  scene.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(280, 32, 32),
      new THREE.MeshBasicMaterial({ map: skyTexture, side: THREE.BackSide, fog: false })
    )
  );

  const softDisc = (inner: string, mid: string) =>
    canvasTexture(256, 256, (ctx) => {
      const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      gradient.addColorStop(0, inner);
      gradient.addColorStop(0.6, mid);
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 256, 256);
    });

  const cloudTexture = softDisc("rgba(255,255,255,0.9)", "rgba(255,255,255,0.4)");
  const clouds: THREE.Sprite[] = [];
  const cloudSpecs: [number, number, number, number][] = [
    [-90, 55, -120, 130],
    [130, 62, -80, 110],
    [-40, 68, 140, 150],
    [100, 50, 130, 100],
    [20, 72, -160, 120],
    [-150, 58, 30, 140],
  ];
  for (const [x, y, z, scale] of cloudSpecs) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: cloudTexture, transparent: true, depthWrite: false, fog: false, opacity: 0.8 })
    );
    sprite.position.set(x, y, z);
    sprite.scale.set(scale, scale * 0.5, 1);
    scene.add(sprite);
    clouds.push(sprite);
  }

  const sunDirection = new THREE.Vector3(35, 55, 20).normalize();
  const sun = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: softDisc("rgba(255,250,225,1)", "rgba(255,236,170,0.35)"),
      transparent: true,
      depthWrite: false,
      fog: false,
    })
  );
  sun.position.copy(sunDirection).multiplyScalar(240);
  sun.scale.set(90, 90, 1);
  scene.add(sun);

  // ---- Lights ----
  scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x4f6b45, 1.2));
  const sunLight = new THREE.DirectionalLight(0xfff1d6, 1.6);
  sunLight.position.copy(sunDirection).multiplyScalar(80);
  if (shadows) {
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(2048, 2048);
    const cam = sunLight.shadow.camera;
    cam.left = cam.bottom = -WORLD_RADIUS - 6;
    cam.right = cam.top = WORLD_RADIUS + 6;
    cam.near = 10;
    cam.far = 180;
    sunLight.shadow.bias = -0.0006;
    sunLight.shadow.normalBias = 0.04;
  }
  scene.add(sunLight);

  // ---- Distant mountains: a ring of low-poly peaks that gives the horizon a shape ----
  const mountainGeometry = new THREE.ConeGeometry(1, 1, 5);
  const mountains = new THREE.InstancedMesh(
    mountainGeometry,
    new THREE.MeshStandardMaterial({ color: 0x7fa6cf, roughness: 1, flatShading: true, fog: false }),
    22
  );
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 22; i++) {
    const angle = (i / 22) * Math.PI * 2 + rand() * 0.2;
    const distance = 120 + rand() * 50;
    const height = 28 + rand() * 46;
    dummy.position.set(Math.cos(angle) * distance, height / 2 - 4, Math.sin(angle) * distance);
    dummy.scale.set(26 + rand() * 30, height, 26 + rand() * 30);
    dummy.rotation.y = rand() * Math.PI;
    dummy.updateMatrix();
    mountains.setMatrixAt(i, dummy.matrix);
  }
  scene.add(mountains);

  // ---- Ground ----
  const grassTexture = canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = "#3d7a4a";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2600; i++) {
      const shade = rand();
      ctx.fillStyle =
        shade < 0.4 ? "rgba(60,120,70,0.5)" : shade < 0.75 ? "rgba(90,150,95,0.4)" : "rgba(130,180,110,0.3)";
      const s = 1.5 + rand() * 3;
      ctx.fillRect(rand() * 512, rand() * 512, s, s);
    }
  });
  grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
  grassTexture.repeat.set(24, 24);
  grassTexture.anisotropy = 8;

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(WORLD_RADIUS + 60, 72),
    new THREE.MeshStandardMaterial({ map: grassTexture, color: 0x6aa56f, roughness: 0.95 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = shadows;
  scene.add(floor);

  const boundary = new THREE.Mesh(
    new THREE.RingGeometry(WORLD_RADIUS - 0.25, WORLD_RADIUS, 96),
    new THREE.MeshBasicMaterial({ color: 0x6e63f0, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
  );
  boundary.rotation.x = -Math.PI / 2;
  boundary.position.y = 0.03;
  scene.add(boundary);

  // ---- Paths ----
  const pathBase = canvasTexture(128, 256, (ctx) => {
    ctx.fillStyle = "#3a4566";
    ctx.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 320; i++) {
      ctx.fillStyle = rand() > 0.5 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.14)";
      ctx.fillRect(rand() * 128, rand() * 256, 2 + rand() * 4, 2 + rand() * 4);
    }
  });

  const pavilions: Pavilion[] = [];
  const colliders: Collider[] = [];
  const labels: THREE.Sprite[] = [];

  const addLabel = (text: string, position: THREE.Vector3, color: string, scale = 1) => {
    const texture = canvasTexture(768, 128, (ctx) => {
      ctx.font = "600 54px 'Space Grotesk', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineWidth = 10;
      ctx.strokeStyle = "rgba(10,12,34,0.85)";
      ctx.strokeText(text, 384, 64);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(text, 384, 64);
      ctx.fillStyle = color;
      ctx.fillRect(384 - 60, 108, 120, 6);
    });
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    sprite.scale.set(7.2 * scale, 1.2 * scale, 1);
    sprite.position.copy(position);
    scene.add(sprite);
    labels.push(sprite);
  };

  const pathBlockers: { angleRad: number; startR: number; endR: number }[] = [];

  for (const meta of SECTIONS) {
    const { angle, radius } = LAYOUT[meta.id];
    const angleRad = (angle * Math.PI) / 180;
    const color = hexToNumber(meta.color);
    const pos = polar(angleRad, radius);

    // Walkway from the plaza to the pavilion. Each path gets its own texture
    // clone: they have different lengths and therefore different repeats.
    const startR = 3.6;
    const endR = radius - 3.8;
    const length = endR - startR;
    const pathTexture = pathBase.clone();
    pathTexture.wrapS = pathTexture.wrapT = THREE.RepeatWrapping;
    pathTexture.repeat.set(length / 3, 1);
    pathTexture.needsUpdate = true;
    textures.push(pathTexture);

    const path = new THREE.Group();
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(length, PATH_WIDTH),
      new THREE.MeshStandardMaterial({ map: pathTexture, roughness: 0.9 })
    );
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = shadows;
    path.add(plane);
    const edgeMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7 });
    for (const side of [1, -1]) {
      const edge = new THREE.Mesh(new THREE.PlaneGeometry(length, 0.1), edgeMaterial);
      edge.rotation.x = -Math.PI / 2;
      edge.position.set(0, 0.012, (side * PATH_WIDTH) / 2);
      path.add(edge);
    }
    path.position.copy(polar(angleRad, (startR + endR) / 2)).setY(0.03);
    path.rotation.y = -angleRad;
    scene.add(path);
    pathBlockers.push({ angleRad, startR: startR - 1.5, endR: endR + 1.5 });

    // Lamp posts along the way
    for (const t of [0.3, 0.7]) {
      for (const side of [1, -1]) {
        const at = polar(angleRad, startR + length * t);
        at.x += Math.cos(angleRad + Math.PI / 2) * side * (PATH_WIDTH / 2 + 0.5);
        at.z += Math.sin(angleRad + Math.PI / 2) * side * (PATH_WIDTH / 2 + 0.5);
        const post = cast(
          new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.07, 1.5, 8),
            new THREE.MeshStandardMaterial({ color: 0x2a3050, roughness: 0.6, metalness: 0.4 })
          )
        );
        post.position.copy(at).setY(0.75);
        scene.add(post);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), new THREE.MeshBasicMaterial({ color }));
        bulb.position.copy(at).setY(1.6);
        scene.add(bulb);
      }
    }

    // ---- Pavilion ----
    const group = new THREE.Group();
    group.position.copy(pos);
    // Local +X points away from the plaza, so the gap between two columns faces the path.
    group.rotation.y = -angleRad;
    scene.add(group);

    const pad = new THREE.Mesh(
      new THREE.CylinderGeometry(3.6, 3.9, 0.3, 48),
      new THREE.MeshStandardMaterial({ color: 0x1a2040, emissive: color, emissiveIntensity: 0.18, roughness: 0.5 })
    );
    pad.position.y = 0.15;
    pad.receiveShadow = shadows;
    group.add(cast(pad));

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(3.95, 4.4, 64),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    group.add(ring);

    // Columns and an open roof, so it reads as a pavilion rather than a floating shape.
    const columnMaterial = new THREE.MeshStandardMaterial({ color: 0xe9ecf7, roughness: 0.45, metalness: 0.1 });
    const columnGeometry = new THREE.CylinderGeometry(0.13, 0.16, 4.2, 12);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const column = cast(new THREE.Mesh(columnGeometry, columnMaterial));
      column.position.set(Math.cos(a) * 3.2, 2.4, Math.sin(a) * 3.2);
      group.add(column);
    }
    const beam = cast(
      new THREE.Mesh(
        new THREE.TorusGeometry(3.2, 0.14, 8, 6),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.35, roughness: 0.4 })
      )
    );
    beam.rotation.x = Math.PI / 2;
    beam.rotation.z = Math.PI / 6;
    beam.position.y = 4.5;
    group.add(beam);
    const roof = cast(
      new THREE.Mesh(
        new THREE.ConeGeometry(3.7, 1.3, 6, 1, true),
        new THREE.MeshStandardMaterial({ color: 0x1a2040, roughness: 0.6, side: THREE.DoubleSide, flatShading: true })
      )
    );
    roof.rotation.y = Math.PI / 6;
    roof.position.y = 5.25;
    group.add(roof);

    const solid = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.45,
      roughness: 0.3,
      metalness: 0.45,
    });
    const wire = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.6 });

    const centerpiece = new THREE.Group();
    if (meta.id === "about") {
      const gem = cast(new THREE.Mesh(new THREE.OctahedronGeometry(1.15, 0), solid));
      gem.position.y = 2.4;
      centerpiece.add(gem);
    } else if (meta.id === "forma") {
      for (let i = 0; i < 3; i++) {
        const torus = cast(new THREE.Mesh(new THREE.TorusGeometry(1.0 - i * 0.2, 0.1, 12, 36), solid));
        torus.position.y = 1.6 + i * 0.8;
        torus.rotation.x = Math.PI / 2;
        centerpiece.add(torus);
      }
    } else if (meta.id === "skills") {
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.8, 0), wire);
      core.position.y = 2.4;
      centerpiece.add(core);
      for (let i = 0; i < 6; i++) {
        const cube = cast(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), solid));
        cube.userData.orbit = { a: (i / 6) * Math.PI * 2, r: 1.6, speed: 0.6 + rand() * 0.4 };
        centerpiece.add(cube);
      }
    } else if (meta.id === "projects") {
      for (let i = 0; i < 5; i++) {
        const panel = cast(new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.15, 0.07), solid));
        const a = (i / 5) * Math.PI * 2;
        panel.position.set(Math.cos(a) * 1.7, 2.3, Math.sin(a) * 1.7);
        panel.lookAt(0, 2.3, 0);
        centerpiece.add(panel);
      }
    } else {
      const pole = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 2.4, 16), solid));
      pole.position.y = 1.5;
      centerpiece.add(pole);
      const orb = cast(new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 24), solid));
      orb.position.y = 3.0;
      centerpiece.add(orb);
      for (let i = 0; i < 2; i++) {
        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.7 + i * 0.3, 0.025, 8, 40), wire);
        halo.position.y = 3.0;
        halo.rotation.x = Math.PI / 2.3;
        halo.userData.spin = 0.6 + i * 0.3;
        centerpiece.add(halo);
      }
    }
    group.add(centerpiece);

    const light = new THREE.PointLight(color, 7, 16, 1.6);
    light.position.set(0, 3, 0);
    group.add(light);

    addLabel(meta.name.toUpperCase(), pos.clone().setY(6.9), meta.color);

    pavilions.push({ meta, angleRad, radius, pos, centerpiece, ring, light });
    colliders.push({ x: pos.x, z: pos.z, r: 4.3 });
  }

  // ---- Central plaza ----
  const plaza = new THREE.Mesh(
    new THREE.CylinderGeometry(3.4, 3.8, 0.4, 48),
    new THREE.MeshStandardMaterial({ color: 0x1a2040, emissive: 0x201c5c, emissiveIntensity: 0.35, roughness: 0.5 })
  );
  plaza.position.y = 0.2;
  plaza.receiveShadow = shadows;
  scene.add(cast(plaza));
  colliders.push({ x: 0, z: 0, r: 4.3 });

  const core = cast(
    new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.3, 0),
      new THREE.MeshStandardMaterial({ color: 0x6e63f0, emissive: 0x3a33b8, emissiveIntensity: 0.7, wireframe: true })
    )
  );
  core.position.set(0, 3.2, 0);
  scene.add(core);
  const coreLight = new THREE.PointLight(0x6e63f0, 20, 30, 1.6);
  coreLight.position.copy(core.position);
  scene.add(coreLight);
  addLabel("JONAS ESTEVES", new THREE.Vector3(0, 5.3, 0), "#6e63f0", 0.9);

  // Portrait medallion: a thin box (not a billboard) so it visibly turns as it spins.
  const photoTexture = new THREE.TextureLoader().load(photoUrl);
  photoTexture.colorSpace = THREE.SRGBColorSpace;
  textures.push(photoTexture);
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x6e63f0,
    emissive: 0x2e2a8f,
    emissiveIntensity: 0.5,
    roughness: 0.4,
    metalness: 0.3,
  });
  const faceMaterial = new THREE.MeshBasicMaterial({ map: photoTexture });
  const photo = cast(
    new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.7, 0.16), [
      frameMaterial,
      frameMaterial,
      frameMaterial,
      frameMaterial,
      faceMaterial,
      faceMaterial,
    ])
  );
  photo.position.set(0, 7.2, 0);
  scene.add(photo);
  const photoRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.3, 0.035, 8, 48),
    new THREE.MeshBasicMaterial({ color: 0x6e63f0, transparent: true, opacity: 0.6 })
  );
  photoRing.position.copy(photo.position);
  scene.add(photoRing);

  // ---- Forest: instanced, so 70 trees cost four draw calls instead of ~250 ----
  const isBlocked = (x: number, z: number) => {
    const r = Math.hypot(x, z);
    if (r < 7) return true;
    for (const p of pavilions) if (Math.hypot(x - p.pos.x, z - p.pos.z) < 7) return true;
    const pointAngle = Math.atan2(z, x);
    for (const blocker of pathBlockers) {
      let delta = pointAngle - blocker.angleRad;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      if (r > blocker.startR && r < blocker.endR && Math.abs(delta) * r < PATH_WIDTH + 0.6) return true;
    }
    return false;
  };

  const TREE_COUNT = 70;
  const trunkMesh = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.12, 0.2, 1.4, 6),
    new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: 0.9 }),
    TREE_COUNT
  );
  const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, flatShading: true });
  const tiers = [0, 1, 2].map(
    (i) => new THREE.InstancedMesh(new THREE.ConeGeometry(1.15 - i * 0.24, 1.5, 7), foliageMaterial, TREE_COUNT)
  );
  const leafColor = new THREE.Color();
  let planted = 0;
  for (let attempts = 0; planted < TREE_COUNT && attempts < 900; attempts++) {
    const angle = rand() * Math.PI * 2;
    const r = 7 + rand() * (WORLD_RADIUS + 12);
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    if (isBlocked(x, z)) continue;

    const scale = 0.8 + rand() * 0.8;
    const turn = rand() * Math.PI * 2;
    dummy.rotation.set(0, turn, 0);
    dummy.scale.setScalar(scale);
    dummy.position.set(x, 0.7 * scale, z);
    dummy.updateMatrix();
    trunkMesh.setMatrixAt(planted, dummy.matrix);
    leafColor.setHSL(0.36 + rand() * 0.06, 0.45 + rand() * 0.15, 0.27 + rand() * 0.1);
    tiers.forEach((tier, i) => {
      dummy.position.set(x, (1.5 + i * 0.95) * scale, z);
      dummy.updateMatrix();
      tier.setMatrixAt(planted, dummy.matrix);
      tier.setColorAt(planted, leafColor);
    });
    if (r < WORLD_RADIUS) colliders.push({ x, z, r: 0.45 * scale + 0.35 });
    planted++;
  }
  for (const mesh of [trunkMesh, ...tiers]) {
    mesh.count = planted;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = shadows;
    mesh.receiveShadow = shadows;
    scene.add(mesh);
  }

  // ---- Floating pollen: cheap life in the air ----
  const POLLEN = 260;
  const pollenPositions = new Float32Array(POLLEN * 3);
  for (let i = 0; i < POLLEN; i++) {
    const angle = rand() * Math.PI * 2;
    const r = rand() * (WORLD_RADIUS + 6);
    pollenPositions[i * 3] = Math.cos(angle) * r;
    pollenPositions[i * 3 + 1] = 0.6 + rand() * 6;
    pollenPositions[i * 3 + 2] = Math.sin(angle) * r;
  }
  const pollenGeometry = new THREE.BufferGeometry();
  pollenGeometry.setAttribute("position", new THREE.BufferAttribute(pollenPositions, 3));
  const pollen = new THREE.Points(
    pollenGeometry,
    new THREE.PointsMaterial({ color: 0xfffbe0, size: 0.09, transparent: true, opacity: 0.85, depthWrite: false })
  );
  scene.add(pollen);

  const update: World["update"] = (dt, t, nearId, visited) => {
    core.rotation.y += dt * 0.4;
    core.rotation.x += dt * 0.15;
    core.position.y = 3.2 + Math.sin(t * 0.8) * 0.15;
    photo.rotation.y += dt * 0.35;
    photo.position.y = 7.2 + Math.sin(t * 1.1) * 0.18;
    photoRing.rotation.z += dt * 0.5;
    photoRing.position.y = photo.position.y;

    pollen.rotation.y += dt * 0.012;
    pollen.position.y = Math.sin(t * 0.4) * 0.25;
    clouds.forEach((cloud, i) => {
      cloud.position.x += dt * (0.5 + i * 0.12);
      if (cloud.position.x > 220) cloud.position.x = -220;
    });

    for (const p of pavilions) {
      const near = p.meta.id === nearId;
      const seen = visited.has(p.meta.id);
      const pulse = near ? 0.65 + Math.sin(t * 5) * 0.25 : seen ? 0.22 : 0.4 + Math.sin(t * 1.5 + p.angleRad) * 0.08;
      p.ring.material.opacity += (pulse - p.ring.material.opacity) * Math.min(1, dt * 8);
      const targetScale = near ? 1.12 : 1;
      p.ring.scale.x = p.ring.scale.y += (targetScale - p.ring.scale.x) * Math.min(1, dt * 6);
      p.light.intensity = near ? 12 : 7;

      const piece = p.centerpiece;
      const speed = near ? 2.2 : 1;
      if (p.meta.id === "skills") {
        for (const child of piece.children) {
          const orbit = child.userData.orbit as { a: number; r: number; speed: number } | undefined;
          if (orbit) {
            orbit.a += dt * orbit.speed * speed;
            child.position.set(Math.cos(orbit.a) * orbit.r, 2.4 + Math.sin(t * 1.5 + orbit.a) * 0.3, Math.sin(orbit.a) * orbit.r);
            child.rotation.x += dt;
            child.rotation.y += dt * 1.3;
          } else {
            child.rotation.y += dt * 0.5 * speed;
          }
        }
      } else if (p.meta.id === "forma") {
        piece.children.forEach((torus, i) => {
          torus.rotation.z += dt * (0.3 + i * 0.1) * speed;
          torus.position.y = 1.6 + i * 0.8 + Math.sin(t * 1.2 + i) * 0.08;
        });
      } else if (p.meta.id === "contact") {
        for (const child of piece.children) {
          const spin = child.userData.spin as number | undefined;
          if (spin) child.rotation.z += dt * spin * speed;
        }
        piece.position.y = Math.sin(t * 1.2) * 0.1;
      } else {
        piece.rotation.y += dt * (p.meta.id === "projects" ? 0.25 : 0.5) * speed;
        piece.position.y = Math.sin(t + p.angleRad) * 0.1;
      }
    }
  };

  const dispose = () => {
    const materials = new Set<THREE.Material>();
    const geometries = new Set<THREE.BufferGeometry>();
    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) geometries.add(mesh.geometry);
      const material = (mesh as { material?: THREE.Material | THREE.Material[] }).material;
      if (Array.isArray(material)) material.forEach((m) => materials.add(m));
      else if (material) materials.add(material);
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((tx) => tx.dispose());
    scene.clear();
  };

  return { pavilions, colliders, update, dispose };
};
