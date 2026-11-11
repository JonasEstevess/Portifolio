import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, Gem, Pause, Play, RotateCcw } from "lucide-react";
import jonasPhoto from "@/assets/jonas-hero-photo.jpeg";
import { PortfolioPanel } from "@/components/shared/PortfolioPanel";
import { SectionDialog } from "@/components/shared/SectionDialog";
import { SECTIONS, sectionById, type SectionId } from "@/data/sections";
import { Explorer, idleInput, type ExplorerEvent, type ExplorerHud } from "@/game3d/explorer";
import { HUB_RADIUS, ISLAND_DISTANCE, ISLAND_RADIUS } from "@/game3d/world";
import { usePrefersReducedMotion } from "@/hooks/use-reduced-motion";
import { WorldRenderer } from "./WorldRenderer";

type Phase = "intro" | "playing" | "paused" | "won";

const BEST_KEY = "portfolio-game3d-best";
const STEP = 1 / 60;
const MAX_PITCH = Math.PI / 2.15;
const STICK_RADIUS = 56;

const formatTime = (seconds: number) => {
  const total = Math.floor(seconds);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

const readBest = () => {
  try {
    const value = Number(localStorage.getItem(BEST_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
};

const Key = ({ children }: { children: string }) => (
  <kbd className="px-1.5 py-0.5 border border-white/25 bg-white/5 text-[10px] font-mono text-white/90">{children}</kbd>
);

const hudKey = (h: ExplorerHud) =>
  [h.status, h.crystals, h.visited.length, h.near, h.portalOpen, h.falls, Math.floor(h.time)].join("|");

export const Scene3D = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const explorerRef = useRef<Explorer | null>(null);
  const rendererRef = useRef<WorldRenderer | null>(null);
  const reduced = usePrefersReducedMotion();

  // Live control state, read by the loop every frame.
  const look = useRef({ yaw: 0, pitch: 0 });
  const keys = useRef<Record<string, boolean>>({});
  const stick = useRef({ x: 0, y: 0 });
  const pressed = useRef({ jump: false, interact: false });

  const [phase, setPhase] = useState<Phase>("intro");
  const [panel, setPanel] = useState<SectionId | null>(null);
  const [hud, setHud] = useState<ExplorerHud | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const [isTouch, setIsTouch] = useState(false);
  const [dragLook, setDragLook] = useState(false);
  const [stickView, setStickView] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null);
  const [failed, setFailed] = useState(false);

  const live = useRef({ phase, panel, isTouch, dragLook });
  live.current = { phase, panel, isTouch, dragLook };

  const handleEvent = useCallback((event: ExplorerEvent) => {
    switch (event.type) {
      case "crystal":
        rendererRef.current?.collectCrystal(event.index);
        break;
      case "fall":
        setToast("Você caiu no vazio — de volta à última plataforma");
        break;
      case "open":
        if (document.pointerLockElement) document.exitPointerLock();
        setPanel(event.section);
        break;
      case "portal":
        setToast("O portal se abriu no centro do mundo");
        break;
      case "won":
        if (document.pointerLockElement) document.exitPointerLock();
        setPhase("won");
        break;
    }
  }, []);

  const lockPointer = useCallback(() => {
    const canvas = mountRef.current?.querySelector("canvas");
    if (!canvas || live.current.isTouch || live.current.dragLook) return;
    try {
      const result = canvas.requestPointerLock() as unknown as Promise<void> | undefined;
      result?.catch?.(() => setDragLook(true));
    } catch {
      setDragLook(true);
    }
  }, []);

  const startWorld = useCallback(() => {
    const mount = mountRef.current;
    if (!mount) return false;
    const explorer = new Explorer();
    explorer.onEvent = handleEvent;
    rendererRef.current?.dispose();
    try {
      rendererRef.current = new WorldRenderer(mount, explorer, {
        reducedMotion: reduced,
        lowPower: window.matchMedia("(max-width: 767px), (pointer: coarse)").matches,
        photoUrl: jonasPhoto,
      });
    } catch {
      setFailed(true);
      return false;
    }
    explorerRef.current = explorer;
    // Start facing the first island.
    const first = explorer.world.islands[0];
    look.current = { yaw: Math.atan2(-(first.x - explorer.position.x), -(first.z - explorer.position.z)), pitch: 0 };
    setHud(explorer.hud());
    return true;
  }, [handleEvent, reduced]);

  // ---- Engine -----------------------------------------------------------
  useEffect(() => {
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
    setBest(readBest());
    if (!startWorld()) return;

    const onResize = () => rendererRef.current?.resize();
    window.addEventListener("resize", onResize);

    let frame = 0;
    let last = performance.now();
    let acc = 0;
    let lastKey = "";
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const explorer = explorerRef.current;
      if (!explorer) return;
      const state = live.current;
      const running = state.phase === "playing" && state.panel === null;

      if (running) {
        const k = keys.current;
        const input = idleInput();
        input.forward = (k.forward ? 1 : 0) - (k.back ? 1 : 0) - stick.current.y;
        input.strafe = (k.right ? 1 : 0) - (k.left ? 1 : 0) + stick.current.x;
        input.yaw = look.current.yaw;
        input.sprint = !!k.sprint || Math.hypot(stick.current.x, stick.current.y) > 0.92;
        acc += dt;
        while (acc >= STEP) {
          input.jump = !!k.jump || pressed.current.jump;
          input.interact = pressed.current.interact;
          pressed.current.interact = false;
          explorer.step(input, STEP);
          acc -= STEP;
        }
        const next = explorer.hud();
        const key = hudKey(next);
        if (key !== lastKey) {
          lastKey = key;
          setHud(next);
        }
      } else {
        acc = 0;
        // A slow turn behind the title screen shows the world off.
        if (state.phase === "intro" && !reduced) look.current.yaw += dt * 0.06;
      }

      rendererRef.current?.render(dt, now / 1000, look.current.yaw, look.current.pitch);
      drawMinimap(explorer);
    };

    const drawMinimap = (explorer: Explorer) => {
      const canvas = minimapRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      const size = canvas.width;
      const scale = (size / 2 - 8) / (ISLAND_DISTANCE + ISLAND_RADIUS);
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.strokeStyle = "rgba(255,255,255,0.45)";
      ctx.lineWidth = 3;
      for (const segment of explorer.world.segments) {
        const dx = Math.cos(segment.angle) * segment.halfLength;
        const dz = Math.sin(segment.angle) * segment.halfLength;
        ctx.beginPath();
        ctx.moveTo((segment.x - dx) * scale, (segment.z - dz) * scale);
        ctx.lineTo((segment.x + dx) * scale, (segment.z + dz) * scale);
        ctx.stroke();
      }
      ctx.fillStyle = explorer.portalOpen ? "#7cf5c4" : "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.arc(0, 0, HUB_RADIUS * scale, 0, Math.PI * 2);
      ctx.fill();
      explorer.world.islands.forEach((island, i) => {
        ctx.beginPath();
        ctx.arc(island.x * scale, island.z * scale, ISLAND_RADIUS * scale, 0, Math.PI * 2);
        ctx.fillStyle = explorer.visited[i] ? SECTIONS[i].color : "rgba(10,12,34,0.9)";
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = SECTIONS[i].color;
        ctx.stroke();
      });
      // Player arrow. Canvas rotation is clockwise while yaw is counter-clockwise.
      ctx.translate(explorer.position.x * scale, explorer.position.z * scale);
      ctx.rotate(-look.current.yaw);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(6, 7);
      ctx.lineTo(0, 3.5);
      ctx.lineTo(-6, 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      if (document.pointerLockElement) document.exitPointerLock();
      rendererRef.current?.dispose();
      rendererRef.current = null;
      explorerRef.current = null;
    };
  }, [startWorld, reduced]);

  const play = useCallback(() => {
    // The title screen slowly pans; the game itself starts looking down the first bridge.
    const explorer = explorerRef.current;
    if (live.current.phase === "intro" && explorer) {
      const first = explorer.world.islands[0];
      look.current = { yaw: Math.atan2(-(first.x - explorer.position.x), -(first.z - explorer.position.z)), pitch: 0 };
    }
    setPhase("playing");
    lockPointer();
  }, [lockPointer]);

  const restart = useCallback(() => {
    if (!startWorld()) return;
    setPanel(null);
    play();
  }, [startWorld, play]);

  const closePanel = useCallback(() => {
    setPanel(null);
    // Closing is a click or key press, so the browser lets us capture the mouse again.
    if (live.current.phase === "playing") requestAnimationFrame(lockPointer);
  }, [lockPointer]);

  const openFromMenu = useCallback((section: SectionId) => {
    explorerRef.current?.markVisited(section);
    setPanel(section);
  }, []);

  const travel = useCallback((section: SectionId) => {
    const explorer = explorerRef.current;
    if (!explorer) return;
    look.current = { yaw: explorer.travelTo(section), pitch: 0.05 };
  }, []);

  // ---- Keyboard and mouse ----------------------------------------------
  useEffect(() => {
    const map: Record<string, string> = {
      KeyW: "forward",
      ArrowUp: "forward",
      KeyS: "back",
      ArrowDown: "back",
      KeyA: "left",
      ArrowLeft: "left",
      KeyD: "right",
      ArrowRight: "right",
      ShiftLeft: "sprint",
      ShiftRight: "sprint",
      Space: "jump",
    };
    const down = (e: KeyboardEvent) => {
      const state = live.current;
      if (state.panel) return;
      if (state.phase === "intro") {
        if (e.code === "Enter" || e.code === "Space") {
          e.preventDefault();
          play();
        }
        return;
      }
      if (state.phase === "paused") {
        if (e.code === "KeyP" || e.code === "Enter") play();
        return;
      }
      if (state.phase !== "playing") return;
      if (map[e.code]) keys.current[map[e.code]] = true;
      else if (e.code === "KeyE" || e.code === "Enter") pressed.current.interact = true;
      else if (e.code === "KeyP") setPhase("paused");
      else if (/^Digit[1-5]$/.test(e.code)) travel(SECTIONS[Number(e.code.slice(5)) - 1].id);
      else return;
      e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      if (map[e.code]) keys.current[map[e.code]] = false;
    };
    const release = () => {
      keys.current = {};
    };
    const onLockChange = () => {
      const state = live.current;
      // Esc releases the mouse: show the pause menu instead of leaving a frozen camera.
      if (!document.pointerLockElement && state.phase === "playing" && !state.panel && !state.isTouch && !state.dragLook) {
        release();
        setPhase("paused");
      }
    };
    const onLockError = () => setDragLook(true);
    const onMouseMove = (e: MouseEvent) => {
      const state = live.current;
      if (state.phase !== "playing" || state.panel) return;
      const locked = document.pointerLockElement !== null;
      if (!locked && !(state.dragLook && e.buttons === 1)) return;
      look.current.yaw -= e.movementX * 0.0023;
      look.current.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, look.current.pitch - e.movementY * 0.0023));
    };
    const onHidden = () => {
      release();
      if (document.hidden && live.current.phase === "playing") setPhase("paused");
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", onHidden);
    document.addEventListener("pointerlockchange", onLockChange);
    document.addEventListener("pointerlockerror", onLockError);
    document.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", onHidden);
      document.removeEventListener("pointerlockchange", onLockChange);
      document.removeEventListener("pointerlockerror", onLockError);
      document.removeEventListener("mousemove", onMouseMove);
    };
  }, [play, travel]);

  // Nothing may stay "held" while a menu or dialog is up.
  useEffect(() => {
    if (panel || phase !== "playing") {
      keys.current = {};
      stick.current = { x: 0, y: 0 };
      pressed.current = { jump: false, interact: false };
      setStickView(null);
    }
  }, [panel, phase]);

  useEffect(() => {
    if (phase !== "won" || !hud) return;
    const previous = readBest();
    if (previous === null || hud.time < previous) {
      setBest(hud.time);
      try {
        localStorage.setItem(BEST_KEY, String(hud.time));
      } catch {
        // Best time just won't persist.
      }
    }
    // Only when the run ends.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(timer);
  }, [toast]);

  // ---- Touch: left thumb walks (a stick appears where it lands), right thumb looks ----
  const touches = useRef<{ move: number | null; look: number | null; origin: { x: number; y: number }; last: { x: number; y: number } }>({
    move: null,
    look: null,
    origin: { x: 0, y: 0 },
    last: { x: 0, y: 0 },
  });
  const onTouchDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    const t = touches.current;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (e.clientX < window.innerWidth * 0.45 && t.move === null) {
      t.move = e.pointerId;
      t.origin = { x: e.clientX, y: e.clientY };
      setStickView({ x: e.clientX, y: e.clientY, dx: 0, dy: 0 });
    } else if (t.look === null) {
      t.look = e.pointerId;
      t.last = { x: e.clientX, y: e.clientY };
    }
  };
  const onTouchMove = (e: React.PointerEvent) => {
    const t = touches.current;
    if (e.pointerId === t.move) {
      let dx = e.clientX - t.origin.x;
      let dy = e.clientY - t.origin.y;
      const length = Math.hypot(dx, dy);
      if (length > STICK_RADIUS) {
        dx *= STICK_RADIUS / length;
        dy *= STICK_RADIUS / length;
      }
      stick.current = { x: dx / STICK_RADIUS, y: dy / STICK_RADIUS };
      setStickView({ x: t.origin.x, y: t.origin.y, dx, dy });
    } else if (e.pointerId === t.look) {
      look.current.yaw -= (e.clientX - t.last.x) * 0.0052;
      look.current.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, look.current.pitch - (e.clientY - t.last.y) * 0.0052));
      t.last = { x: e.clientX, y: e.clientY };
    }
  };
  const onTouchUp = (e: React.PointerEvent) => {
    const t = touches.current;
    if (e.pointerId === t.move) {
      t.move = null;
      stick.current = { x: 0, y: 0 };
      setStickView(null);
    } else if (e.pointerId === t.look) {
      t.look = null;
    }
  };

  if (failed) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center text-center px-6">
        <h1 className="display-lg mb-3">O mundo 3D não pôde ser carregado</h1>
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

  const nearMeta = hud?.near ? sectionById(hud.near) : null;
  const menu = "fixed inset-0 z-30 flex flex-col items-center justify-center text-center px-5 py-6 overflow-y-auto text-white";
  const objective = !hud
    ? ""
    : hud.portalOpen
      ? "Atravesse o portal no centro"
      : `Monumentos ${hud.visited.length}/${SECTIONS.length}`;

  return (
    <div className="fixed inset-0 bg-[#04050d] overflow-hidden select-none text-white">
      <div
        ref={mountRef}
        className="absolute inset-0 touch-none"
        onPointerDown={onTouchDown}
        onPointerMove={onTouchMove}
        onPointerUp={onTouchUp}
        onPointerCancel={onTouchUp}
        onClick={() => phase === "playing" && !panel && lockPointer()}
        aria-label="Mundo 3D em primeira pessoa"
        role="img"
      />

      {/* HUD */}
      {hud && phase === "playing" && (
        <>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/90 ring-1 ring-black/40 pointer-events-none" />

          <div className="absolute top-0 inset-x-0 z-10 p-3 sm:p-5 flex items-start justify-between gap-3 pointer-events-none">
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-1.5 text-xs sm:text-sm font-mono tabular-nums" title="Cristais coletados">
                <Gem className="w-4 h-4 text-[#ffd866]" />
                {hud.crystals}/{hud.totalCrystals}
              </span>
              <div className="flex gap-1.5" aria-label={`${hud.visited.length} de ${SECTIONS.length} monumentos abertos`}>
                {SECTIONS.map((s) => (
                  <span
                    key={s.id}
                    title={s.name}
                    className="w-3 h-3 rounded-full border-2"
                    style={{ borderColor: s.color, backgroundColor: hud.visited.includes(s.id) ? s.color : "transparent" }}
                  />
                ))}
              </div>
            </div>

            <p
              className="label-sm px-3 py-1.5 bg-black/45 backdrop-blur-sm border border-white/15 text-center max-w-[46vw]"
              style={hud.portalOpen ? { borderColor: "#7cf5c4", color: "#7cf5c4" } : undefined}
              aria-live="polite"
            >
              {objective}
            </p>

            <div className="flex flex-col items-end gap-2 pointer-events-auto">
              <button
                onClick={() => {
                  if (document.pointerLockElement) document.exitPointerLock();
                  setPhase("paused");
                }}
                aria-label="Pausar"
                className="w-10 h-10 flex items-center justify-center bg-black/45 border border-white/20 backdrop-blur-sm"
              >
                <Pause className="w-4 h-4" />
              </button>
              <canvas
                ref={minimapRef}
                width={240}
                height={240}
                aria-hidden
                className="w-[92px] h-[92px] sm:w-[124px] sm:h-[124px] rounded-full bg-black/45 border border-white/15 backdrop-blur-sm pointer-events-none"
              />
            </div>
          </div>

          {toast && !panel && (
            <p role="status" className="absolute z-10 top-20 inset-x-0 mx-auto w-fit max-w-[88vw] px-4 py-2 bg-black/65 border border-white/20 backdrop-blur-sm text-xs sm:text-sm text-center">
              {toast}
            </p>
          )}

          {nearMeta && !panel && (
            <button
              onClick={() => (pressed.current.interact = true)}
              className="absolute z-10 left-1/2 -translate-x-1/2 bottom-[30%] sm:bottom-28 flex items-center gap-2 px-5 py-3 bg-black/70 border backdrop-blur-sm text-sm"
              style={{ borderColor: nearMeta.color }}
            >
              {!isTouch && <Key>E</Key>}
              {isTouch ? "Toque para abrir" : "abrir"} {nearMeta.name}
            </button>
          )}

          {!isTouch && !panel && (
            <p className="absolute z-10 bottom-5 inset-x-0 text-center text-[11px] text-white/55 tracking-wide pointer-events-none px-4">
              WASD andar · Shift correr · Espaço pular · E abrir · 1–5 ir direto ·{" "}
              {dragLook ? "arraste para olhar · P pausar" : "Esc pausar"}
            </p>
          )}

          {/* Touch controls */}
          {isTouch && !panel && (
            <>
              {stickView ? (
                <div
                  className="absolute z-10 w-28 h-28 rounded-full border border-white/30 bg-white/5 pointer-events-none"
                  style={{ left: stickView.x - 56, top: stickView.y - 56 }}
                >
                  <div
                    className="absolute left-1/2 top-1/2 w-12 h-12 -ml-6 -mt-6 rounded-full bg-white/50"
                    style={{ transform: `translate(${stickView.dx}px, ${stickView.dy}px)` }}
                  />
                </div>
              ) : (
                <div className="absolute z-10 left-8 bottom-[max(2rem,env(safe-area-inset-bottom))] w-28 h-28 rounded-full border border-dashed border-white/25 flex items-center justify-center text-[10px] text-white/50 pointer-events-none">
                  ANDAR
                </div>
              )}
              <button
                aria-label="Pular"
                className="absolute z-10 right-6 bottom-[max(2rem,env(safe-area-inset-bottom))] w-20 h-20 rounded-full border border-white/30 bg-black/40 backdrop-blur-sm flex items-center justify-center active:bg-primary/60 touch-none"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  pressed.current.jump = true;
                }}
                onPointerUp={() => (pressed.current.jump = false)}
                onPointerCancel={() => (pressed.current.jump = false)}
                onContextMenu={(e) => e.preventDefault()}
              >
                <ArrowUp className="w-7 h-7" />
              </button>
            </>
          )}
        </>
      )}

      {/* Intro */}
      {phase === "intro" && (
        <div className={`${menu} bg-[#04050d]/55 backdrop-blur-[1px]`}>
          <p className="label-sm text-primary-glow mb-3">Portfólio em primeira pessoa</p>
          <h1 className="font-display font-semibold uppercase leading-[0.9] tracking-tight text-[clamp(2.4rem,min(11vw,18vh),7rem)] mb-4">
            Ilhas do <span className="text-primary">Código</span>
          </h1>
          <p className="text-sm sm:text-base text-white/80 max-w-md mb-6">
            Caminhe por um arquipélago flutuando no espaço. Cruze as pontes, salte os vãos, colete cristais e
            desperte os cinco monumentos de luz. Depois, o portal se abre.
          </p>
          <button onClick={play} autoFocus className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-[#04050d] text-sm font-semibold">
            <Play className="w-4 h-4 fill-current" /> Entrar no mundo
          </button>
          {isTouch ? (
            <p className="mt-6 text-xs text-white/65 max-w-xs">
              Polegar esquerdo anda, polegar direito olha. Empurre o direcional até o fim para correr.
            </p>
          ) : (
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-6 text-[11px] text-white/65">
              <span><Key>W A S D</Key> andar</span>
              <span><Key>Mouse</Key> olhar</span>
              <span><Key>Shift</Key> correr</span>
              <span><Key>Espaço</Key> pular</span>
              <span><Key>E</Key> abrir</span>
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-6 text-xs text-white/55">
            <Link to="/" className="underline underline-offset-4">
              ← Voltar ao início
            </Link>
            <Link to="/landing" className="underline underline-offset-4">
              Prefere só ler? Landing page
            </Link>
          </div>
        </div>
      )}

      {/* Pause */}
      {phase === "paused" && !panel && (
        <div className={`${menu} bg-[#04050d]/85`}>
          <h2 className="font-display text-3xl sm:text-5xl font-semibold uppercase mb-5">Pausado</h2>
          <div className="flex flex-wrap justify-center gap-2 mb-7">
            <button onClick={play} autoFocus className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[#04050d] text-sm font-semibold">
              <Play className="w-4 h-4 fill-current" /> Continuar
            </button>
            <button onClick={restart} className="inline-flex items-center gap-2 px-5 py-2.5 border border-white/30 text-sm">
              <RotateCcw className="w-4 h-4" /> Reiniciar
            </button>
            <Link to="/" className="inline-flex items-center px-5 py-2.5 border border-white/30 text-sm">
              Sair
            </Link>
          </div>
          <p className="label-sm text-white/50 mb-3">Ir direto a um monumento</p>
          <div className="flex flex-wrap justify-center gap-2 max-w-lg mb-6">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  travel(s.id);
                  play();
                }}
                className="px-4 py-2 border text-xs hover:bg-white/10 transition-colors"
                style={{ borderColor: s.color }}
              >
                {s.short}
              </button>
            ))}
          </div>
          <p className="label-sm text-white/50 mb-3">Ou ler sem jogar</p>
          <div className="flex flex-wrap justify-center gap-2 max-w-lg">
            {SECTIONS.map((s) => (
              <button key={s.id} onClick={() => openFromMenu(s.id)} className="px-4 py-2 border border-white/25 text-xs hover:bg-white/10 transition-colors">
                {s.short}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Victory */}
      {phase === "won" && hud && !panel && (
        <div className={`${menu} bg-[#04050d]/80`}>
          <p className="label-sm text-[#7cf5c4] mb-3">Portal atravessado</p>
          <h2 className="font-display font-semibold uppercase leading-[0.9] tracking-tight text-[clamp(2rem,min(9vw,14vh),5rem)] mb-6">
            Mundo <span className="text-primary">explorado</span>
          </h2>
          <dl className="grid grid-cols-3 gap-2 sm:gap-3 mb-5 text-xs">
            {[
              ["Tempo", formatTime(hud.time)],
              ["Cristais", `${hud.crystals}/${hud.totalCrystals}`],
              ["Quedas", String(hud.falls)],
            ].map(([label, value]) => (
              <div key={label} className="border border-white/20 px-4 py-2.5">
                <dd className="font-display text-xl sm:text-2xl tabular-nums">{value}</dd>
                <dt className="text-white/55">{label}</dt>
              </div>
            ))}
          </dl>
          {best !== null && <p className="text-xs text-white/60 mb-5">Melhor tempo: {formatTime(best)}</p>}
          <div className="flex flex-wrap justify-center gap-2">
            <button onClick={() => setPanel("contact")} autoFocus className="px-5 py-2.5 bg-white text-[#04050d] text-sm font-semibold">
              Falar comigo
            </button>
            <button onClick={restart} className="inline-flex items-center gap-2 px-5 py-2.5 border border-white/30 text-sm">
              <RotateCcw className="w-4 h-4" /> Explorar de novo
            </button>
            <Link to="/" className="px-5 py-2.5 border border-white/30 text-sm">
              Outras experiências
            </Link>
          </div>
        </div>
      )}

      {panel && (
        <SectionDialog title={sectionById(panel).name} accent={sectionById(panel).color} onClose={closePanel}>
          <PortfolioPanel id={panel} />
        </SectionDialog>
      )}
    </div>
  );
};

export default Scene3D;
