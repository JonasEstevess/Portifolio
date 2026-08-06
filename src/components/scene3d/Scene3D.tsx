import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Link } from "react-router-dom";
import jonasPhoto from "@/assets/jonas-hero-photo.jpeg";
import { formations, stats, aboutParagraphs } from "@/data/formations";
import { techStack, softSkills, type TechItem } from "@/data/techStack";
import { projects } from "@/data/projects";
import { ProjectImage } from "@/components/portfolio/ProjectImage";
import {
  GMAIL_COMPOSE_URL,
  EMAIL_DISPLAY,
  WHATSAPP_URL,
  GITHUB_URL,
  LINKEDIN_URL,
  LOCATION,
} from "@/data/contact";

type PavilionKind = "about" | "forma" | "skills" | "projects" | "contact";
type PavilionConfig = {
  id: PavilionKind;
  name: string;
  color: number;
  angle: number;
  radius: number;
};

const PAVILIONS: PavilionConfig[] = [
  { id: "about", name: "Sobre Mim", color: 0x6e63f0, angle: 90, radius: 24 },
  { id: "forma", name: "Formação & Certificações", color: 0x8b7cf6, angle: 18, radius: 24 },
  { id: "skills", name: "Skills", color: 0x46c2e3, angle: -54, radius: 24 },
  { id: "projects", name: "Projetos", color: 0xf5a742, angle: 198, radius: 27 },
  { id: "contact", name: "Contato", color: 0xf2568c, angle: 270, radius: 24 },
];

const WORLD_RADIUS = 34;
const PLAYER_HEIGHT = 1.7;

const polarPos = (angleDeg: number, radius: number) => {
  const a = (angleDeg * Math.PI) / 180;
  return new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius);
};

const makeLabelTexture = (text: string, color: string) => {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext("2d")!;
  ctx.font = "600 40px 'Space Grotesk', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = color;
  ctx.fillText(text, 256, 48);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#eef2f6";
  ctx.fillText(text, 256, 48);
  return new THREE.CanvasTexture(canvas);
};

export const Scene3D = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);

  const [started, setStarted] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [promptName, setPromptName] = useState<string | null>(null);
  const [panelId, setPanelId] = useState<PavilionKind | null>(null);

  // Mutable engine state that must survive across renders without re-triggering effects.
  const engine = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    yawObject: THREE.Object3D;
    pitchObject: THREE.Object3D;
    coreMesh: THREE.Mesh;
    pavilionMeshes: { cfg: PavilionConfig; group: THREE.Group; centerpiece: THREE.Object3D; pos: THREE.Vector3 }[];
    keys: Record<string, boolean>;
    pointerLocked: boolean;
    moveVec: { x: number; y: number };
    velocity: THREE.Vector3;
    currentNear: PavilionConfig | null;
    panelOpen: boolean;
    frameId: number;
    clock: THREE.Clock;
  } | null>(null);

  const panelOpenRef = useRef(false);
  const startedRef = useRef(false);
  const isTouchRef = useRef(false);

  useEffect(() => {
    panelOpenRef.current = panelId !== null;
  }, [panelId]);
  useEffect(() => {
    startedRef.current = started;
  }, [started]);

  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const update = () => setIsPortrait(mq.matches);
    update();
    mq.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      mq.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // ---- One-time engine setup ----
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const touch = window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
    isTouchRef.current = touch;
    setIsTouch(touch);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xbfe0f7, 0.014);

    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 500);
    const pitchObject = new THREE.Object3D();
    pitchObject.add(camera);
    const yawObject = new THREE.Object3D();
    yawObject.position.set(0, PLAYER_HEIGHT, 9);
    yawObject.rotation.y = Math.PI;
    yawObject.add(pitchObject);
    scene.add(yawObject);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    mount.appendChild(renderer.domElement);

    // Sky dome — a filled indigo/blue gradient instead of a flat color, matching the landing page.
    const skyCanvas = document.createElement("canvas");
    skyCanvas.width = 2;
    skyCanvas.height = 256;
    const skyCtx = skyCanvas.getContext("2d")!;
    const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 256);
    skyGrad.addColorStop(0, "#3f8ee8");
    skyGrad.addColorStop(0.45, "#79b8f2");
    skyGrad.addColorStop(0.75, "#bfe0f7");
    skyGrad.addColorStop(1, "#dff0fb");
    skyCtx.fillStyle = skyGrad;
    skyCtx.fillRect(0, 0, 2, 256);
    const skyTex = new THREE.CanvasTexture(skyCanvas);
    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(280, 32, 32),
      new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false })
    );
    scene.add(skyDome);

    // Soft clouds drifting high in the sky.
    const makeCloudTexture = () => {
      const c = document.createElement("canvas");
      c.width = c.height = 256;
      const ctx = c.getContext("2d")!;
      const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
      g.addColorStop(0, "rgba(255,255,255,0.85)");
      g.addColorStop(0.6, "rgba(255,255,255,0.4)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(c);
    };
    const cloudTex = makeCloudTexture();
    const cloudSpecs: { pos: [number, number, number]; scale: number }[] = [
      { pos: [-90, 55, -120], scale: 130 },
      { pos: [130, 62, -80], scale: 110 },
      { pos: [-40, 68, 140], scale: 150 },
      { pos: [100, 50, 130], scale: 100 },
      { pos: [20, 72, -160], scale: 120 },
    ];
    cloudSpecs.forEach((n) => {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false, opacity: 0.8 })
      );
      sprite.position.set(...n.pos);
      sprite.scale.set(n.scale, n.scale * 0.55, 1);
      scene.add(sprite);
    });

    // Lights — bright, warm daylight instead of a moody night rig.
    scene.add(new THREE.HemisphereLight(0xbfe0ff, 0x5a6b4a, 1.15));
    const dir = new THREE.DirectionalLight(0xfff3e0, 1.1);
    dir.position.set(35, 55, 20);
    scene.add(dir);
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));

    // Ground — a dark mossy forest floor instead of a tech grid, still blue-leaning.
    const grassCanvas = document.createElement("canvas");
    grassCanvas.width = grassCanvas.height = 512;
    const gctx = grassCanvas.getContext("2d")!;
    gctx.fillStyle = "#3d7a4a";
    gctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2200; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const shade = Math.random();
      gctx.fillStyle =
        shade < 0.4 ? "rgba(60,120,70,0.5)" : shade < 0.75 ? "rgba(90,150,95,0.4)" : "rgba(120,170,110,0.3)";
      const s = 1.5 + Math.random() * 3;
      gctx.fillRect(x, y, s, s);
    }
    const groundTex = new THREE.CanvasTexture(grassCanvas);
    groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
    groundTex.repeat.set(24, 24);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(WORLD_RADIUS + 15, 64),
      new THREE.MeshStandardMaterial({ map: groundTex, color: 0x5a9060, roughness: 0.95, metalness: 0.02 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const boundaryRing = new THREE.Mesh(
      new THREE.RingGeometry(WORLD_RADIUS - 0.3, WORLD_RADIUS, 80),
      new THREE.MeshBasicMaterial({ color: 0x6e63f0, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
    );
    boundaryRing.rotation.x = -Math.PI / 2;
    boundaryRing.position.y = 0.02;
    scene.add(boundaryRing);

    // Paths — lit stone walkways radiating from the core out to each pavilion, so
    // there's always a clear route to follow instead of open, aimless ground.
    const pathCanvas = document.createElement("canvas");
    pathCanvas.width = 128;
    pathCanvas.height = 256;
    const pctx = pathCanvas.getContext("2d")!;
    pctx.fillStyle = "#2a3550";
    pctx.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 300; i++) {
      pctx.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.12)";
      pctx.fillRect(Math.random() * 128, Math.random() * 256, 2 + Math.random() * 3, 2 + Math.random() * 3);
    }
    const pathTex = new THREE.CanvasTexture(pathCanvas);
    pathTex.wrapS = pathTex.wrapT = THREE.RepeatWrapping;

    const PATH_WIDTH = 2.6;
    const pathBlockers: { angleRad: number; startR: number; endR: number }[] = [];

    PAVILIONS.forEach((cfg) => {
      const angleRad = (cfg.angle * Math.PI) / 180;
      const startR = 3.2;
      const endR = cfg.radius - 3.8;
      const length = Math.max(endR - startR, 1);
      const midR = (startR + endR) / 2;
      pathTex.repeat.set(1, length / 2);

      const group = new THREE.Group();
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(length, PATH_WIDTH),
        new THREE.MeshStandardMaterial({ map: pathTex, roughness: 0.85 })
      );
      plane.rotation.x = -Math.PI / 2;
      group.add(plane);

      const edgeMat = new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.55 });
      [PATH_WIDTH / 2, -PATH_WIDTH / 2].forEach((zOff) => {
        const edge = new THREE.Mesh(new THREE.PlaneGeometry(length, 0.12), edgeMat);
        edge.rotation.x = -Math.PI / 2;
        edge.position.set(0, 0.015, zOff);
        group.add(edge);
      });

      group.position.set(Math.cos(angleRad) * midR, 0.03, Math.sin(angleRad) * midR);
      group.rotation.y = -angleRad;
      scene.add(group);

      pathBlockers.push({ angleRad, startR: startR - 1.5, endR: endR + 1.5 });
    });

    // Trees — scattered low-poly pines, kept clear of the core, pavilions, and paths.
    const isBlocked = (x: number, z: number) => {
      const r = Math.hypot(x, z);
      if (r < 6.5) return true;
      for (const p of PAVILIONS) {
        const ppos = polarPos(p.angle, p.radius);
        if (Math.hypot(x - ppos.x, z - ppos.z) < 6.5) return true;
      }
      const pointAngle = Math.atan2(z, x);
      for (const b of pathBlockers) {
        let delta = pointAngle - b.angleRad;
        delta = Math.atan2(Math.sin(delta), Math.cos(delta));
        const arcDist = Math.abs(delta) * r;
        if (r > b.startR && r < b.endR && arcDist < PATH_WIDTH) return true;
      }
      return false;
    };

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3221, roughness: 0.9 });
    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x2f7d4e,
      roughness: 0.85,
    });

    const treeGroup = new THREE.Group();
    let placed = 0;
    let attempts = 0;
    while (placed < 55 && attempts < 500) {
      attempts++;
      const angle = Math.random() * Math.PI * 2;
      const r = 7 + Math.random() * (WORLD_RADIUS - 10);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      if (isBlocked(x, z)) continue;

      const scale = 0.75 + Math.random() * 0.7;
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.4, 6), trunkMat);
      trunk.position.y = 0.7 * scale;
      trunk.scale.set(scale, scale, scale);
      tree.add(trunk);
      const tiers = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < tiers; i++) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(1.1 - i * 0.22, 1.5, 7), foliageMat);
        cone.position.y = (1.5 + i * 0.95) * scale;
        cone.scale.set(scale, scale, scale);
        tree.add(cone);
      }
      tree.position.set(x, 0, z);
      tree.rotation.y = Math.random() * Math.PI * 2;
      treeGroup.add(tree);
      placed++;
    }
    scene.add(treeGroup);

    // Core
    const coreMesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.4, 0),
      new THREE.MeshStandardMaterial({ color: 0x6e63f0, emissive: 0x2e2a8f, emissiveIntensity: 0.6, wireframe: true })
    );
    coreMesh.position.set(0, 3.4, 0);
    scene.add(coreMesh);
    const coreLight = new THREE.PointLight(0x6e63f0, 2.2, 30);
    coreLight.position.copy(coreMesh.position);
    scene.add(coreLight);

    const addLabel = (text: string, position: THREE.Vector3, color: string, scale = 1) => {
      const tex = makeLabelTexture(text, color);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      sprite.scale.set(6 * scale, 1.1 * scale, 1);
      sprite.position.copy(position);
      scene.add(sprite);
    };
    addLabel("PORTFÓLIO 3D", coreMesh.position.clone().add(new THREE.Vector3(0, 2.0, 0)), "#6e63f0", 0.9);

    // Floating photo medallion above the label — a thin 3D box (not a flat billboard)
    // so it visibly turns as it slowly spins, selling the "alive, moving" feel.
    const photoTexture = new THREE.TextureLoader().load(jonasPhoto);
    photoTexture.colorSpace = THREE.SRGBColorSpace;
    const photoFrameMat = new THREE.MeshStandardMaterial({
      color: 0x6e63f0,
      emissive: 0x2e2a8f,
      emissiveIntensity: 0.5,
      roughness: 0.4,
      metalness: 0.3,
    });
    const photoFaceMat = new THREE.MeshBasicMaterial({ map: photoTexture });
    const photoMesh = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.7, 0.16), [
      photoFrameMat,
      photoFrameMat,
      photoFrameMat,
      photoFrameMat,
      photoFaceMat,
      photoFaceMat,
    ]);
    photoMesh.position.copy(coreMesh.position.clone().add(new THREE.Vector3(0, 3.6, 0)));
    scene.add(photoMesh);
    const photoRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.15, 0.035, 8, 40),
      new THREE.MeshBasicMaterial({ color: 0x6e63f0, transparent: true, opacity: 0.5 })
    );
    photoRing.position.copy(photoMesh.position);
    scene.add(photoRing);
    const photoLight = new THREE.PointLight(0x8fa5ff, 1.4, 12);
    photoLight.position.copy(photoMesh.position).add(new THREE.Vector3(0, 0, 1.5));
    scene.add(photoLight);

    const coreBase = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4, 3.8, 0.4, 48),
      new THREE.MeshStandardMaterial({ color: 0x131b2e, emissive: 0x201c5c, emissiveIntensity: 0.35 })
    );
    coreBase.position.set(0, 0.2, 0);
    scene.add(coreBase);

    // Pavilions
    const pavilionMeshes: { cfg: PavilionConfig; group: THREE.Group; centerpiece: THREE.Object3D; pos: THREE.Vector3 }[] = [];

    PAVILIONS.forEach((cfg) => {
      const pos = polarPos(cfg.angle, cfg.radius);
      const group = new THREE.Group();
      group.position.copy(pos);
      scene.add(group);

      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(3.6, 3.9, 0.3, 40),
        new THREE.MeshStandardMaterial({ color: 0x11162a, emissive: cfg.color, emissiveIntensity: 0.25 })
      );
      pad.position.y = 0.15;
      group.add(pad);

      const glowRing = new THREE.Mesh(
        new THREE.RingGeometry(3.9, 4.3, 48),
        new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
      );
      glowRing.rotation.x = -Math.PI / 2;
      glowRing.position.y = 0.05;
      group.add(glowRing);

      const matStd = new THREE.MeshStandardMaterial({
        color: cfg.color,
        emissive: cfg.color,
        emissiveIntensity: 0.5,
        roughness: 0.35,
        metalness: 0.4,
      });
      const matWire = new THREE.MeshBasicMaterial({ color: cfg.color, wireframe: true, transparent: true, opacity: 0.55 });

      let centerpiece: THREE.Object3D;

      if (cfg.id === "about") {
        const m = new THREE.Mesh(new THREE.OctahedronGeometry(1.5, 0), matStd);
        m.position.y = 2.6;
        centerpiece = m;
      } else if (cfg.id === "forma") {
        const g = new THREE.Group();
        for (let i = 0; i < 3; i++) {
          const torus = new THREE.Mesh(new THREE.TorusGeometry(1.1 - i * 0.18, 0.11, 12, 32), matStd);
          torus.position.y = 1.6 + i * 0.9;
          torus.rotation.x = Math.PI / 2;
          g.add(torus);
        }
        centerpiece = g;
      } else if (cfg.id === "skills") {
        const g = new THREE.Group();
        const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 0), matWire);
        core.position.y = 2.6;
        g.add(core);
        for (let i = 0; i < 6; i++) {
          const cube = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.32), matStd);
          const a = (i / 6) * Math.PI * 2;
          cube.position.set(Math.cos(a) * 1.8, 2.6 + Math.sin(i * 1.3) * 0.5, Math.sin(a) * 1.8);
          cube.userData.orbit = { a, r: 1.8, speed: 0.6 + Math.random() * 0.4, yOff: 2.6 };
          g.add(cube);
        }
        centerpiece = g;
      } else if (cfg.id === "projects") {
        const g = new THREE.Group();
        for (let i = 0; i < 5; i++) {
          const panel = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.3, 0.08), matStd);
          const a = (i / 5) * Math.PI * 2;
          panel.position.set(Math.cos(a) * 2.1, 2.4, Math.sin(a) * 2.1);
          panel.lookAt(0, 2.4, 0);
          g.add(panel);
        }
        centerpiece = g;
      } else {
        const g = new THREE.Group();
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 3.4, 16), matStd);
        pole.position.y = 2.0;
        g.add(pole);
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 24), matStd);
        orb.position.y = 3.9;
        g.add(orb);
        for (let i = 0; i < 2; i++) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.75 + i * 0.35, 0.03, 8, 32), matWire);
          ring.position.y = 3.9;
          ring.rotation.x = Math.PI / 2.3;
          g.add(ring);
        }
        centerpiece = g;
      }

      group.add(centerpiece);

      const light = new THREE.PointLight(cfg.color, 1.6, 14);
      light.position.set(0, 3, 0);
      group.add(light);

      addLabel(cfg.name.toUpperCase(), pos.clone().add(new THREE.Vector3(0, 5.4, 0)), "#" + cfg.color.toString(16).padStart(6, "0"), 0.85);

      pavilionMeshes.push({ cfg, group, centerpiece, pos });
    });

    engine.current = {
      scene,
      camera,
      renderer,
      yawObject,
      pitchObject,
      coreMesh,
      pavilionMeshes,
      keys: {},
      pointerLocked: false,
      moveVec: { x: 0, y: 0 },
      velocity: new THREE.Vector3(),
      currentNear: null,
      panelOpen: false,
      frameId: 0,
      clock: new THREE.Clock(),
    };

    // ---- Input handlers ----
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    const onKeyDown = (e: KeyboardEvent) => {
      if (!engine.current) return;
      engine.current.keys[e.code] = true;
      if (e.code === "KeyE" && engine.current.currentNear && !panelOpenRef.current) {
        setPanelId(engine.current.currentNear.id);
        if (document.pointerLockElement) document.exitPointerLock();
      }
      if (e.code === "Escape" && panelOpenRef.current) {
        setPanelId(null);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!engine.current) return;
      engine.current.keys[e.code] = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const onPointerLockChange = () => {
      if (!engine.current) return;
      engine.current.pointerLocked = document.pointerLockElement === renderer.domElement;
    };
    document.addEventListener("pointerlockchange", onPointerLockChange);

    const onMouseMove = (e: MouseEvent) => {
      if (!engine.current?.pointerLocked) return;
      yawObject.rotation.y -= e.movementX * 0.0022;
      pitchObject.rotation.x -= e.movementY * 0.0022;
      pitchObject.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, pitchObject.rotation.x));
    };
    document.addEventListener("mousemove", onMouseMove);

    // ---- Animation loop ----
    const animate = () => {
      if (!engine.current) return;
      engine.current.frameId = requestAnimationFrame(animate);
      const dt = Math.min(engine.current.clock.getDelta(), 0.05);
      const t = engine.current.clock.elapsedTime;

      // Movement
      if (!panelOpenRef.current) {
        const speed = 7.2;
        let fx = 0;
        let fz = 0;
        const k = engine.current.keys;
        if (k["KeyW"] || k["ArrowUp"]) fz -= 1;
        if (k["KeyS"] || k["ArrowDown"]) fz += 1;
        if (k["KeyA"] || k["ArrowLeft"]) fx -= 1;
        if (k["KeyD"] || k["ArrowRight"]) fx += 1;
        if (isTouchRef.current) {
          fx += engine.current.moveVec.x;
          fz += engine.current.moveVec.y;
        }
        const len = Math.hypot(fx, fz);
        const vel = engine.current.velocity;
        if (len > 0.001) {
          fx /= len;
          fz /= len;
          const yaw = yawObject.rotation.y;
          vel.x = (fz * Math.sin(yaw) + fx * Math.cos(yaw)) * speed;
          vel.z = (fz * Math.cos(yaw) - fx * Math.sin(yaw)) * speed;
        } else {
          vel.x *= 0.8;
          vel.z *= 0.8;
        }

        const next = yawObject.position.clone();
        next.x += vel.x * dt;
        next.z += vel.z * dt;

        const distFromCenter = Math.hypot(next.x, next.z);
        if (distFromCenter > WORLD_RADIUS - 1.2) {
          const ang = Math.atan2(next.z, next.x);
          next.x = Math.cos(ang) * (WORLD_RADIUS - 1.2);
          next.z = Math.sin(ang) * (WORLD_RADIUS - 1.2);
        }

        for (const p of pavilionMeshes) {
          const dx = next.x - p.pos.x;
          const dz = next.z - p.pos.z;
          const d = Math.hypot(dx, dz);
          const minD = 3.0;
          if (d < minD && d > 0.001) {
            const push = minD - d;
            next.x += (dx / d) * push;
            next.z += (dz / d) * push;
          }
        }
        {
          const d = Math.hypot(next.x, next.z);
          const minD = 2.6;
          if (d < minD && d > 0.001) {
            const push = minD - d;
            next.x += (next.x / d) * push;
            next.z += (next.z / d) * push;
          }
        }

        yawObject.position.x = next.x;
        yawObject.position.z = next.z;

        // Proximity
        let nearest: PavilionConfig | null = null;
        let nearestDist = Infinity;
        for (const p of pavilionMeshes) {
          const d = Math.hypot(yawObject.position.x - p.pos.x, yawObject.position.z - p.pos.z);
          if (d < 6 && d < nearestDist) {
            nearest = p.cfg;
            nearestDist = d;
          }
        }
        if (nearest?.id !== engine.current.currentNear?.id) {
          engine.current.currentNear = nearest;
          setPromptName(nearest ? nearest.name : null);
        }
      }

      // Ambient motion
      coreMesh.rotation.y += dt * 0.4;
      coreMesh.rotation.x += dt * 0.15;
      coreMesh.position.y = 3.4 + Math.sin(t * 0.8) * 0.15;

      photoMesh.rotation.y += dt * 0.35;
      photoMesh.position.y = coreMesh.position.y + 3.6 + Math.sin(t * 1.1) * 0.18;
      photoRing.rotation.z += dt * 0.5;
      photoRing.position.y = photoMesh.position.y;
      photoLight.position.y = photoMesh.position.y;

      for (const p of pavilionMeshes) {
        if (p.cfg.id === "skills") {
          p.centerpiece.children.forEach((c) => {
            const orbit = c.userData.orbit as { a: number; r: number; speed: number; yOff: number } | undefined;
            if (orbit) {
              orbit.a += dt * orbit.speed;
              c.position.set(Math.cos(orbit.a) * orbit.r, orbit.yOff + Math.sin(t * 1.5 + orbit.a) * 0.3, Math.sin(orbit.a) * orbit.r);
            } else {
              c.rotation.y += dt * 0.5;
            }
          });
        } else if (p.cfg.id === "forma") {
          p.centerpiece.children.forEach((ring, i) => {
            ring.rotation.z += dt * (0.3 + i * 0.1);
          });
        } else if (p.cfg.id === "projects") {
          p.centerpiece.rotation.y += dt * 0.25;
        } else if (p.cfg.id === "contact") {
          p.centerpiece.children.forEach((c) => {
            if ((c as THREE.Mesh).geometry?.type === "TorusGeometry") c.rotation.z += dt * 0.6;
          });
          p.centerpiece.position.y = Math.sin(t * 1.2) * 0.1;
        } else if (p.cfg.id === "about") {
          p.centerpiece.rotation.y += dt * 0.5;
          p.centerpiece.position.y = 2.6 + Math.sin(t) * 0.1;
        }
      }

      // Minimap
      const mm = minimapRef.current;
      if (mm) {
        const ctx = mm.getContext("2d")!;
        const w = mm.width;
        const h = mm.height;
        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.translate(w / 2, h / 2);
        const scale = (w / 2 - 8) / WORLD_RADIUS;
        ctx.strokeStyle = "rgba(255,255,255,0.15)";
        ctx.beginPath();
        ctx.arc(0, 0, WORLD_RADIUS * scale, 0, Math.PI * 2);
        ctx.stroke();
        for (const p of pavilionMeshes) {
          ctx.beginPath();
          ctx.fillStyle = "#" + p.cfg.color.toString(16).padStart(6, "0");
          ctx.arc(p.pos.x * scale, p.pos.z * scale, 4, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.fillStyle = "#ffffff";
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.save();
        ctx.translate(yawObject.position.x * scale, yawObject.position.z * scale);
        ctx.rotate(yawObject.rotation.y);
        ctx.fillStyle = "#6e63f0";
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(4, 5);
        ctx.lineTo(-4, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        ctx.restore();
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (engine.current) cancelAnimationFrame(engine.current.frameId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      document.removeEventListener("mousemove", onMouseMove);
      photoTexture.dispose();
      photoFaceMat.dispose();
      photoFrameMat.dispose();
      photoMesh.geometry.dispose();
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      engine.current = null;
    };
  }, []);

  // ---- Touch controls wiring ----
  const dpad = useRef({ up: false, down: false, left: false, right: false });
  const lookTouchId = useRef<number | null>(null);
  const lookLast = useRef({ x: 0, y: 0 });

  const updateDpadVec = () => {
    if (!engine.current) return;
    const d = dpad.current;
    engine.current.moveVec.x = (d.right ? 1 : 0) - (d.left ? 1 : 0);
    engine.current.moveVec.y = (d.down ? 1 : 0) - (d.up ? 1 : 0);
  };
  const pressDpad = (dir: keyof typeof dpad.current) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    dpad.current[dir] = true;
    updateDpadVec();
  };
  const releaseDpad = (dir: keyof typeof dpad.current) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    dpad.current[dir] = false;
    updateDpadVec();
  };

  const onLookTouchStart = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    lookTouchId.current = t.identifier;
    lookLast.current = { x: t.clientX, y: t.clientY };
  };
  const onLookTouchMove = (e: React.TouchEvent) => {
    if (!engine.current) return;
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier !== lookTouchId.current) continue;
      const dx = t.clientX - lookLast.current.x;
      const dy = t.clientY - lookLast.current.y;
      lookLast.current = { x: t.clientX, y: t.clientY };
      engine.current.yawObject.rotation.y -= dx * 0.004;
      engine.current.pitchObject.rotation.x -= dy * 0.004;
      engine.current.pitchObject.rotation.x = Math.max(
        -Math.PI / 2.2,
        Math.min(Math.PI / 2.2, engine.current.pitchObject.rotation.x)
      );
    }
  };
  const onLookTouchEnd = (e: React.TouchEvent) => {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === lookTouchId.current) lookTouchId.current = null;
    }
  };

  const handleStart = () => {
    setStarted(true);
    if (!isTouchRef.current) {
      engine.current?.renderer.domElement.requestPointerLock();
      return;
    }
    // Best-effort: some browsers (mainly Android Chrome) allow locking orientation
    // once in fullscreen. Silently ignored where unsupported (notably iOS Safari) —
    // the rotate-device overlay is the reliable fallback in every case.
    document.documentElement
      .requestFullscreen?.()
      .then(() => {
        const orientation = screen.orientation as ScreenOrientation & {
          lock?: (o: string) => Promise<void>;
        };
        orientation.lock?.("landscape").catch(() => {});
      })
      .catch(() => {});
  };

  const handleInteract = () => {
    if (engine.current?.currentNear) {
      setPanelId(engine.current.currentNear.id);
      if (document.pointerLockElement) document.exitPointerLock();
    }
  };

  const closePanel = () => {
    setPanelId(null);
    if (!isTouchRef.current) {
      requestAnimationFrame(() => engine.current?.renderer.domElement.requestPointerLock());
    }
  };

  return (
    <div className="fixed inset-0 bg-background overflow-hidden select-none">
      <div ref={mountRef} className="absolute inset-0" />

      {isTouch && isPortrait && (
        <div className="fixed inset-0 z-[150] bg-background flex flex-col items-center justify-center text-center px-8">
          <div className="text-5xl mb-5 animate-bounce" style={{ animationDuration: "1.8s" }}>
            📱↻
          </div>
          <p className="font-display text-lg font-semibold mb-2">Gire seu aparelho</p>
          <p className="text-muted-foreground text-sm max-w-xs">
            O modelo 3D funciona melhor na horizontal. Deite o celular ou tablet para continuar.
          </p>
        </div>
      )}

      <Link
        to="/"
        className="fixed top-4 left-4 z-[80] flex items-center gap-2 px-3.5 py-2 rounded-full bg-card/80 border border-border text-xs text-foreground backdrop-blur-md"
      >
        ← Voltar ao início
      </Link>

      {!started && (
        <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center text-center px-6 bg-gradient-to-b from-background/30 to-background/80">
          <h1 className="display-lg mb-3">
            Bem-vindo ao meu <span className="text-primary">portfólio 3D</span>
          </h1>
          <p className="text-muted-foreground max-w-md mb-8 text-sm md:text-base">
            Ande pelo espaço e entre nos pavilhões para conhecer minha trajetória, formação,
            skills, projetos e contato.
          </p>
          <button
            onClick={handleStart}
            className="px-8 py-3.5 rounded-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold text-sm shadow-glow"
          >
            Entrar no mundo
          </button>
          {isTouch ? (
            <p className="text-amber-400 text-xs mt-6">
              Toque para mover/olhar e use o botão de interação nos pavilhões.
            </p>
          ) : (
            <div className="flex gap-5 flex-wrap justify-center mt-7 text-muted-foreground text-xs">
              <span><kbd className="px-1.5 py-0.5 border border-border rounded mr-1">W A S D</kbd>mover</span>
              <span>mouse — olhar</span>
              <span><kbd className="px-1.5 py-0.5 border border-border rounded mr-1">E</kbd>interagir</span>
              <span><kbd className="px-1.5 py-0.5 border border-border rounded mr-1">ESC</kbd>sair</span>
            </div>
          )}
        </div>
      )}

      {started && (
        <div className="fixed inset-0 z-20 pointer-events-none">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-foreground/90 shadow-glow" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-foreground/90" />
          <canvas ref={minimapRef} width={120} height={120} className="absolute top-4 right-4 rounded-2xl bg-card/70 border border-border backdrop-blur-md" />

          {promptName && !panelId && (
            <button
              onClick={handleInteract}
              className="absolute bottom-28 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-full bg-card/90 border border-primary/40 text-xs text-foreground backdrop-blur-md pointer-events-auto"
            >
              <kbd className="px-1.5 py-0.5 rounded bg-primary/20 border border-primary/40 text-primary">E</kbd>
              abrir {promptName}
            </button>
          )}

          <p className="absolute bottom-5 left-1/2 -translate-x-1/2 text-[11px] text-muted-foreground tracking-wide text-center">
            WASD para mover · mouse para olhar · E para interagir · ESC para sair
          </p>
        </div>
      )}

      {started && isTouch && !panelId && (
        <div className="fixed inset-0 z-[25]">
          {/* Look area covers the screen, but sits behind the D-pad and interact button (both have higher stacking via being later in the DOM + pointer-events). */}
          <div
            className="absolute inset-0"
            onTouchStart={onLookTouchStart}
            onTouchMove={onLookTouchMove}
            onTouchEnd={onLookTouchEnd}
          />

          {/* D-pad: press-and-hold buttons instead of a drag joystick — clearer affordance on mobile. */}
          <div className="absolute bottom-6 left-6 w-40 h-28 select-none" style={{ touchAction: "none" }}>
            <button
              onTouchStart={pressDpad("up")}
              onTouchEnd={releaseDpad("up")}
              onTouchCancel={releaseDpad("up")}
              aria-label="Andar para frente"
              className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-lg bg-card/80 border border-border active:bg-primary/30 active:border-primary/60 flex items-center justify-center text-foreground text-lg"
            >
              ▲
            </button>
            <button
              onTouchStart={pressDpad("left")}
              onTouchEnd={releaseDpad("left")}
              onTouchCancel={releaseDpad("left")}
              aria-label="Andar para a esquerda"
              className="absolute bottom-0 left-0 w-12 h-12 rounded-lg bg-card/80 border border-border active:bg-primary/30 active:border-primary/60 flex items-center justify-center text-foreground text-lg"
            >
              ◀
            </button>
            <button
              onTouchStart={pressDpad("down")}
              onTouchEnd={releaseDpad("down")}
              onTouchCancel={releaseDpad("down")}
              aria-label="Andar para trás"
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-12 rounded-lg bg-card/80 border border-border active:bg-primary/30 active:border-primary/60 flex items-center justify-center text-foreground text-lg"
            >
              ▼
            </button>
            <button
              onTouchStart={pressDpad("right")}
              onTouchEnd={releaseDpad("right")}
              onTouchCancel={releaseDpad("right")}
              aria-label="Andar para a direita"
              className="absolute bottom-0 right-0 w-12 h-12 rounded-lg bg-card/80 border border-border active:bg-primary/30 active:border-primary/60 flex items-center justify-center text-foreground text-lg"
            >
              ▶
            </button>
          </div>

          <button
            onClick={handleInteract}
            disabled={!promptName}
            className="absolute bottom-9 right-6 w-16 h-16 rounded-full bg-primary/25 border border-primary/55 text-foreground text-[11px] flex items-center justify-center text-center leading-tight"
          >
            ABRIR
          </button>
        </div>
      )}

      {panelId && (
        <div className="fixed inset-0 z-[60] bg-background/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-2xl max-h-[82vh] overflow-y-auto bg-card border border-border rounded-3xl p-7 md:p-9">
            <button
              onClick={closePanel}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/5 border border-border flex items-center justify-center text-foreground"
              aria-label="Fechar"
            >
              ✕
            </button>
            <PanelContent id={panelId} />
          </div>
        </div>
      )}
    </div>
  );
};

// ---- Panel content, driven by the same data the landing page uses ----

const IdentityTabs = () => {
  const [tab, setTab] = useState<"dev" | "estudante" | "criador">("dev");
  return (
    <div>
      <div className="flex gap-2 mb-5">
        {(["dev", "estudante", "criador"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 text-xs font-medium border ${
              tab === k ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground"
            }`}
          >
            {k === "dev" ? "Desenvolvedor" : k === "estudante" ? "Estudante" : "Criador"}
          </button>
        ))}
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed">{aboutParagraphs[tab]}</p>
    </div>
  );
};

const PanelContent = ({ id }: { id: PavilionKind }) => {
  if (id === "about") {
    return (
      <div>
        <span className="label-sm text-primary">Sobre</span>
        <h2 className="font-display text-2xl font-semibold mt-2 mb-5">Tecnologia com propósito</h2>
        <IdentityTabs />
        <div className="grid grid-cols-3 gap-3 mt-7">
          {stats.map((s) => (
            <div key={s.label} className="text-center border border-border p-3">
              <div className="font-display text-xl font-semibold">{s.value}</div>
              <div className="text-[10.5px] text-muted-foreground mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (id === "forma") {
    return (
      <div>
        <span className="label-sm text-primary">Formação & Certificações</span>
        <h2 className="font-display text-2xl font-semibold mt-2 mb-5">Trajetória acadêmica</h2>
        <div className="space-y-3">
          {formations.map((f) => (
            <div key={f.title} className="flex gap-3 p-3.5 border border-border">
              <f.icon className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-foreground">{f.title}</h4>
                <p className="text-xs text-muted-foreground">{f.place}</p>
                <p className="text-[11px] text-muted-foreground/70 mt-1">
                  {f.period} · {f.status}
                </p>
              </div>
            </div>
          ))}
        </div>
        <a
          href="/curriculo-jonas-esteves.pdf"
          download
          className="inline-block mt-5 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-xs font-medium"
        >
          Baixar currículo (PDF)
        </a>
      </div>
    );
  }

  if (id === "skills") {
    return (
      <div>
        <span className="label-sm text-primary">Tech Stack</span>
        <h2 className="font-display text-2xl font-semibold mt-2 mb-5">Ferramentas que uso</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-7">
          {techStack.map((skill: TechItem) => (
            <div key={skill.name} className="border border-border p-2.5 flex items-center gap-2">
              {skill.src && <img src={skill.src} alt="" className="w-4 h-4" />}
              <span className="text-xs text-foreground">{skill.name}</span>
            </div>
          ))}
        </div>
        <span className="label-sm text-muted-foreground block mb-3">Soft Skills</span>
        <div className="flex flex-wrap gap-1.5">
          {softSkills.map((s) => (
            <span key={s} className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30 text-foreground">
              {s}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (id === "projects") {
    return (
      <div>
        <span className="label-sm text-primary">Trabalhos selecionados</span>
        <h2 className="font-display text-2xl font-semibold mt-2 mb-5">Projetos ({projects.length})</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {projects.map((p) => (
            <a
              key={p.title}
              href={p.liveUrl ?? p.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-border overflow-hidden hover:border-primary/40 transition-colors"
            >
              <ProjectImage project={p} className="aspect-video w-full" />
              <p className="text-[11px] text-foreground p-2 leading-snug">{p.title}</p>
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <span className="label-sm text-primary">Contato</span>
      <h2 className="font-display text-2xl font-semibold mt-2 mb-5">Vamos construir algo</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <a href={GMAIL_COMPOSE_URL} target="_blank" rel="noopener noreferrer" className="border border-border p-3.5 text-sm text-foreground">
          ✉️ {EMAIL_DISPLAY}
        </a>
        <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="border border-border p-3.5 text-sm text-foreground">
          💬 WhatsApp
        </a>
        <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="border border-border p-3.5 text-sm text-foreground">
          in LinkedIn
        </a>
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="border border-border p-3.5 text-sm text-foreground">
          ⌥ GitHub
        </a>
      </div>
      <p className="text-muted-foreground text-xs mt-5">📍 {LOCATION}</p>
    </div>
  );
};
