import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, ArrowUp, Bug, GitCommitHorizontal, Heart, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { PortfolioPanel } from "@/components/shared/PortfolioPanel";
import { SectionDialog } from "@/components/shared/SectionDialog";
import { SECTIONS, sectionById, type SectionId } from "@/data/sections";
import { GameAudio } from "@/game2d/audio";
import { MAX_HEARTS, STEP, VIEW_H, VIEW_W } from "@/game2d/constants";
import { emptyInput, Game, type Hud } from "@/game2d/game";
import { Renderer } from "@/game2d/render";

type Phase = "intro" | "playing" | "paused" | "won";

const BEST_KEY = "portfolio-game2d-best";

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

export const Game2D = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const audioRef = useRef<GameAudio | null>(null);
  const inputRef = useRef(emptyInput());

  const [phase, setPhase] = useState<Phase>("intro");
  const [panel, setPanel] = useState<SectionId | null>(null);
  const [hud, setHud] = useState<Hud | null>(null);
  const [muted, setMuted] = useState(false);
  const [best, setBest] = useState<number | null>(null);
  const [newRecord, setNewRecord] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [size, setSize] = useState({ w: VIEW_W, h: VIEW_H });
  const [banner, setBanner] = useState<number | null>(null);

  // The loop and key handlers live for the whole mount; they read these refs instead of stale state.
  const phaseRef = useRef<Phase>("intro");
  const panelRef = useRef<SectionId | null>(null);
  phaseRef.current = phase;
  panelRef.current = panel;

  const newGame = useCallback(() => {
    const game = new Game();
    game.onHud = setHud;
    game.onSfx = (name) => audioRef.current?.play(name);
    game.onOpenTerminal = (section) => setPanel(section);
    gameRef.current = game;
    rendererRef.current = new Renderer(game);
    inputRef.current = emptyInput();
    setHud(game.hud());
    setNewRecord(false);
  }, []);

  // Setup + main loop
  useEffect(() => {
    const audio = new GameAudio();
    audioRef.current = audio;
    setMuted(audio.muted);
    setBest(readBest());
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
    newGame();

    const ctx = canvasRef.current?.getContext("2d");
    let frame = 0;
    let last = performance.now();
    let acc = 0;

    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const game = gameRef.current;
      if (!game || !ctx) return;

      const running = phaseRef.current === "playing" && panelRef.current === null;
      if (running) {
        acc += dt;
        while (acc >= STEP) {
          game.step(inputRef.current, STEP);
          inputRef.current.jumpPressed = false;
          inputRef.current.interactPressed = false;
          acc -= STEP;
        }
      } else {
        acc = 0;
      }
      rendererRef.current?.draw(ctx, now / 1000);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      audio.dispose();
    };
  }, [newGame]);

  // Fit the canvas to the window, snapping to whole multiples when there is room so pixels stay square.
  useEffect(() => {
    const fit = () => {
      const raw = Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H);
      const scale = raw >= 2 ? Math.floor(raw * 2) / 2 : raw;
      setSize({ w: Math.floor(VIEW_W * scale), h: Math.floor(VIEW_H * scale) });
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const start = useCallback(() => {
    setPhase("playing");
    setBanner(0);
  }, []);

  const restart = useCallback(() => {
    newGame();
    setPanel(null);
    setPhase("playing");
    setBanner(0);
  }, [newGame]);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.setMuted(!audio.muted);
    setMuted(audio.muted);
  }, []);

  const openSection = useCallback((section: SectionId) => {
    gameRef.current?.markVisited(section);
    setPanel(section);
  }, []);

  // Keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (panelRef.current) return; // the dialog owns the keyboard while open
      const input = inputRef.current;
      const current = phaseRef.current;

      if (current === "intro") {
        if (e.code === "Enter" || e.code === "Space") {
          e.preventDefault();
          start();
        }
        return;
      }
      if (e.code === "KeyM") toggleMute();
      if (current === "paused") {
        if (e.code === "Escape" || e.code === "KeyP") setPhase("playing");
        return;
      }
      if (current !== "playing") return;

      switch (e.code) {
        case "ArrowLeft":
        case "KeyA":
          input.left = true;
          break;
        case "ArrowRight":
        case "KeyD":
          input.right = true;
          break;
        case "ArrowUp":
        case "KeyW":
        case "Space":
          if (!e.repeat) input.jumpPressed = true;
          input.jump = true;
          break;
        case "KeyE":
        case "Enter":
        case "ArrowDown":
        case "KeyS":
          if (!e.repeat) input.interactPressed = true;
          break;
        case "Escape":
        case "KeyP":
          setPhase("paused");
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    const up = (e: KeyboardEvent) => {
      const input = inputRef.current;
      if (e.code === "ArrowLeft" || e.code === "KeyA") input.left = false;
      if (e.code === "ArrowRight" || e.code === "KeyD") input.right = false;
      if (e.code === "ArrowUp" || e.code === "KeyW" || e.code === "Space") input.jump = false;
    };
    const lostFocus = () => {
      inputRef.current = emptyInput();
      if (phaseRef.current === "playing" && document.hidden) setPhase("paused");
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", lostFocus);
    document.addEventListener("visibilitychange", lostFocus);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", lostFocus);
      document.removeEventListener("visibilitychange", lostFocus);
    };
  }, [start, toggleMute]);

  // Keys held when a dialog opens would otherwise stay "stuck" down.
  useEffect(() => {
    if (panel) inputRef.current = emptyInput();
  }, [panel]);

  // Victory + best time
  useEffect(() => {
    if (hud?.status !== "won" || phase === "won") return;
    setPhase("won");
    const previous = readBest();
    if (previous === null || hud.time < previous) {
      setNewRecord(previous !== null);
      setBest(hud.time);
      try {
        localStorage.setItem(BEST_KEY, String(hud.time));
      } catch {
        // Best time just won't persist.
      }
    }
  }, [hud, phase]);

  // Zone banner
  const zone = hud?.zone ?? 0;
  useEffect(() => {
    if (phase !== "playing") return;
    setBanner(zone);
    const timer = setTimeout(() => setBanner(null), 2600);
    return () => clearTimeout(timer);
  }, [zone, phase]);

  const hold = (key: "left" | "right" | "jump") => ({
    onPointerDown: (e: ReactPointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      inputRef.current[key] = true;
      if (key === "jump") inputRef.current.jumpPressed = true;
    },
    onPointerUp: () => {
      inputRef.current[key] = false;
    },
    onPointerCancel: () => {
      inputRef.current[key] = false;
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  const zoneMeta = hud ? sectionById(gameRef.current?.level.zoneSections[hud.zone] ?? "about") : SECTIONS[0];
  const nearMeta = hud?.nearTerminal ? sectionById(hud.nearTerminal) : null;
  const touchButton =
    "pointer-events-auto select-none touch-none flex items-center justify-center rounded-full border border-white/30 bg-black/40 text-white active:bg-primary/60 backdrop-blur-sm";

  return (
    <div className="fixed inset-0 bg-[#070818] overflow-hidden select-none flex items-center justify-center font-mono">
      <div className="relative" style={{ width: size.w, height: size.h }}>
        <canvas
          ref={canvasRef}
          width={VIEW_W}
          height={VIEW_H}
          aria-label="Jogo 2D: Jornada do Dev"
          role="img"
          className="block w-full h-full"
          style={{ imageRendering: "pixelated" }}
        />

        {/* HUD */}
        {hud && phase !== "intro" && (
          <div className="absolute inset-x-0 top-0 p-2 sm:p-3 flex items-start justify-between gap-2 text-white text-[10px] sm:text-xs pointer-events-none">
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-1" aria-label={`${hud.hearts} de ${MAX_HEARTS} vidas`}>
                {Array.from({ length: MAX_HEARTS }).map((_, i) => (
                  <Heart
                    key={i}
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${i < hud.hearts ? "text-[#ff6b8b] fill-[#ff6b8b]" : "text-white/25"}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3 bg-black/35 px-2 py-1 backdrop-blur-sm">
                <span className="flex items-center gap-1" title="Commits coletados">
                  <GitCommitHorizontal className="w-3.5 h-3.5 text-[#ffd866]" />
                  {hud.commits}/{hud.totalCommits}
                </span>
                <span className="flex items-center gap-1" title="Bugs corrigidos">
                  <Bug className="w-3.5 h-3.5 text-[#f2568c]" />
                  {hud.bugs}/{hud.totalBugs}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5" aria-label={`${hud.visited.length} de ${SECTIONS.length} seções vistas`}>
              {SECTIONS.map((s) => (
                <span
                  key={s.id}
                  title={s.name}
                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 border"
                  style={{
                    borderColor: s.color,
                    backgroundColor: hud.visited.includes(s.id) ? s.color : "transparent",
                  }}
                />
              ))}
            </div>

            <div className="flex items-center gap-2 pointer-events-auto">
              <span className="bg-black/35 px-2 py-1 tabular-nums backdrop-blur-sm">{formatTime(hud.time)}</span>
              <button
                onClick={toggleMute}
                aria-label={muted ? "Ligar som" : "Desligar som"}
                className="w-7 h-7 flex items-center justify-center bg-black/35 border border-white/20 backdrop-blur-sm"
              >
                {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              {phase === "playing" && (
                <button
                  onClick={() => setPhase("paused")}
                  aria-label="Pausar"
                  className="w-7 h-7 flex items-center justify-center bg-black/35 border border-white/20 backdrop-blur-sm"
                >
                  <Pause className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Zone banner */}
        {phase === "playing" && banner !== null && !panel && (
          <div className="absolute inset-x-0 top-[22%] flex justify-center pointer-events-none" aria-live="polite">
            <div className="px-4 py-2 bg-black/55 backdrop-blur-sm border-l-4 text-white" style={{ borderColor: zoneMeta.color }}>
              <p className="text-[9px] sm:text-[10px] tracking-[0.25em] text-white/60">
                FASE {String(banner + 1).padStart(2, "0")} / {String(SECTIONS.length).padStart(2, "0")}
              </p>
              <p className="font-display text-sm sm:text-xl font-semibold uppercase">{zoneMeta.name}</p>
            </div>
          </div>
        )}

        {/* Terminal prompt */}
        {phase === "playing" && nearMeta && !panel && (
          <div className="absolute inset-x-0 bottom-[30%] flex justify-center">
            <button
              onClick={() => openSection(nearMeta.id)}
              className="flex items-center gap-2 px-3 py-1.5 bg-black/70 border text-white text-[10px] sm:text-xs backdrop-blur-sm"
              style={{ borderColor: nearMeta.color }}
            >
              {!isTouch && <Key>E</Key>}
              {isTouch ? "Toque para abrir" : "abrir"} {nearMeta.name}
            </button>
          </div>
        )}

        {/* Intro */}
        {phase === "intro" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 bg-[#070818]/75 backdrop-blur-[2px] text-white overflow-y-auto">
            <p className="text-[10px] sm:text-xs tracking-[0.3em] text-primary-glow mb-2">PORTFÓLIO JOGÁVEL</p>
            <h1 className="font-display text-2xl sm:text-5xl font-semibold uppercase leading-none mb-3">
              Jornada <span className="text-primary">do Dev</span>
            </h1>
            <p className="text-[11px] sm:text-sm text-white/70 max-w-md mb-5 font-sans">
              Corra por cinco fases, colete commits, corrija bugs e abra os terminais para conhecer minha
              trajetória. No fim, faça o deploy no foguete.
            </p>
            <button
              onClick={start}
              autoFocus
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-[#070818] text-xs sm:text-sm font-semibold font-sans"
            >
              <Play className="w-4 h-4 fill-current" /> Começar
            </button>
            {!isTouch ? (
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-5 text-[10px] sm:text-[11px] text-white/60">
                <span><Key>A</Key> <Key>D</Key> andar</span>
                <span><Key>Espaço</Key> pular</span>
                <span><Key>E</Key> abrir terminal</span>
                <span><Key>Esc</Key> pausar</span>
              </div>
            ) : (
              <p className="mt-5 text-[10px] text-white/60 font-sans">Use os botões na tela. Na horizontal fica melhor.</p>
            )}
            <Link to="/landing" className="mt-4 text-[10px] sm:text-[11px] text-white/50 underline underline-offset-4 font-sans">
              Prefere só ler? Ir para a landing page
            </Link>
          </div>
        )}

        {/* Pause */}
        {phase === "paused" && !panel && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 bg-[#070818]/85 text-white overflow-y-auto">
            <h2 className="font-display text-xl sm:text-3xl font-semibold uppercase mb-4">Pausado</h2>
            <div className="flex flex-wrap justify-center gap-2 mb-5 font-sans">
              <button
                onClick={() => setPhase("playing")}
                autoFocus
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#070818] text-xs font-semibold"
              >
                <Play className="w-3.5 h-3.5 fill-current" /> Continuar
              </button>
              <button onClick={restart} className="inline-flex items-center gap-2 px-4 py-2 border border-white/30 text-xs">
                <RotateCcw className="w-3.5 h-3.5" /> Reiniciar
              </button>
              <Link to="/" className="inline-flex items-center gap-2 px-4 py-2 border border-white/30 text-xs">
                Sair
              </Link>
            </div>
            <p className="text-[10px] tracking-[0.25em] text-white/50 mb-2">VER CONTEÚDO SEM JOGAR</p>
            <div className="flex flex-wrap justify-center gap-1.5 font-sans">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => openSection(s.id)}
                  className="px-3 py-1.5 border text-[11px] text-white hover:bg-white/10"
                  style={{ borderColor: s.color }}
                >
                  {s.short}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Victory */}
        {phase === "won" && hud && !panel && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 bg-[#070818]/88 text-white overflow-y-auto">
            <p className="text-[10px] sm:text-xs tracking-[0.3em] text-[#7cf5c4] mb-2">DEPLOY CONCLUÍDO</p>
            <h2 className="font-display text-2xl sm:text-4xl font-semibold uppercase leading-none mb-4">
              Portfólio <span className="text-primary">no ar</span>
            </h2>
            <dl className="grid grid-cols-4 gap-2 sm:gap-3 mb-4 text-[10px] sm:text-xs">
              {[
                ["Tempo", formatTime(hud.time)],
                ["Commits", `${hud.commits}/${hud.totalCommits}`],
                ["Bugs", `${hud.bugs}/${hud.totalBugs}`],
                ["Seções", `${hud.visited.length}/${SECTIONS.length}`],
              ].map(([label, value]) => (
                <div key={label} className="border border-white/20 px-2 sm:px-3 py-1.5 sm:py-2">
                  <dd className="font-display text-sm sm:text-xl tabular-nums">{value}</dd>
                  <dt className="text-white/55">{label}</dt>
                </div>
              ))}
            </dl>
            {best !== null && (
              <p className="text-[10px] sm:text-xs text-white/60 mb-4">
                {newRecord ? "Novo recorde! " : ""}Melhor tempo: {formatTime(best)}
              </p>
            )}
            <div className="flex flex-wrap justify-center gap-2 font-sans">
              <button
                onClick={() => openSection("contact")}
                autoFocus
                className="px-4 py-2 bg-white text-[#070818] text-xs font-semibold"
              >
                Falar comigo
              </button>
              <button onClick={restart} className="inline-flex items-center gap-2 px-4 py-2 border border-white/30 text-xs">
                <RotateCcw className="w-3.5 h-3.5" /> Jogar de novo
              </button>
              <Link to="/" className="px-4 py-2 border border-white/30 text-xs">
                Outras experiências
              </Link>
            </div>
          </div>
        )}
      </div>

      <Link
        to="/"
        className="fixed bottom-3 left-1/2 -translate-x-1/2 sm:left-4 sm:translate-x-0 sm:bottom-4 z-10 px-3 py-1.5 text-[10px] sm:text-[11px] text-white/60 hover:text-white border border-white/15 bg-black/30 font-sans"
      >
        ← Voltar ao início
      </Link>

      {/* Touch controls */}
      {isTouch && phase === "playing" && !panel && (
        <div className="fixed inset-x-0 bottom-0 z-20 p-4 pb-12 flex items-end justify-between pointer-events-none">
          <div className="flex gap-3">
            <button aria-label="Andar para a esquerda" className={`${touchButton} w-14 h-14`} {...hold("left")}>
              <ArrowLeft className="w-6 h-6" />
            </button>
            <button aria-label="Andar para a direita" className={`${touchButton} w-14 h-14`} {...hold("right")}>
              <ArrowRight className="w-6 h-6" />
            </button>
          </div>
          <button aria-label="Pular" className={`${touchButton} w-16 h-16`} {...hold("jump")}>
            <ArrowUp className="w-7 h-7" />
          </button>
        </div>
      )}

      {panel && (
        <SectionDialog title={sectionById(panel).name} accent={sectionById(panel).color} onClose={() => setPanel(null)}>
          <PortfolioPanel id={panel} />
        </SectionDialog>
      )}
    </div>
  );
};

export default Game2D;
