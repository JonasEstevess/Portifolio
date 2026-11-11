import { describe, expect, it } from "vitest";
import { SECTIONS } from "@/data/sections";
import { GROUND_ROWS, JUMP_SPEED, GRAVITY, MAX_HEARTS, RUN_SPEED, STEP, TILE } from "./constants";
import { emptyInput, Game, type Input } from "./game";
import { buildLevel, isSolid, Tile, tileAt, zoneAt } from "./level";
import { hasFloorBelow, moveBody, overlaps, touchesTile, type Body } from "./physics";
import { SPRITE_ROWS } from "./sprites";

const body = (x: number, y: number, vx = 0, vy = 0): Body => ({ x, y, w: 10, h: 14, vx, vy, onGround: false });

describe("level", () => {
  const level = buildLevel();
  const floorRow = level.rows - GROUND_ROWS;

  it("has one zone and one terminal per portfolio section, in order", () => {
    const ids = SECTIONS.map((s) => s.id);
    expect(level.zoneSections).toEqual(ids);
    expect(level.terminals.map((t) => t.section)).toEqual(ids);
    level.terminals.forEach((t, i) => expect(zoneAt(level, t.x)).toBe(i));
  });

  it("starts on the left and ends with the rocket on the right", () => {
    expect(level.spawn.x).toBeLessThan(5 * TILE);
    expect(level.rocket.x).toBeGreaterThan((level.cols - 10) * TILE);
    expect(zoneAt(level, level.rocket.x)).toBe(SECTIONS.length - 1);
  });

  it("puts spawn, terminals, rocket and bugs on solid ground", () => {
    const standing = [level.spawn, level.rocket, ...level.terminals, ...level.bugs];
    for (const point of standing) {
      expect(hasFloorBelow(level, point.x + TILE / 2, point.y + TILE + 1)).toBe(true);
      expect(isSolid(tileAt(level, point.x / TILE, point.y / TILE))).toBe(false);
    }
  });

  it("never asks for a jump wider than the player can make", () => {
    const airTime = (2 * JUMP_SPEED) / GRAVITY;
    const maxGapTiles = Math.floor((RUN_SPEED * airTime) / TILE);
    let gap = 0;
    for (let col = 0; col < level.cols; col++) {
      if (tileAt(level, col, floorRow) === Tile.Empty) {
        gap += 1;
        expect(gap).toBeLessThan(maxGapTiles);
      } else {
        gap = 0;
      }
    }
  });

  it("keeps every commit inside the level and out of walls", () => {
    expect(level.commits.length).toBeGreaterThan(20);
    for (const c of level.commits) {
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.x).toBeLessThan(level.cols * TILE);
      expect(tileAt(level, c.x / TILE, c.y / TILE)).toBe(Tile.Empty);
    }
  });

  it("treats the sides as walls and the area below as a pit", () => {
    expect(isSolid(tileAt(level, -1, 5))).toBe(true);
    expect(isSolid(tileAt(level, level.cols, 5))).toBe(true);
    expect(tileAt(level, 3, level.rows)).toBe(Tile.Empty);
  });
});

describe("physics", () => {
  const level = buildLevel([
    {
      section: "about",
      //       0123456789
      ground: "#####  ###",
      rows: ["   --", "", "        B", " ^      B"],
    },
  ]);
  const floorY = (level.rows - GROUND_ROWS) * TILE;

  it("lands on the ground and reports it", () => {
    const b = body(4, floorY - 30, 0, 300);
    for (let i = 0; i < 30; i++) {
      b.vy = 300; // gravity is the game's job, so keep pushing down here
      moveBody(b, level, STEP);
    }
    expect(b.onGround).toBe(true);
    expect(b.y + b.h).toBe(floorY);
    expect(b.vy).toBe(0);
  });

  it("is stopped by walls", () => {
    const b = body(6 * TILE + 8, floorY - 14, 200, 0);
    let hit = false;
    for (let i = 0; i < 30; i++) hit = moveBody(b, level, STEP).hitWall || hit;
    expect(hit).toBe(true);
    expect(b.x + b.w).toBe(8 * TILE);
  });

  it("falls through pits", () => {
    const b = body(5 * TILE + 3, floorY - 14, 0, 100);
    for (let i = 0; i < 60; i++) {
      b.vy = 200;
      moveBody(b, level, STEP);
    }
    expect(b.y).toBeGreaterThan(level.rows * TILE);
  });

  it("passes up through one-way platforms but lands on them from above", () => {
    const platformY = (level.rows - GROUND_ROWS - 4) * TILE;
    const rising = body(3 * TILE + 2, platformY + 10, 0, -300);
    for (let i = 0; i < 8; i++) moveBody(rising, level, STEP);
    expect(rising.y + rising.h).toBeLessThan(platformY);

    for (let i = 0; i < 30; i++) {
      rising.vy = 200;
      moveBody(rising, level, STEP);
    }
    expect(rising.onGround).toBe(true);
    expect(rising.y + rising.h).toBe(platformY);
  });

  it("detects spikes and overlaps", () => {
    expect(touchesTile({ x: TILE + 3, y: floorY - 6, w: 10, h: 6 }, level, Tile.Spike)).toBe(true);
    expect(touchesTile({ x: 3 * TILE, y: floorY - 6, w: 10, h: 6 }, level, Tile.Spike)).toBe(false);
    expect(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 9, y: 9, w: 5, h: 5 })).toBe(true);
    expect(overlaps({ x: 0, y: 0, w: 10, h: 10 }, { x: 10, y: 0, w: 5, h: 5 })).toBe(false);
  });
});

describe("sprites", () => {
  it("are rectangular", () => {
    const { PLAYER_TOP, PLAYER_LEGS, BUG_BODY, BUG_LEGS } = SPRITE_ROWS;
    [PLAYER_TOP, ...Object.values(PLAYER_LEGS)].flat().forEach((row) => expect(row).toHaveLength(12));
    [BUG_BODY, ...Object.values(BUG_LEGS)].flat().forEach((row) => expect(row).toHaveLength(14));
  });
});

const run = (game: Game, steps: number, input: Partial<Input> = {}) => {
  for (let i = 0; i < steps; i++) game.step({ ...emptyInput(), ...input }, STEP);
};

describe("game", () => {
  it("settles the player on the ground at the spawn point", () => {
    const game = new Game();
    run(game, 30);
    expect(game.player.onGround).toBe(true);
    expect(game.hud()).toMatchObject({ hearts: MAX_HEARTS, commits: 0, zone: 0, status: "playing" });
  });

  it("jumps only from the ground and jumps lower when released early", () => {
    const peak = (hold: number) => {
      const game = new Game();
      run(game, 30);
      const startY = game.player.y;
      let top = startY;
      game.step({ ...emptyInput(), jump: true, jumpPressed: true }, STEP);
      for (let i = 0; i < 80; i++) {
        game.step({ ...emptyInput(), jump: i < hold }, STEP);
        top = Math.min(top, game.player.y);
      }
      return startY - top;
    };
    const full = peak(80);
    const tap = peak(2);
    expect(full).toBeGreaterThan(2.5 * TILE);
    expect(tap).toBeLessThan(full * 0.6);
  });

  it("sets the checkpoint and opens the section at a terminal", () => {
    const game = new Game();
    const opened: string[] = [];
    game.onOpenTerminal = (s) => opened.push(s);
    const terminal = game.terminals[0];
    game.player.x = terminal.x;
    run(game, 20);
    expect(game.hud().nearTerminal).toBe("about");
    expect(game.checkpoint).toEqual({ x: terminal.x, y: terminal.y });
    game.step({ ...emptyInput(), interactPressed: true }, STEP);
    expect(opened).toEqual(["about"]);
    expect(game.hud().visited).toEqual(["about"]);
  });

  it("collects commits", () => {
    const game = new Game();
    const commit = game.commits[0];
    game.player.x = commit.x + 3;
    game.player.y = commit.y + 1;
    game.step(emptyInput(), STEP);
    expect(commit.taken).toBe(true);
    expect(game.hud().commits).toBe(1);
  });

  it("squashes a bug when landing on it and gets hurt when walking into it", () => {
    const stomp = new Game();
    run(stomp, 30);
    const bug = stomp.bugs[0];
    stomp.player.x = bug.x;
    stomp.player.y = bug.y - stomp.player.h - 2;
    stomp.player.vy = 120;
    run(stomp, 6);
    expect(bug.alive).toBe(false);
    expect(stomp.hud()).toMatchObject({ bugs: 1, hearts: MAX_HEARTS });

    const bump = new Game();
    run(bump, 30);
    const other = bump.bugs[0];
    bump.player.x = other.x + 2;
    bump.player.y = other.y + other.h - bump.player.h;
    bump.player.vy = 0;
    run(bump, 2);
    expect(other.alive).toBe(true);
    expect(bump.hud().hearts).toBe(MAX_HEARTS - 1);
  });

  it("respawns at the checkpoint after a fall and never ends the run", () => {
    const game = new Game();
    run(game, 30);
    for (let i = 0; i < MAX_HEARTS; i++) {
      game.player.y = game.levelHeight + 100;
      game.step(emptyInput(), STEP);
    }
    expect(game.status).toBe("playing");
    expect(game.hearts).toBe(MAX_HEARTS);
    expect(Math.abs(game.player.x - game.level.spawn.x)).toBeLessThan(TILE);
  });

  it("launches the rocket and wins", () => {
    const game = new Game();
    game.player.x = game.level.rocket.x;
    game.player.y = game.level.rocket.y;
    game.step(emptyInput(), STEP);
    expect(game.status).toBe("launching");
    run(game, 200);
    expect(game.status).toBe("won");
  });

  it("can be finished from start to rocket by a simple bot", () => {
    const game = new Game();
    const level = game.level;
    let holdJump = 0;
    let steps = 0;
    const limit = 60 * 240; // four minutes of game time

    while (game.status === "playing" && steps < limit) {
      const p = game.player;
      const feet = p.y + p.h - 1;
      const ahead = p.x + p.w;
      const col = (x: number) => Math.floor(x / TILE);
      const row = Math.floor(feet / TILE);

      const wall = isSolid(tileAt(level, col(ahead + 6), row));
      const pit = !hasFloorBelow(level, ahead + 4, feet + 4) && !hasFloorBelow(level, ahead + 4, feet + TILE + 4);
      const spike = [8, 20].some((d) => tileAt(level, col(ahead + d), row) === Tile.Spike);
      const bug = game.bugs.some(
        (b) => b.alive && b.x > p.x && b.x - ahead < 22 && Math.abs(b.y + b.h - (p.y + p.h)) < 6
      );

      const wantsJump = p.onGround && (wall || pit || spike || bug);
      if (wantsJump) holdJump = wall ? 30 : 18;
      game.step({ left: false, right: true, jump: holdJump > 0, jumpPressed: wantsJump, interactPressed: false }, STEP);
      if (holdJump > 0) holdJump -= 1;
      steps += 1;
    }

    expect(game.status).not.toBe("playing");
    expect(game.time).toBeLessThan(120);
  });
});
