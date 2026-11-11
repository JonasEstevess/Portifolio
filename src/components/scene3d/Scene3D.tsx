import { useCallback, useEffect, useRef, useState, type TouchEvent as ReactTouchEvent } from "react";
import * as THREE from "three";
import { Link } from "react-router-dom";
import jonasPhoto from "@/assets/jonas-hero-photo.jpeg";
import { PortfolioPanel } from "@/components/shared/PortfolioPanel";
import { SectionDialog } from "@/components/shared/SectionDialog";
import { SECTIONS, sectionById, type SectionId } from "@/data/sections";
import { buildWorld, PLAYER_HEIGHT, WORLD_RADIUS, type World } from "./world";

const WALK_SPEED = 6.4;
const SPRINT_MULTIPLIER = 1.7;
const JUMP_SPEED = 6.2;
const GRAVITY = 18;
const PLAYER_RADIUS = 0.5;
const INTERACT_DISTANCE = 7.5;
const MAX_PITCH = Math.PI / 2.2;

type Engine = {
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  yaw: THREE.Object3D;
  pitch: THREE.Object3D;
  world: World;
  keys: Record<string, boolean>;
  touchMove: { x: number; y: number };
  velocity: THREE.Vector3;
  height: number;
  verticalSpeed: number;
  bob: number;
  near: SectionId | null;
  locked: boolean;
  dragging: boolean;
};

const Key = ({ children }: { children: string }) => (
  <kbd className="px-1.5 py-0.5 border border-border bg-card/70 rounded text-[10px] font-mono mr-1">{children}</kbd>
);

export const Scene3D = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const engine = useRef<Engine | null>(null);

  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [dragLook, setDragLook] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  const [near, setNear] = useState<SectionId | null>(null);
  const [panelId, setPanelId] = useState<SectionId | null>(null);
  const [visited, setVisited] = useState<SectionId[]>([]);
  const [webglFailed, setWebglFailed] = useState(false);

  // The render loop and DOM listeners are created once; they read live values through these refs.
  const live = useRef({ started, paused, panelId, isTouch, dragLook, visited: new Set<SectionId>() });
  live.current.started = started;
  live.current.paused = paused;
  live.current.panelId = panelId;
  live.current.isTouch = isTouch;
  live.current.dragLook = dragLook;

  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const update = () => setIsPortrait(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const openPanel = useCallback((id: SectionId) => {
    if (document.pointerLockElement) document.exitPointerLock();
    live.current.visited.add(id);
    setVisited(Array.from(live.current.visited));
    setPanelId(id);
  }, []);

  const lockPointer = useCallback(() => {
    const canvas = engine.current?.renderer.domElement;
    if (!canvas || live.current.isTouch) return;
    try {
      const result = canvas.requestPointerLock() as unknown as Promise<void> | undefined;
      result?.catch?.(() => setDragLook(true));
    } catch {
      setDragLook(true);
    }
  }, []);

  /** Places the player on the path in front of a pavilion, looking at it. */
  const travelTo = useCallback((id: SectionId) => {
    const e = engine.current;
    const pavilion = e?.world.pavilions.find((p) => p.meta.id === id);
    if (!e || !pavilion) return;
    const standAt = pavilion.radius - 7;
    e.yaw.position.x = Math.cos(pavilion.angleRad) * standAt;
    e.yaw.position.z = Math.sin(pavilion.angleRad) * standAt;
    e.yaw.rotation.y = Math.atan2(-Math.cos(pavilion.angleRad), -Math.sin(pavilion.angleRad));
    e.pitch.rotation.x = 0.08;
    e.velocity.set(0, 0, 0);
  }, []);

  // ---- One-time engine setup ----
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Only real touch-first devices get the touch UI; a laptop with a touchscreen keeps mouse + keyboard.
    const touch = window.matchMedia("(pointer: coarse)").matches;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setIsTouch(touch);
    live.current.isTouch = touch;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !touch, powerPreference: "high-performance" });
    } catch {
      setWebglFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, touch ? 1.5 : 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = !touch;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, mount.clientWidth / mount.clientHeight, 0.1, 600);
    const pitch = new THREE.Object3D();
    pitch.add(camera);
    const yaw = new THREE.Object3D();
    yaw.position.set(0, PLAYER_HEIGHT, 10);
    yaw.rotation.y = Math.PI * 0.08;
    yaw.add(pitch);

    const world = buildWorld(scene, { shadows: !touch, photoUrl: jonasPhoto });
    scene.add(yaw);

    const e: Engine = {
      renderer,
      camera,
      yaw,
      pitch,
      world,
      keys: {},
      touchMove: { x: 0, y: 0 },
      velocity: new THREE.Vector3(),
      height: 0,
      verticalSpeed: 0,
      bob: 0,
      near: null,
      locked: false,
      dragging: false,
    };
    engine.current = e;

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    const look = (dx: number, dy: number, sensitivity: number) => {
      yaw.rotation.y -= dx * sensitivity;
      pitch.rotation.x = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, pitch.rotation.x - dy * sensitivity));
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const state = live.current;
      if (!state.started || state.panelId) return;
      e.keys[event.code] = true;
      if (event.code === "Space" || event.code.startsWith("Arrow")) event.preventDefault();
      if (event.code === "KeyE" && e.near) openPanel(e.near);
      const digit = /^Digit([1-5])$/.exec(event.code);
      if (digit) travelTo(SECTIONS[Number(digit[1]) - 1].id);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      e.keys[event.code] = false;
    };
    const releaseKeys = () => {
      e.keys = {};
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", releaseKeys);

    const onPointerLockChange = () => {
      e.locked = document.pointerLockElement === renderer.domElement;
      const state = live.current;
      // Esc releases the pointer: show a "click to continue" screen instead of leaving the visitor stuck.
      if (!e.locked && state.started && !state.panelId && !state.isTouch && !state.dragLook) {
        releaseKeys();
        setPaused(true);
      }
      if (e.locked) setPaused(false);
    };
    const onPointerLockError = () => setDragLook(true);
    document.addEventListener("pointerlockchange", onPointerLockChange);
    document.addEventListener("pointerlockerror", onPointerLockError);

    const onMouseMove = (event: MouseEvent) => {
      if (e.locked || (e.dragging && live.current.dragLook)) look(event.movementX, event.movementY, 0.0022);
    };
    const onMouseDown = () => {
      e.dragging = true;
    };
    const onMouseUp = () => {
      e.dragging = false;
    };
    document.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);

    const clock = new THREE.Clock();
    const visitedSet = live.current.visited;
    let frame = 0;

    const animate = () => {
      frame = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      const state = live.current;
      const active = state.started && !state.paused && !state.panelId;

      if (active) {
        const k = e.keys;
        let strafe = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0) + e.touchMove.x;
        let forward = (k.KeyS || k.ArrowDown ? 1 : 0) - (k.KeyW || k.ArrowUp ? 1 : 0) + e.touchMove.y;
        const length = Math.hypot(strafe, forward);
        const sprinting = k.ShiftLeft || k.ShiftRight;
        const speed = WALK_SPEED * (sprinting ? SPRINT_MULTIPLIER : 1);
        const target = new THREE.Vector3();
        if (length > 0.001) {
          strafe /= length;
          forward /= length;
          const angle = yaw.rotation.y;
          target.x = (forward * Math.sin(angle) + strafe * Math.cos(angle)) * speed;
          target.z = (forward * Math.cos(angle) - strafe * Math.sin(angle)) * speed;
        }
        // Ease towards the target velocity: starts and stops feel weighted instead of robotic.
        e.velocity.lerp(target, Math.min(1, dt * (length > 0.001 ? 10 : 8)));

        let x = yaw.position.x + e.velocity.x * dt;
        let z = yaw.position.z + e.velocity.z * dt;

        const fromCenter = Math.hypot(x, z);
        const limit = WORLD_RADIUS - 1.2;
        if (fromCenter > limit) {
          x *= limit / fromCenter;
          z *= limit / fromCenter;
        }
        for (const c of world.colliders) {
          const dx = x - c.x;
          const dz = z - c.z;
          const distance = Math.hypot(dx, dz);
          const minimum = c.r + PLAYER_RADIUS;
          if (distance < minimum && distance > 0.0001) {
            x = c.x + (dx / distance) * minimum;
            z = c.z + (dz / distance) * minimum;
          }
        }
        yaw.position.x = x;
        yaw.position.z = z;

        // Jump
        const grounded = e.height <= 0;
        if (k.Space && grounded) e.verticalSpeed = JUMP_SPEED;
        e.verticalSpeed -= GRAVITY * dt;
        e.height = Math.max(0, e.height + e.verticalSpeed * dt);
        if (e.height === 0 && e.verticalSpeed < 0) e.verticalSpeed = 0;

        // Head bob while walking
        const moving = Math.hypot(e.velocity.x, e.velocity.z);
        if (!reducedMotion && grounded && moving > 0.6) e.bob += dt * moving * 1.7;
        const bobOffset = reducedMotion ? 0 : Math.sin(e.bob) * 0.045 * Math.min(1, moving / WALK_SPEED);
        yaw.position.y = PLAYER_HEIGHT + e.height + bobOffset;

        // Which pavilion is in reach?
        let nearest: SectionId | null = null;
        let nearestDistance = INTERACT_DISTANCE;
        for (const p of world.pavilions) {
          const d = Math.hypot(x - p.pos.x, z - p.pos.z);
          if (d < nearestDistance) {
            nearest = p.meta.id;
            nearestDistance = d;
          }
        }
        if (nearest !== e.near) {
          e.near = nearest;
          setNear(nearest);
        }
      } else if (!state.started) {
        // Slow orbit behind the welcome screen.
        yaw.rotation.y += dt * 0.05;
      }

      world.update(dt, t, e.near, visitedSet);
      drawMinimap();
      renderer.render(scene, camera);
    };

    const drawMinimap = () => {
      const canvas = minimapRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const size = canvas.width;
      const scale = (size / 2 - 10) / WORLD_RADIUS;
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.translate(size / 2, size / 2);

      ctx.fillStyle = "rgba(60,122,74,0.35)";
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, WORLD_RADIUS * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      for (const p of world.pavilions) {
        ctx.strokeStyle = "rgba(255,255,255,0.28)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(p.pos.x * scale, p.pos.z * scale);
        ctx.stroke();
      }
      for (const p of world.pavilions) {
        const seen = visitedSet.has(p.meta.id);
        ctx.beginPath();
        ctx.arc(p.pos.x * scale, p.pos.z * scale, 6, 0, Math.PI * 2);
        ctx.fillStyle = seen ? p.meta.color : "rgba(10,12,34,0.9)";
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = p.meta.color;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.fillStyle = "#ffffff";
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Player: a view cone plus an arrow. Canvas rotation is clockwise, yaw is counter-clockwise.
      ctx.translate(yaw.position.x * scale, yaw.position.z * scale);
      ctx.rotate(-yaw.rotation.y);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 30, -Math.PI / 2 - 0.6, -Math.PI / 2 + 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(5.5, 6);
      ctx.lineTo(0, 3);
      ctx.lineTo(-5.5, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    animate();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", releaseKeys);
      window.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      document.removeEventListener("pointerlockerror", onPointerLockError);
      document.removeEventListener("mousemove", onMouseMove);
      renderer.domElement.removeEventListener("mousedown", onMouseDown);
      if (document.pointerLockElement) document.exitPointerLock();
      world.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      engine.current = null;
    };
  }, [openPanel, travelTo]);

  // ---- Touch controls ----
  const dpad = useRef({ up: false, down: false, left: false, right: false });
  const lookTouch = useRef<{ id: number; x: number; y: number } | null>(null);

  const setDpad = (dir: keyof typeof dpad.current, pressed: boolean) => (event: ReactTouchEvent) => {
    event.preventDefault();
    dpad.current[dir] = pressed;
    const d = dpad.current;
    if (!engine.current) return;
    engine.current.touchMove.x = (d.right ? 1 : 0) - (d.left ? 1 : 0);
    engine.current.touchMove.y = (d.down ? 1 : 0) - (d.up ? 1 : 0);
  };

  const onLookStart = (event: ReactTouchEvent) => {
    const touch = event.changedTouches[0];
    lookTouch.current = { id: touch.identifier, x: touch.clientX, y: touch.clientY };
  };
  const onLookMove = (event: ReactTouchEvent) => {
    const e = engine.current;
    const current = lookTouch.current;
    if (!e || !current) return;
    for (const touch of Array.from(event.changedTouches)) {
      if (touch.identifier !== current.id) continue;
      e.yaw.rotation.y -= (touch.clientX - current.x) * 0.004;
      e.pitch.rotation.x = Math.max(
        -MAX_PITCH,
        Math.min(MAX_PITCH, e.pitch.rotation.x - (touch.clientY - current.y) * 0.004)
      );
      current.x = touch.clientX;
      current.y = touch.clientY;
    }
  };
  const onLookEnd = (event: ReactTouchEvent) => {
    for (const touch of Array.from(event.changedTouches)) {
      if (touch.identifier === lookTouch.current?.id) lookTouch.current = null;
    }
  };

  const handleStart = () => {
    setStarted(true);
    const e = engine.current;
    if (e) {
      e.yaw.rotation.y = 0;
      e.pitch.rotation.x = 0.05;
    }
    if (!isTouch) {
      lockPointer();
      return;
    }
    // Best effort: Android Chrome allows locking orientation in fullscreen. Ignored elsewhere
    // (notably iOS Safari), where the rotate-device overlay is the fallback.
    document.documentElement
      .requestFullscreen?.()
      .then(() => {
        const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
        orientation.lock?.("landscape").catch(() => {});
      })
      .catch(() => {});
  };

  const resume = () => {
    setPaused(false);
    lockPointer();
  };

  const closePanel = useCallback(() => {
    setPanelId(null);
    // Closing comes from a click or key press, so the browser allows locking the pointer again.
    requestAnimationFrame(() => {
      if (!live.current.dragLook) lockPointer();
    });
  }, [lockPointer]);

  if (webglFailed) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center text-center px-6">
        <h1 className="display-lg mb-3">O 3D não pôde ser carregado</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          Seu navegador ou dispositivo não tem WebGL disponível no momento. O mesmo conteúdo está nas outras
          duas experiências.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link to="/landing" className="px-6 py-3 bg-foreground text-background text-sm font-medium">
            Abrir a landing page
          </Link>
          <Link to="/2d" className="px-6 py-3 border border-border text-sm font-medium">
            Jogar a versão 2D
          </Link>
        </div>
      </div>
    );
  }

  const nearMeta = near ? sectionById(near) : null;
  const allVisited = visited.length === SECTIONS.length;
  const dpadButton =
    "absolute w-12 h-12 rounded-lg bg-card/80 border border-border active:bg-primary/30 active:border-primary/60 flex items-center justify-center text-foreground text-lg";

  return (
    <div className="fixed inset-0 bg-background overflow-hidden select-none">
      <div ref={mountRef} className="absolute inset-0" />

      {isTouch && isPortrait && (
        <div className="fixed inset-0 z-[150] bg-background flex flex-col items-center justify-center text-center px-8">
          <div className="text-5xl mb-5 animate-bounce" style={{ animationDuration: "1.8s" }} aria-hidden>
            📱↻
          </div>
          <p className="font-display text-lg font-semibold mb-2">Gire seu aparelho</p>
          <p className="text-muted-foreground text-sm max-w-xs">
            O mundo 3D funciona melhor na horizontal. Deite o celular ou tablet para continuar.
          </p>
          <Link to="/" className="mt-6 text-xs text-muted-foreground underline underline-offset-4">
            Voltar ao início
          </Link>
        </div>
      )}

      <Link
        to="/"
        className="fixed top-4 left-4 z-[80] flex items-center gap-2 px-3.5 py-2 rounded-full bg-card/80 border border-border text-xs text-foreground backdrop-blur-md hover:border-primary/50 transition-colors"
      >
        ← Voltar ao início
      </Link>

      {!started && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center text-center px-6 bg-gradient-to-b from-background/40 via-background/55 to-background/85">
          <span className="label-sm text-primary-glow mb-3">Experiência imersiva</span>
          <h1 className="display-lg mb-3">
            Bem-vindo ao meu <span className="text-primary">portfólio 3D</span>
          </h1>
          <p className="text-foreground/75 max-w-md mb-8 text-sm md:text-base">
            Caminhe pelo parque e visite os cinco pavilhões para conhecer minha trajetória, formação, skills,
            projetos e contato.
          </p>
          <button
            onClick={handleStart}
            autoFocus
            className="px-8 py-3.5 rounded-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground font-semibold text-sm shadow-glow hover:scale-[1.03] transition-transform"
          >
            Entrar no mundo
          </button>
          {isTouch ? (
            <p className="text-foreground/70 text-xs mt-6">
              Use o direcional para andar, arraste a tela para olhar e toque em ABRIR nos pavilhões.
            </p>
          ) : (
            <div className="flex gap-x-5 gap-y-2 flex-wrap justify-center mt-7 text-foreground/70 text-xs">
              <span><Key>W A S D</Key>andar</span>
              <span><Key>Shift</Key>correr</span>
              <span><Key>Espaço</Key>pular</span>
              <span><Key>E</Key>abrir pavilhão</span>
              <span><Key>1–5</Key>ir direto</span>
            </div>
          )}
        </div>
      )}

      {started && paused && !panelId && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center text-center px-6 bg-background/75 backdrop-blur-sm">
          <h2 className="display-lg mb-6">Pausado</h2>
          <button
            onClick={resume}
            autoFocus
            className="px-8 py-3.5 rounded-full bg-foreground text-background font-semibold text-sm mb-8"
          >
            Clique para continuar
          </button>
          <span className="label-sm text-muted-foreground mb-3">Ou abra uma seção direto</span>
          <div className="flex flex-wrap justify-center gap-2 max-w-lg">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  travelTo(s.id);
                  openPanel(s.id);
                  setPaused(false);
                }}
                className="px-4 py-2 border text-xs text-foreground bg-card/60 hover:bg-card transition-colors"
                style={{ borderColor: s.color }}
              >
                {s.short}
              </button>
            ))}
          </div>
        </div>
      )}

      {started && (
        <div className="fixed inset-0 z-20 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/90 ring-1 ring-black/30" />

          <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
            <canvas
              ref={minimapRef}
              width={280}
              height={280}
              aria-hidden
              className="w-[120px] h-[120px] md:w-[140px] md:h-[140px] rounded-2xl bg-card/70 border border-border backdrop-blur-md"
            />
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/80 border border-border backdrop-blur-md"
              aria-label={`${visited.length} de ${SECTIONS.length} pavilhões visitados`}
            >
              {SECTIONS.map((s) => (
                <span
                  key={s.id}
                  title={s.name}
                  className="w-2.5 h-2.5 rounded-full border"
                  style={{ borderColor: s.color, backgroundColor: visited.includes(s.id) ? s.color : "transparent" }}
                />
              ))}
              <span className="text-[11px] text-foreground ml-1 tabular-nums">
                {visited.length}/{SECTIONS.length}
              </span>
            </div>
          </div>

          {allVisited && !panelId && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-full bg-card/90 border border-primary/50 text-xs text-foreground backdrop-blur-md pointer-events-auto flex items-center gap-3">
              <span>Você visitou todos os pavilhões.</span>
              <Link to="/2d" className="text-primary-glow underline underline-offset-4">
                Jogar a versão 2D
              </Link>
            </div>
          )}

          {nearMeta && !panelId && !paused && (
            <button
              onClick={() => openPanel(nearMeta.id)}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-full bg-card/90 border text-sm text-foreground backdrop-blur-md pointer-events-auto"
              style={{ borderColor: nearMeta.color }}
            >
              {!isTouch && <Key>E</Key>}
              abrir {nearMeta.name}
            </button>
          )}

          {!isTouch && (
            <p className="absolute bottom-5 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-background/45 backdrop-blur-sm text-[11px] text-foreground/85 tracking-wide text-center whitespace-nowrap">
              WASD andar · Shift correr · Espaço pular · E abrir · 1–5 ir direto ·{" "}
              {dragLook ? "arraste para olhar" : "Esc pausar"}
            </p>
          )}
        </div>
      )}

      {started && isTouch && !panelId && (
        <div className="fixed inset-0 z-[25]">
          <div className="absolute inset-0" onTouchStart={onLookStart} onTouchMove={onLookMove} onTouchEnd={onLookEnd} />

          <div className="absolute bottom-6 left-6 w-40 h-28 select-none" style={{ touchAction: "none" }}>
            <button
              onTouchStart={setDpad("up", true)}
              onTouchEnd={setDpad("up", false)}
              onTouchCancel={setDpad("up", false)}
              aria-label="Andar para frente"
              className={`${dpadButton} top-0 left-1/2 -translate-x-1/2`}
            >
              ▲
            </button>
            <button
              onTouchStart={setDpad("left", true)}
              onTouchEnd={setDpad("left", false)}
              onTouchCancel={setDpad("left", false)}
              aria-label="Andar para a esquerda"
              className={`${dpadButton} bottom-0 left-0`}
            >
              ◀
            </button>
            <button
              onTouchStart={setDpad("down", true)}
              onTouchEnd={setDpad("down", false)}
              onTouchCancel={setDpad("down", false)}
              aria-label="Andar para trás"
              className={`${dpadButton} bottom-0 left-1/2 -translate-x-1/2`}
            >
              ▼
            </button>
            <button
              onTouchStart={setDpad("right", true)}
              onTouchEnd={setDpad("right", false)}
              onTouchCancel={setDpad("right", false)}
              aria-label="Andar para a direita"
              className={`${dpadButton} bottom-0 right-0`}
            >
              ▶
            </button>
          </div>

          <button
            onClick={() => near && openPanel(near)}
            disabled={!near}
            className="absolute bottom-9 right-6 w-16 h-16 rounded-full bg-primary/30 border border-primary/60 text-foreground text-[11px] font-semibold flex items-center justify-center disabled:opacity-40"
          >
            ABRIR
          </button>
        </div>
      )}

      {panelId && (
        <SectionDialog title={sectionById(panelId).name} accent={sectionById(panelId).color} onClose={closePanel}>
          <PortfolioPanel id={panelId} />
        </SectionDialog>
      )}
    </div>
  );
};

export default Scene3D;
