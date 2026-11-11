import * as THREE from "three";
import { PARTICLE_FRAGMENT, PARTICLE_VERTEX } from "@/components/particles/ParticleStage";
import { atom, galaxy, gallery, helix, paperPlane, portrait, seeded, sphere, type Shape } from "@/components/particles/shapes";
import { hexToNumber, SECTIONS, type SectionId } from "@/data/sections";
import { EYE_HEIGHT, type Explorer } from "@/game3d/explorer";
import { BRIDGE_WIDTH, HUB_RADIUS, ISLAND_RADIUS, PORTAL_RADIUS } from "@/game3d/world";

type Monument = {
  points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  spins: boolean;
  baseRotation: number;
  progress: number;
  beam: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshBasicMaterial>;
  rim: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
};

/** Size and height of each section's sculpture above its island. */
const SCULPTURES: Record<SectionId, { make: (count: number) => Shape; scale: number; spins: boolean }> = {
  about: { make: (n) => sphere(n, seeded(21)), scale: 0.78, spins: false }, // becomes the portrait once the photo loads
  forma: { make: (n) => helix(n, seeded(22)), scale: 0.66, spins: true },
  skills: { make: (n) => atom(n, seeded(23)), scale: 0.62, spins: true },
  projects: { make: (n) => gallery(n, seeded(24)), scale: 0.66, spins: true },
  contact: { make: (n) => paperPlane(n, seeded(25)), scale: 0.7, spins: false },
};

const SPARK_COUNT = 160;

/**
 * Draws the first-person world. The simulation (`Explorer`) owns every rule;
 * this class builds the scenery once and mirrors the simulation each frame:
 * camera, crystals, and monuments that assemble out of loose particles as
 * the player walks up to them.
 */
export class WorldRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(72, 1, 0.1, 700);
  private monuments: Monument[] = [];
  private crystals: THREE.InstancedMesh;
  private portal = new THREE.Group();
  private portalRing!: THREE.Mesh<THREE.TorusGeometry, THREE.MeshStandardMaterial>;
  private core: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private sparks: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private sparkState: { vx: number; vy: number; vz: number; life: number }[] = [];
  private sparkCursor = 0;
  private textures: THREE.Texture[] = [];
  private dummy = new THREE.Object3D();
  private bob = 0;
  private landing = 0;
  private wasGrounded = true;
  private portalShown = 0;
  private particleCount: number;
  private disposed = false;

  constructor(
    private mount: HTMLElement,
    private explorer: Explorer,
    private options: { reducedMotion: boolean; lowPower: boolean; photoUrl: string }
  ) {
    this.particleCount = options.lowPower ? 3200 : 7000;
    this.renderer = new THREE.WebGLRenderer({ antialias: !options.lowPower, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, options.lowPower ? 1.5 : 2));
    this.renderer.setClearColor(0x04050d, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    mount.appendChild(this.renderer.domElement);

    this.camera.rotation.order = "YXZ";
    this.scene.fog = new THREE.FogExp2(0x04050d, 0.011);
    this.scene.add(new THREE.HemisphereLight(0xb9c4ff, 0x0b0d22, 1.15));
    const moon = new THREE.DirectionalLight(0xcfd6ff, 1.1);
    moon.position.set(-30, 60, 20);
    this.scene.add(moon);

    this.buildSky();
    this.buildPlatforms();
    this.core = this.buildCore();
    this.buildMonuments();
    this.crystals = this.buildCrystals();
    this.buildPortal();
    this.sparks = this.buildSparks();
    this.loadPortrait();
    this.resize();
  }

  // ---- scenery ----------------------------------------------------------

  private canvasTexture(width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    paint(canvas.getContext("2d")!);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.textures.push(texture);
    return texture;
  }

  private glow() {
    return this.canvasTexture(128, 128, (ctx) => {
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(0.35, "rgba(255,255,255,0.45)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
    });
  }

  private buildSky() {
    // Stars on a huge shell that follows the camera, so they never get closer.
    const count = 3200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const palette = [new THREE.Color(0xffffff), new THREE.Color(0xa59dff), new THREE.Color(0x9fe8ff), new THREE.Color(0xffd9a8)];
    for (let i = 0; i < count; i++) {
      const u = Math.random() * 2 - 1;
      const theta = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      positions.set([Math.cos(theta) * s * 400, u * 400, Math.sin(theta) * s * 400], i * 3);
      const c = palette[i % palette.length];
      const k = 0.35 + Math.random() * 0.65;
      colors.set([c.r * k, c.g * k, c.b * k], i * 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const stars = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, transparent: true, depthWrite: false, fog: false })
    );
    stars.name = "sky";
    this.scene.add(stars);

    // Nebulae: big soft sprites in the section colours, one behind each island.
    const texture = this.glow();
    this.explorer.world.islands.forEach((island, i) => {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: texture, color: SECTIONS[i].color, transparent: true, opacity: 0.2, depthWrite: false, fog: false })
      );
      sprite.position.set(Math.cos(island.angle) * 300, 30 + (i % 2) * 50, Math.sin(island.angle) * 300);
      sprite.scale.setScalar(360);
      this.scene.add(sprite);
    });
  }

  private buildPlatforms() {
    const { islands, segments } = this.explorer.world;
    const grid = this.canvasTexture(256, 256, (ctx) => {
      ctx.fillStyle = "#141833";
      ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = "rgba(165,157,255,0.28)";
      ctx.lineWidth = 2;
      for (let i = 0; i <= 256; i += 64) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 256);
        ctx.moveTo(0, i);
        ctx.lineTo(256, i);
        ctx.stroke();
      }
    });
    grid.wrapS = grid.wrapT = THREE.RepeatWrapping;
    grid.repeat.set(5, 5);
    grid.anisotropy = 8;

    const rock = new THREE.MeshStandardMaterial({ color: 0x1b1f3d, roughness: 0.95, flatShading: true });
    const platform = (x: number, z: number, radius: number, color: number) => {
      const top = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, 0.3, 48),
        new THREE.MeshStandardMaterial({ map: grid, color: 0xffffff, emissive: color, emissiveIntensity: 0.08, roughness: 0.75 })
      );
      top.position.set(x, -0.15, z);
      const under = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.96, radius * 1.5, 9, 1), rock);
      under.rotation.x = Math.PI;
      under.position.set(x, -0.3 - radius * 0.75, z);
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.07, 8, 96),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 })
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.set(x, 0.02, z);
      this.scene.add(top, under, rim);
      return rim;
    };

    platform(0, 0, HUB_RADIUS, 0x6e63f0);
    islands.forEach((island, i) => {
      const color = hexToNumber(SECTIONS[i].color);
      const rim = platform(island.x, island.z, ISLAND_RADIUS, color);
      const light = new THREE.PointLight(color, 60, 34, 1.7);
      light.position.set(island.x, 5, island.z);
      this.scene.add(light);
      // A beam into the sky marks each island from anywhere in the world.
      const beam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.7, 220, 16, 1, true),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })
      );
      // It starts above the sculpture, so it never veils it for someone standing at its foot.
      beam.position.set(island.x, 120, island.z);
      this.scene.add(beam);
      this.monuments[i] = { beam, rim } as Monument;

      const label = this.label(SECTIONS[i].name.toUpperCase(), SECTIONS[i].color);
      label.position.set(island.x, 8.2, island.z);
      this.scene.add(label);
    });

    for (const segment of segments) {
      const color = hexToNumber(SECTIONS[segment.island].color);
      const deck = new THREE.Mesh(
        new THREE.BoxGeometry(segment.halfLength * 2, 0.22, BRIDGE_WIDTH),
        new THREE.MeshStandardMaterial({ color: 0x1c2147, emissive: color, emissiveIntensity: 0.12, roughness: 0.6 })
      );
      deck.position.set(segment.x, -0.11, segment.z);
      deck.rotation.y = -segment.angle;
      this.scene.add(deck);
      for (const side of [1, -1]) {
        const edge = new THREE.Mesh(
          new THREE.BoxGeometry(segment.halfLength * 2, 0.06, 0.08),
          new THREE.MeshBasicMaterial({ color })
        );
        edge.position.set(
          segment.x - Math.sin(segment.angle) * side * (BRIDGE_WIDTH / 2),
          0.03,
          segment.z + Math.cos(segment.angle) * side * (BRIDGE_WIDTH / 2)
        );
        edge.rotation.y = -segment.angle;
        this.scene.add(edge);
      }
    }
  }

  private label(text: string, color: string) {
    const texture = this.canvasTexture(1024, 160, (ctx) => {
      ctx.font = "600 70px 'Space Grotesk', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = color;
      ctx.shadowBlur = 24;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(text, 512, 80);
    });
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    sprite.scale.set(9, 1.4, 1);
    return sprite;
  }

  private particleMaterial() {
    return new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERTEX,
      fragmentShader: PARTICLE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uChaos: { value: this.options.reducedMotion ? 0 : 1.1 },
        uSize: { value: 20 },
        uMouse: { value: new THREE.Vector3(999, 999, 0) },
        uMouseStrength: { value: 0 },
        uBurst: { value: 0 },
        uCalm: { value: 0 },
      },
    });
  }

  /** Points that start as a loose cloud (`aFrom`) and assemble into `shape` (`aTo`) as uProgress goes 0 → 1. */
  private particles(shape: Shape, seed: number) {
    const count = shape.positions.length / 3;
    const rand = seeded(seed);
    const from = new Float32Array(count * 3);
    const dim = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const u = rand() * 2 - 1;
      const theta = rand() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const r = 2.5 + rand() * 5.5;
      from.set([Math.cos(theta) * s * r, u * r * 0.6, Math.sin(theta) * s * r], i * 3);
      dim.set([shape.colors[i * 3] * 0.35, shape.colors[i * 3 + 1] * 0.35, shape.colors[i * 3 + 2] * 0.35], i * 3);
    }
    for (let i = 0; i < seeds.length; i++) seeds[i] = rand();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(shape.positions.slice(), 3));
    geometry.setAttribute("aFrom", new THREE.BufferAttribute(from, 3));
    geometry.setAttribute("aTo", new THREE.BufferAttribute(shape.positions.slice(), 3));
    geometry.setAttribute("aColorFrom", new THREE.BufferAttribute(dim, 3));
    geometry.setAttribute("aColorTo", new THREE.BufferAttribute(shape.colors.slice(), 3));
    geometry.setAttribute("aRand", new THREE.BufferAttribute(seeds, 4));
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 14);
    return new THREE.Points(geometry, this.particleMaterial());
  }

  /** A slow galaxy turning high above the hub; it funnels into the portal at the end. */
  private buildCore() {
    const core = this.particles(galaxy(this.particleCount, seeded(20)), 30);
    core.position.set(0, 11, 0);
    core.scale.setScalar(1.5);
    core.material.uniforms.uProgress.value = 1;
    this.scene.add(core);
    return core;
  }

  private buildMonuments() {
    this.explorer.world.islands.forEach((island, i) => {
      const spec = SCULPTURES[island.section];
      // The portrait is a picture, not a silhouette: it needs more points than the others to read.
      const count = island.section === "about" ? this.particleCount * 2 : this.particleCount;
      const points = this.particles(spec.make(count), 40 + i);
      points.position.set(island.x, 3.7, island.z);
      points.scale.setScalar(spec.scale);
      // Face the hub, which is where visitors arrive from.
      const baseRotation = Math.atan2(-Math.cos(island.angle), -Math.sin(island.angle));
      points.rotation.y = baseRotation;
      this.scene.add(points);
      this.monuments[i] = { ...this.monuments[i], points, spins: spec.spins, baseRotation, progress: 0 };
    });
  }

  private loadPortrait() {
    const image = new Image();
    image.onload = () => {
      if (this.disposed) return;
      const width = 130;
      const height = Math.round((width * image.naturalHeight) / image.naturalWidth);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(image, 0, 0, width, height);
      const shape = portrait(this.particleCount * 2, seeded(7), ctx.getImageData(0, 0, width, height).data, width, height);
      // Brighter than the full-screen version: here it is seen from a distance, against the stars.
      for (let i = 0; i < shape.colors.length; i++) shape.colors[i] = Math.min(1, shape.colors[i] * 1.7);
      const index = this.explorer.world.islands.findIndex((island) => island.section === "about");
      const geometry = this.monuments[index].points.geometry;
      (geometry.getAttribute("aTo").array as Float32Array).set(shape.positions);
      (geometry.getAttribute("aColorTo").array as Float32Array).set(shape.colors);
      geometry.getAttribute("aTo").needsUpdate = true;
      geometry.getAttribute("aColorTo").needsUpdate = true;
      this.monuments[index].points.material.uniforms.uCalm.value = 1;
    };
    image.src = this.options.photoUrl;
  }

  private buildCrystals() {
    const { crystals } = this.explorer.world;
    const mesh = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.3, 0),
      new THREE.MeshStandardMaterial({ color: 0xffd866, emissive: 0xffa820, emissiveIntensity: 1.5, flatShading: true }),
      crystals.length
    );
    mesh.frustumCulled = false;
    this.scene.add(mesh);
    return mesh;
  }

  private buildPortal() {
    this.portalRing = new THREE.Mesh(
      new THREE.TorusGeometry(PORTAL_RADIUS + 0.6, 0.13, 12, 64),
      new THREE.MeshStandardMaterial({ color: 0x7cf5c4, emissive: 0x7cf5c4, emissiveIntensity: 2 })
    );
    this.portalRing.position.y = 2.4;
    const veil = new THREE.Mesh(
      new THREE.CircleGeometry(PORTAL_RADIUS + 0.55, 48),
      new THREE.MeshBasicMaterial({ color: 0x7cf5c4, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
    );
    veil.position.y = 2.4;
    const pad = new THREE.Mesh(
      new THREE.RingGeometry(PORTAL_RADIUS - 0.1, PORTAL_RADIUS + 0.15, 48),
      new THREE.MeshBasicMaterial({ color: 0x7cf5c4, side: THREE.DoubleSide })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.03;
    const label = this.label("PORTAL", "#7cf5c4");
    label.position.y = 5.3;
    label.scale.set(6, 0.94, 1);
    this.portal.add(this.portalRing, veil, pad, label);
    this.portal.visible = false;
    this.scene.add(this.portal);
  }

  private buildSparks() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SPARK_COUNT * 3).fill(9999), 3));
    for (let i = 0; i < SPARK_COUNT; i++) this.sparkState.push({ vx: 0, vy: 0, vz: 0, life: 0 });
    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({ size: 0.22, map: this.glow(), color: 0xffd866, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    points.frustumCulled = false;
    this.scene.add(points);
    return points;
  }

  // ---- public API -------------------------------------------------------

  collectCrystal(index: number) {
    const crystal = this.explorer.world.crystals[index];
    const positions = this.sparks.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < 14; i++) {
      const k = this.sparkCursor;
      this.sparkCursor = (this.sparkCursor + 1) % SPARK_COUNT;
      positions.setXYZ(k, crystal.x, crystal.y, crystal.z);
      const angle = Math.random() * Math.PI * 2;
      this.sparkState[k] = { vx: Math.cos(angle) * 3, vy: 1.5 + Math.random() * 3.5, vz: Math.sin(angle) * 3, life: 0.7 };
    }
    positions.needsUpdate = true;
  }

  resize() {
    const width = this.mount.clientWidth || 1;
    const height = this.mount.clientHeight || 1;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    // Upright phones see a narrow slice of the world: widen the view so bridges stay readable.
    this.camera.fov = width < height ? 86 : 72;
    this.camera.updateProjectionMatrix();
    const size = this.renderer.domElement.height * 0.03;
    this.core.material.uniforms.uSize.value = size;
    for (const monument of this.monuments) monument.points.material.uniforms.uSize.value = size;
  }

  /** Draws one frame from the simulation state. `yaw` and `pitch` are the player's look angles. */
  render(dt: number, clock: number, yaw: number, pitch: number) {
    if (this.disposed) return;
    const explorer = this.explorer;
    const p = explorer.position;
    const ease = (rate: number) => Math.min(1, dt * rate);

    // Camera: eye height, a gentle head bob while walking and a dip on landing.
    const speed = Math.hypot(explorer.velocity.x, explorer.velocity.z);
    if (!this.options.reducedMotion) {
      if (explorer.grounded && speed > 0.8) this.bob += dt * speed * 1.6;
      if (explorer.grounded && !this.wasGrounded) this.landing = 0.16;
      this.landing = Math.max(0, this.landing - dt * 0.7);
    }
    this.wasGrounded = explorer.grounded;
    const bobOffset = this.options.reducedMotion ? 0 : Math.sin(this.bob) * 0.05 * Math.min(1, speed / 6);
    this.camera.position.set(p.x, p.y + EYE_HEIGHT + bobOffset - this.landing, p.z);
    this.camera.rotation.set(pitch, yaw, 0);
    this.scene.getObjectByName("sky")?.position.copy(this.camera.position);

    // Monuments assemble as the player approaches and loosen again when they leave.
    this.monuments.forEach((monument, i) => {
      const target = explorer.visited[i] ? 1 : explorer.awakening(i);
      monument.progress += (target - monument.progress) * ease(this.options.reducedMotion ? 20 : 1.4);
      const uniforms = monument.points.material.uniforms;
      uniforms.uProgress.value = monument.progress;
      uniforms.uTime.value = clock;
      if (monument.spins && !this.options.reducedMotion) monument.points.rotation.y = monument.baseRotation + clock * 0.25;
      const near = explorer.near === i;
      monument.rim.material.opacity = near ? 0.7 + Math.sin(clock * 6) * 0.3 : 0.9;
      monument.beam.material.opacity = explorer.visited[i] ? 0.04 : 0.1 + Math.sin(clock * 1.5 + i) * 0.025;
    });

    // The galaxy overhead drains into the portal once every monument has been opened.
    this.portalShown += ((explorer.portalOpen ? 1 : 0) - this.portalShown) * ease(1.2);
    this.core.material.uniforms.uTime.value = clock;
    this.core.rotation.y = clock * 0.05;
    this.core.position.y = 11 - this.portalShown * 7.5;
    this.core.scale.setScalar(1.5 - this.portalShown * 1.05);
    this.portal.visible = this.portalShown > 0.02;
    this.portal.scale.setScalar(Math.max(0.001, this.portalShown));
    // The ring turns to face the player, like a door that is always open towards you.
    this.portal.rotation.y = Math.atan2(p.x, p.z);
    this.portalRing.rotation.z = clock * 0.8;

    // Crystals bob and spin; collected ones shrink away.
    explorer.world.crystals.forEach((crystal, i) => {
      this.dummy.position.set(crystal.x, crystal.y + Math.sin(clock * 2 + i) * 0.14, crystal.z);
      this.dummy.rotation.set(0, clock * 1.4 + i, 0);
      this.dummy.scale.setScalar(explorer.crystalTaken[i] ? 0 : 1);
      this.dummy.updateMatrix();
      this.crystals.setMatrixAt(i, this.dummy.matrix);
    });
    this.crystals.instanceMatrix.needsUpdate = true;

    const positions = this.sparks.geometry.getAttribute("position") as THREE.BufferAttribute;
    const array = positions.array as Float32Array;
    this.sparkState.forEach((spark, i) => {
      if (spark.life <= 0) return;
      spark.life -= dt;
      if (spark.life <= 0) {
        array[i * 3] = 9999;
        return;
      }
      spark.vy -= 9 * dt;
      array[i * 3] += spark.vx * dt;
      array[i * 3 + 1] += spark.vy * dt;
      array[i * 3 + 2] += spark.vz * dt;
    });
    positions.needsUpdate = true;

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.disposed = true;
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) geometries.add(mesh.geometry);
      const material = (mesh as { material?: THREE.Material | THREE.Material[] }).material;
      if (Array.isArray(material)) material.forEach((m) => materials.add(m));
      else if (material) materials.add(material);
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
