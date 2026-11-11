import { sectionById } from "@/data/sections";
import { TILE, VIEW_H, VIEW_W } from "./constants";
import type { Game } from "./game";
import { Tile, tileAt } from "./level";
import { buildSprites, type SpriteSheet } from "./sprites";

/** Small deterministic PRNG so the scenery is identical on every visit. */
const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const makeCanvas = (w: number, h: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return canvas;
};

type Star = { x: number; y: number; size: number; phase: number };

/**
 * Draws the game at its internal 400×224 resolution. Static things (sky,
 * skylines, every tile) are painted once into offscreen canvases; each frame
 * only blits those and draws the handful of moving objects.
 */
export class Renderer {
  private sprites: SpriteSheet = buildSprites();
  private sky = makeCanvas(VIEW_W, VIEW_H);
  private farSkyline = makeCanvas(512, VIEW_H);
  private nearSkyline = makeCanvas(640, VIEW_H);
  private tiles: HTMLCanvasElement;
  private stars: Star[] = [];

  constructor(private game: Game) {
    this.tiles = makeCanvas(game.levelWidth, game.levelHeight);
    this.paintSky();
    this.paintSkyline(this.farSkyline, 11, "#181b4a", "#2a2f73", 70, 130);
    this.paintSkyline(this.nearSkyline, 29, "#10122f", "#3b3f8f", 40, 90);
    this.paintTiles();
    const rand = seeded(7);
    for (let i = 0; i < 80; i++) {
      this.stars.push({ x: rand() * VIEW_W, y: rand() * 130, size: rand() > 0.85 ? 2 : 1, phase: rand() * 6 });
    }
  }

  private paintSky() {
    const ctx = this.sky.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    gradient.addColorStop(0, "#070818");
    gradient.addColorStop(0.55, "#12143c");
    gradient.addColorStop(1, "#2b2478");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  private paintSkyline(canvas: HTMLCanvasElement, seed: number, wall: string, light: string, minH: number, maxH: number) {
    const ctx = canvas.getContext("2d")!;
    const rand = seeded(seed);
    let x = 0;
    while (x < canvas.width) {
      const w = 18 + Math.floor(rand() * 26);
      const h = minH + Math.floor(rand() * (maxH - minH));
      const top = VIEW_H - h;
      ctx.fillStyle = wall;
      ctx.fillRect(x, top, w, h);
      if (rand() > 0.6) ctx.fillRect(x + Math.floor(w / 2) - 1, top - 8, 2, 8); // antenna
      ctx.fillStyle = light;
      for (let wy = top + 5; wy < VIEW_H - 34; wy += 7) {
        for (let wx = x + 3; wx < x + w - 3; wx += 5) {
          if (rand() > 0.62) ctx.fillRect(wx, wy, 2, 3);
        }
      }
      x += w + 2 + Math.floor(rand() * 5);
    }
  }

  private paintTiles() {
    const { level } = this.game;
    const ctx = this.tiles.getContext("2d")!;
    const rand = seeded(3);

    for (let row = 0; row < level.rows; row++) {
      for (let col = 0; col < level.cols; col++) {
        const tile = tileAt(level, col, row);
        const x = col * TILE;
        const y = row * TILE;
        if (tile === Tile.Ground) {
          ctx.fillStyle = "#171a3d";
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = "#1f2350";
          for (let i = 0; i < 4; i++) ctx.fillRect(x + Math.floor(rand() * 14), y + 4 + Math.floor(rand() * 10), 2, 1);
          if (tileAt(level, col, row - 1) !== Tile.Ground) {
            ctx.fillStyle = "#5a50d6";
            ctx.fillRect(x, y, TILE, 3);
            ctx.fillStyle = "#a59dff";
            ctx.fillRect(x, y, TILE, 1);
            ctx.fillStyle = "#5a50d6";
            for (let i = 0; i < 3; i++) ctx.fillRect(x + Math.floor(rand() * 15), y + 3, 1, 1 + Math.floor(rand() * 2));
          }
          ctx.fillStyle = "#0e1029";
          if (tileAt(level, col - 1, row) === Tile.Empty && col > 0) ctx.fillRect(x, y, 1, TILE);
          if (tileAt(level, col + 1, row) === Tile.Empty && col < level.cols - 1) ctx.fillRect(x + TILE - 1, y, 1, TILE);
        } else if (tile === Tile.Brick) {
          ctx.fillStyle = "#2b3068";
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = "#4b52a8";
          ctx.fillRect(x, y, TILE, 1);
          ctx.fillRect(x, y, 1, TILE);
          ctx.fillStyle = "#191c44";
          ctx.fillRect(x, y + TILE - 1, TILE, 1);
          ctx.fillRect(x + TILE - 1, y, 1, TILE);
          ctx.fillRect(x + 1, y + 7, TILE - 2, 1);
          ctx.fillRect(x + 7, y + 1, 1, 6);
          ctx.fillRect(x + 4, y + 8, 1, 7);
          ctx.fillRect(x + 11, y + 8, 1, 7);
        } else if (tile === Tile.OneWay) {
          ctx.fillStyle = "#bff4ff";
          ctx.fillRect(x, y, TILE, 1);
          ctx.fillStyle = "#46c2e3";
          ctx.fillRect(x, y + 1, TILE, 2);
          ctx.fillStyle = "#256f8a";
          ctx.fillRect(x, y + 3, TILE, 1);
          ctx.fillRect(x + 3, y + 4, 1, 2);
          ctx.fillRect(x + 12, y + 4, 1, 2);
        } else if (tile === Tile.Spike) {
          for (let s = 0; s < 2; s++) {
            for (let i = 0; i < 4; i++) {
              ctx.fillStyle = i === 0 ? "#ffd1dc" : "#ff6b8b";
              ctx.fillRect(x + s * 8 + 3 - i, y + 8 + i * 2, 2 + i * 2, 2);
            }
          }
        }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, clock: number) {
    const game = this.game;
    const camera = Math.round(game.cameraX);
    const zone = game.hud().zone;
    const zoneColor = sectionById(game.level.zoneSections[zone]).color;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.sky, 0, 0);

    // Horizon glow tinted by the section the player is in.
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = zoneColor;
    ctx.fillRect(0, VIEW_H - 90, VIEW_W, 90);
    ctx.globalAlpha = 1;

    for (const star of this.stars) {
      const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(clock * 1.3 + star.phase));
      ctx.globalAlpha = twinkle;
      ctx.fillStyle = "#e8e6ff";
      const x = (((star.x - camera * 0.03) % VIEW_W) + VIEW_W) % VIEW_W;
      ctx.fillRect(Math.floor(x), star.y, star.size, star.size);
    }
    ctx.globalAlpha = 1;

    // Moon
    ctx.fillStyle = "#f3f0ff";
    ctx.beginPath();
    ctx.arc(318 - camera * 0.01, 40, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d6d1f5";
    ctx.fillRect(312 - camera * 0.01, 35, 4, 3);
    ctx.fillRect(321 - camera * 0.01, 44, 3, 3);

    this.tile(ctx, this.farSkyline, camera * 0.15);
    this.tile(ctx, this.nearSkyline, camera * 0.35);

    ctx.save();
    const shake = game.shake > 0 ? Math.round((Math.random() - 0.5) * 4) : 0;
    ctx.translate(-camera + shake, shake);

    this.drawZoneFlags(ctx);
    ctx.drawImage(this.tiles, camera, 0, VIEW_W, VIEW_H, camera, 0, VIEW_W, VIEW_H);
    this.drawTerminals(ctx, clock);
    this.drawCommits(ctx, clock, camera);
    this.drawRocket(ctx, clock);
    this.drawBugs(ctx);
    this.drawPlayer(ctx);

    for (const part of game.particles) {
      ctx.globalAlpha = Math.max(0, part.life / part.max);
      ctx.fillStyle = part.color;
      ctx.fillRect(Math.round(part.x), Math.round(part.y), part.size, part.size);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private tile(ctx: CanvasRenderingContext2D, image: HTMLCanvasElement, offset: number) {
    const start = -(Math.floor(offset) % image.width);
    for (let x = start; x < VIEW_W; x += image.width) ctx.drawImage(image, x, 0);
  }

  private drawZoneFlags(ctx: CanvasRenderingContext2D) {
    const { level } = this.game;
    const groundY = (level.rows - 2) * TILE;
    level.zoneStarts.forEach((col, i) => {
      if (i === 0) return;
      const x = col * TILE;
      ctx.fillStyle = "#c9c5ff";
      ctx.fillRect(x, groundY - 34, 1, 34);
      ctx.fillStyle = sectionById(level.zoneSections[i]).color;
      ctx.fillRect(x + 1, groundY - 34, 9, 6);
      ctx.fillRect(x + 1, groundY - 28, 6, 1);
    });
  }

  private drawTerminals(ctx: CanvasRenderingContext2D, clock: number) {
    const game = this.game;
    for (const t of game.terminals) {
      const color = sectionById(t.section).color;
      const x = t.x;
      const floor = t.y + TILE;
      // stand
      ctx.fillStyle = "#6b6f9c";
      ctx.fillRect(x + 7, floor - 8, 2, 8);
      ctx.fillRect(x + 3, floor - 2, 10, 2);
      // monitor
      ctx.fillStyle = "#c9c5ff";
      ctx.fillRect(x, floor - 21, 16, 13);
      ctx.fillStyle = "#0d0f2a";
      ctx.fillRect(x + 1, floor - 20, 14, 11);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.28;
      ctx.fillRect(x + 1, floor - 20, 14, 11);
      ctx.globalAlpha = 1;
      if (t.visited) {
        ctx.fillStyle = "#7cf5c4";
        ctx.fillRect(x + 4, floor - 15, 2, 2);
        ctx.fillRect(x + 6, floor - 13, 2, 2);
        ctx.fillRect(x + 8, floor - 15, 2, 2);
        ctx.fillRect(x + 10, floor - 17, 2, 2);
      } else {
        ctx.fillStyle = color;
        ctx.fillRect(x + 3, floor - 18, 7, 1);
        ctx.fillRect(x + 3, floor - 16, 9, 1);
        ctx.fillRect(x + 3, floor - 14, 5, 1);
        if (Math.floor(clock * 2) % 2 === 0) ctx.fillRect(x + 3, floor - 12, 3, 1);
      }
      // checkpoint light
      const active = game.checkpoint.x === t.x && game.checkpoint.y === t.y;
      ctx.fillStyle = active ? "#7cf5c4" : "#3a3d66";
      ctx.fillRect(x + 13, floor - 9, 2, 1);

      if (!t.visited) {
        const bob = Math.round(Math.sin(clock * 3 + t.x) * 2);
        ctx.fillStyle = color;
        ctx.fillRect(x + 4, floor - 36 + bob, 8, 10);
        ctx.fillRect(x + 7, floor - 26 + bob, 2, 2);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x + 7, floor - 34 + bob, 2, 4);
        ctx.fillRect(x + 7, floor - 29 + bob, 2, 1);
      }
    }
  }

  private drawCommits(ctx: CanvasRenderingContext2D, clock: number, camera: number) {
    for (const c of this.game.commits) {
      if (c.taken || c.x < camera - TILE || c.x > camera + VIEW_W) continue;
      const cx = c.x + 8;
      const cy = c.y + 8 + Math.round(Math.sin(clock * 3 + c.x * 0.1) * 2);
      const spin = Math.abs(Math.cos(clock * 3.2 + c.x * 0.05));
      for (let dy = -5; dy <= 5; dy++) {
        const half = Math.max(1, Math.round((5 - Math.abs(dy)) * spin));
        ctx.fillStyle = "#ffd866";
        ctx.fillRect(cx - half, cy + dy, half * 2, 1);
        ctx.fillStyle = "#fff6cf";
        ctx.fillRect(cx - half, cy + dy, 1, 1);
      }
      ctx.fillStyle = "#b8862e";
      ctx.fillRect(cx - 1, cy - 1, 2, 2);
    }
  }

  private drawRocket(ctx: CanvasRenderingContext2D, clock: number) {
    const game = this.game;
    const r = game.level.rocket;
    const floor = r.y + TILE;
    // launch pad
    ctx.fillStyle = "#6b6f9c";
    ctx.fillRect(r.x - 4, floor - 2, 24, 2);
    ctx.fillStyle = "#3a3d66";
    ctx.fillRect(r.x - 6, floor - 22, 2, 22);
    ctx.fillRect(r.x - 6, floor - 16, 5, 1);

    const lift = game.status === "playing" ? 0 : game.rocketLift();
    const wobble = game.status === "launching" && game.launchTime < 0.5 ? Math.round(Math.sin(clock * 60)) : 0;
    const x = r.x + 2 + wobble;
    const base = floor - 4 - Math.round(lift);
    // fins
    ctx.fillStyle = "#f2568c";
    ctx.fillRect(x - 3, base - 8, 3, 8);
    ctx.fillRect(x + 12, base - 8, 3, 8);
    ctx.fillRect(x - 2, base - 10, 2, 2);
    ctx.fillRect(x + 12, base - 10, 2, 2);
    // body
    ctx.fillStyle = "#eeeefc";
    ctx.fillRect(x, base - 26, 12, 26);
    ctx.fillStyle = "#c3c3e0";
    ctx.fillRect(x + 9, base - 26, 3, 26);
    // nose
    ctx.fillStyle = "#f2568c";
    ctx.fillRect(x + 1, base - 29, 10, 3);
    ctx.fillRect(x + 3, base - 32, 6, 3);
    ctx.fillRect(x + 5, base - 34, 2, 2);
    // window
    ctx.fillStyle = "#262b52";
    ctx.fillRect(x + 3, base - 21, 6, 6);
    ctx.fillStyle = "#46c2e3";
    ctx.fillRect(x + 4, base - 20, 4, 4);
    ctx.fillStyle = "#bff4ff";
    ctx.fillRect(x + 4, base - 20, 1, 1);
    // stripe
    ctx.fillStyle = "#6e63f0";
    ctx.fillRect(x, base - 10, 12, 2);
    // nozzle
    ctx.fillStyle = "#3a3d66";
    ctx.fillRect(x + 3, base, 6, 2);

    if (game.status === "playing") {
      const bob = Math.round(Math.sin(clock * 3) * 2);
      ctx.fillStyle = "#7cf5c4";
      ctx.fillRect(x + 5, base - 46 + bob, 2, 6);
      ctx.fillRect(x + 3, base - 42 + bob, 6, 1);
      ctx.fillRect(x + 4, base - 41 + bob, 4, 1);
      ctx.fillRect(x + 5, base - 40 + bob, 2, 1);
    }
  }

  private drawBugs(ctx: CanvasRenderingContext2D) {
    for (const bug of this.game.bugs) {
      const facing = bug.dir > 0 ? "right" : "left";
      if (!bug.alive) {
        if (bug.deadFor > 0.35) continue;
        ctx.drawImage(this.sprites.bug.a[facing], Math.round(bug.x - 1), Math.round(bug.y + bug.h - 3), 14, 3);
        continue;
      }
      const frame = Math.floor(bug.phase * 8) % 2 === 0 ? "a" : "b";
      ctx.drawImage(this.sprites.bug[frame][facing], Math.round(bug.x - 1), Math.round(bug.y - 1));
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D) {
    const game = this.game;
    if (game.status !== "playing") return;
    const p = game.player;
    if (p.invuln > 0 && Math.floor(p.invuln * 14) % 2 === 0) return;
    const frame = !p.onGround
      ? "jump"
      : Math.abs(p.vx) > 8
        ? Math.floor(p.runTime * 11) % 2 === 0
          ? "runA"
          : "runB"
        : "idle";
    const sprite = this.sprites.player[frame][p.facing > 0 ? "right" : "left"];
    ctx.drawImage(sprite, Math.round(p.x - 1), Math.round(p.y - 2));
  }
}
