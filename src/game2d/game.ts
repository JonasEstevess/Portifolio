import type { SectionId } from "@/data/sections";
import {
  AIR_CONTROL,
  COYOTE_TIME,
  ENEMY_H,
  ENEMY_SPEED,
  ENEMY_W,
  GRAVITY,
  INVULN_TIME,
  JUMP_BUFFER,
  JUMP_CUT_SPEED,
  JUMP_SPEED,
  LAUNCH_TIME,
  MAX_FALL,
  MAX_HEARTS,
  PLAYER_H,
  PLAYER_W,
  RUN_ACCEL,
  RUN_FRICTION,
  RUN_SPEED,
  STOMP_BOUNCE,
  TILE,
  VIEW_W,
} from "./constants";
import { buildLevel, Tile, zoneAt, type Level, type Point } from "./level";
import { hasFloorBelow, moveBody, overlaps, touchesTile, type Body } from "./physics";

export type Input = {
  left: boolean;
  right: boolean;
  /** Held state, used for variable jump height. */
  jump: boolean;
  /** Edge-triggered: true only on the step the button went down. */
  jumpPressed: boolean;
  interactPressed: boolean;
};

export const emptyInput = (): Input => ({
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
  interactPressed: false,
});

export type Status = "playing" | "launching" | "won";

export type Sfx = "jump" | "commit" | "stomp" | "hurt" | "checkpoint" | "open" | "launch" | "win";

export type Player = Body & {
  facing: 1 | -1;
  coyote: number;
  jumpBuffer: number;
  invuln: number;
  /** Seconds spent running, drives the walk cycle. */
  runTime: number;
};

export type Bug = Body & { alive: boolean; deadFor: number; dir: 1 | -1; phase: number; homeX: number };
export type Commit = Point & { taken: boolean };
export type Terminal = Point & { section: SectionId; visited: boolean };
export type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
};

/** Everything the HUD shows. Emitted through `onHud` only when something changes. */
export type Hud = {
  status: Status;
  hearts: number;
  commits: number;
  totalCommits: number;
  bugs: number;
  totalBugs: number;
  visited: SectionId[];
  zone: number;
  nearTerminal: SectionId | null;
  time: number;
};

/** How far, in pixels, a bug walks from where it was placed. */
const BUG_PATROL = 4 * TILE;

const hudKey = (h: Hud) =>
  [h.status, h.hearts, h.commits, h.bugs, h.visited.length, h.zone, h.nearTerminal, Math.floor(h.time)].join("|");

/**
 * The whole simulation, free of DOM and rendering so it can run in tests.
 * `step` advances exactly one fixed tick; the React wrapper feeds it input
 * and draws whatever state it finds here.
 */
export class Game {
  readonly level: Level;
  player: Player;
  bugs: Bug[];
  commits: Commit[];
  terminals: Terminal[];
  particles: Particle[] = [];
  status: Status = "playing";
  hearts = MAX_HEARTS;
  commitCount = 0;
  bugCount = 0;
  time = 0;
  cameraX = 0;
  /** Seconds since the rocket was reached. */
  launchTime = 0;
  /** Brief screen shake after taking damage. */
  shake = 0;
  checkpoint: Point;
  nearTerminal: Terminal | null = null;

  onHud?: (hud: Hud) => void;
  onSfx?: (name: Sfx) => void;
  onOpenTerminal?: (section: SectionId) => void;

  private lastHudKey = "";

  constructor(level: Level = buildLevel()) {
    this.level = level;
    this.checkpoint = { ...level.spawn };
    this.player = this.makePlayer(level.spawn);
    this.bugs = level.bugs.map((b, i) => ({
      x: b.x + (TILE - ENEMY_W) / 2,
      y: b.y + TILE - ENEMY_H,
      w: ENEMY_W,
      h: ENEMY_H,
      vx: 0,
      vy: 0,
      onGround: false,
      alive: true,
      deadFor: 0,
      dir: i % 2 === 0 ? -1 : 1,
      phase: i * 0.37,
      homeX: b.x,
    }));
    this.commits = level.commits.map((c) => ({ ...c, taken: false }));
    this.terminals = level.terminals.map((t) => ({ ...t, visited: false }));
    this.cameraX = this.cameraTarget();
  }

  private makePlayer(at: Point): Player {
    return {
      x: at.x + (TILE - PLAYER_W) / 2,
      y: at.y + TILE - PLAYER_H,
      w: PLAYER_W,
      h: PLAYER_H,
      vx: 0,
      vy: 0,
      onGround: false,
      facing: 1,
      coyote: 0,
      jumpBuffer: 0,
      invuln: 0,
      runTime: 0,
    };
  }

  get levelWidth() {
    return this.level.cols * TILE;
  }

  get levelHeight() {
    return this.level.rows * TILE;
  }

  hud(): Hud {
    return {
      status: this.status,
      hearts: this.hearts,
      commits: this.commitCount,
      totalCommits: this.commits.length,
      bugs: this.bugCount,
      totalBugs: this.bugs.length,
      visited: this.terminals.filter((t) => t.visited).map((t) => t.section),
      zone: zoneAt(this.level, this.player.x + this.player.w / 2),
      nearTerminal: this.nearTerminal?.section ?? null,
      time: this.time,
    };
  }

  /** Marks a section as seen (also used when it is opened from the pause menu). */
  markVisited(section: SectionId) {
    const terminal = this.terminals.find((t) => t.section === section);
    if (terminal) terminal.visited = true;
    this.emitHud();
  }

  step(input: Input, dt: number) {
    if (this.status === "won") return;

    this.updateParticles(dt);
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);

    if (this.status === "launching") {
      this.launchTime += dt;
      const rocket = this.level.rocket;
      const colors = ["#fff3c4", "#f5a742", "#f2568c"];
      for (let i = 0; i < 3; i++) {
        this.spawnParticle(
          rocket.x + 4 + Math.random() * 8,
          rocket.y + 14 - this.rocketLift(),
          (Math.random() - 0.5) * 50,
          60 + Math.random() * 90,
          0.5,
          colors[i],
          2
        );
      }
      if (this.launchTime >= LAUNCH_TIME) {
        this.status = "won";
        this.onSfx?.("win");
      }
      this.emitHud();
      return;
    }

    this.time += dt;
    this.updatePlayer(input, dt);
    this.updateBugs(dt);
    this.collectCommits();
    this.updateTerminals(input);
    this.checkRocket();

    this.cameraX += (this.cameraTarget() - this.cameraX) * Math.min(1, dt * 7);
    this.emitHud();
  }

  /** How far the rocket has climbed during the launch sequence, in pixels. */
  rocketLift() {
    const t = Math.max(0, this.launchTime - 0.5);
    return t * t * 90;
  }

  private cameraTarget() {
    const p = this.player;
    const target = p.x + p.w / 2 - VIEW_W / 2 + p.facing * 22;
    return Math.max(0, Math.min(this.levelWidth - VIEW_W, target));
  }

  private updatePlayer(input: Input, dt: number) {
    const p = this.player;
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const control = p.onGround ? 1 : AIR_CONTROL;

    if (dir !== 0) {
      p.vx += dir * RUN_ACCEL * control * dt;
      p.vx = Math.max(-RUN_SPEED, Math.min(RUN_SPEED, p.vx));
      p.facing = dir as 1 | -1;
      p.runTime += dt;
    } else {
      const slow = RUN_FRICTION * control * dt;
      p.vx = Math.abs(p.vx) <= slow ? 0 : p.vx - Math.sign(p.vx) * slow;
      p.runTime = 0;
    }

    p.coyote = p.onGround ? COYOTE_TIME : p.coyote - dt;
    p.jumpBuffer = input.jumpPressed ? JUMP_BUFFER : p.jumpBuffer - dt;
    if (p.jumpBuffer > 0 && p.coyote > 0) {
      p.vy = -JUMP_SPEED;
      p.coyote = 0;
      p.jumpBuffer = 0;
      this.onSfx?.("jump");
      this.burst(p.x + p.w / 2, p.y + p.h, 4, "#c9c5ff");
    }
    if (!input.jump && p.vy < -JUMP_CUT_SPEED) p.vy = -JUMP_CUT_SPEED;

    p.vy = Math.min(MAX_FALL, p.vy + GRAVITY * dt);
    const fallSpeed = p.vy;
    const wasOnGround = p.onGround;
    moveBody(p, this.level, dt);
    if (p.onGround && !wasOnGround && fallSpeed > 220) this.burst(p.x + p.w / 2, p.y + p.h, 5, "#c9c5ff");

    if (p.invuln > 0) p.invuln -= dt;

    if (p.y > this.levelHeight + 24) {
      this.hurt(true);
    } else if (touchesTile({ x: p.x, y: p.y + p.h - 5, w: p.w, h: 5 }, this.level, Tile.Spike, 2)) {
      this.hurt(false);
    }
  }

  private updateBugs(dt: number) {
    for (const bug of this.bugs) {
      if (!bug.alive) {
        bug.deadFor += dt;
        continue;
      }
      bug.phase += dt;
      // Turn around at ledges so bugs patrol their own island forever.
      const frontX = bug.dir > 0 ? bug.x + bug.w + 1 : bug.x - 1;
      if (bug.onGround && !hasFloorBelow(this.level, frontX, bug.y + bug.h + 2)) bug.dir = -bug.dir as 1 | -1;
      // ...and never stray far from home, so they don't wander up to a terminal someone is reading.
      if (bug.x - bug.homeX > BUG_PATROL) bug.dir = -1;
      else if (bug.homeX - bug.x > BUG_PATROL) bug.dir = 1;
      bug.vx = bug.dir * ENEMY_SPEED;
      bug.vy = Math.min(MAX_FALL, bug.vy + GRAVITY * dt);
      if (moveBody(bug, this.level, dt).hitWall) bug.dir = -bug.dir as 1 | -1;
      if (bug.y > this.levelHeight + 40) bug.alive = false;

      // Re-read the player each time: a hit may have respawned it.
      const p = this.player;
      if (!bug.alive || !overlaps(p, bug)) continue;
      const stomping = p.vy > 0 && p.y + p.h - bug.y < 8;
      if (stomping) {
        bug.alive = false;
        this.bugCount += 1;
        p.vy = -STOMP_BOUNCE;
        p.coyote = 0;
        this.onSfx?.("stomp");
        this.burst(bug.x + bug.w / 2, bug.y + bug.h / 2, 8, "#f2568c");
      } else {
        this.hurt(false, p.x < bug.x ? -1 : 1);
      }
    }
  }

  private collectCommits() {
    const p = this.player;
    for (const c of this.commits) {
      if (c.taken) continue;
      if (!overlaps(p, { x: c.x + 3, y: c.y + 3, w: 10, h: 10 })) continue;
      c.taken = true;
      this.commitCount += 1;
      this.onSfx?.("commit");
      this.burst(c.x + 8, c.y + 8, 6, "#ffd866");
    }
  }

  private updateTerminals(input: Input) {
    const p = this.player;
    let near: Terminal | null = null;
    for (const t of this.terminals) {
      const reach = { x: t.x - 10, y: t.y - 24, w: TILE + 20, h: 40 };
      if (overlaps(p, reach)) near = t;
    }
    this.nearTerminal = near;
    if (!near) return;

    if (this.checkpoint.x !== near.x || this.checkpoint.y !== near.y) {
      this.checkpoint = { x: near.x, y: near.y };
      this.onSfx?.("checkpoint");
      this.burst(near.x + 8, near.y - 4, 10, "#7cf5c4");
    }
    if (input.interactPressed && p.onGround) {
      near.visited = true;
      p.vx = 0;
      this.onSfx?.("open");
      this.onOpenTerminal?.(near.section);
    }
  }

  private checkRocket() {
    const r = this.level.rocket;
    if (!overlaps(this.player, { x: r.x - 2, y: r.y - 20, w: 20, h: 36 })) return;
    this.status = "launching";
    this.launchTime = 0;
    this.nearTerminal = null;
    this.onSfx?.("launch");
  }

  private hurt(fell: boolean, knock: -1 | 1 = -1) {
    const p = this.player;
    if (!fell && p.invuln > 0) return;
    this.hearts -= 1;
    this.shake = 0.25;
    this.onSfx?.("hurt");
    this.burst(p.x + p.w / 2, Math.min(p.y, this.levelHeight - 8) + p.h / 2, 10, "#ff6b8b");

    if (this.hearts <= 0 || fell) {
      // Never a hard game over: this is a portfolio, the visitor always gets to carry on.
      if (this.hearts <= 0) this.hearts = MAX_HEARTS;
      this.player = this.makePlayer(this.checkpoint);
      this.player.invuln = INVULN_TIME;
      this.cameraX = this.cameraTarget();
      return;
    }
    p.invuln = INVULN_TIME;
    p.vy = -230;
    p.vx = knock * 130;
  }

  private burst(x: number, y: number, count: number, color: string) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 70;
      this.spawnParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 30,
        0.35 + Math.random() * 0.3,
        color,
        1 + (i % 2)
      );
    }
  }

  private spawnParticle(x: number, y: number, vx: number, vy: number, life: number, color: string, size: number) {
    if (this.particles.length > 220) return;
    this.particles.push({ x, y, vx, vy, life, max: life, color, size });
  }

  private updateParticles(dt: number) {
    for (const part of this.particles) {
      part.life -= dt;
      part.vy += 260 * dt;
      part.x += part.vx * dt;
      part.y += part.vy * dt;
    }
    this.particles = this.particles.filter((part) => part.life > 0);
  }

  private emitHud() {
    if (!this.onHud) return;
    const hud = this.hud();
    const key = hudKey(hud);
    if (key === this.lastHudKey) return;
    this.lastHudKey = key;
    this.onHud(hud);
  }
}
