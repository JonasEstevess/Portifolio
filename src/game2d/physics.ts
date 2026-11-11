import { TILE } from "./constants";
import { isSolid, Tile, tileAt, type Level } from "./level";

export type Body = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
};

const EPS = 0.001;

/**
 * Moves a body by its velocity and resolves collisions against the tile grid,
 * one axis at a time. One-way platforms only stop a body that was above them
 * before the move, so they can be jumped through from below.
 *
 * Returns whether a wall stopped the horizontal movement.
 */
export const moveBody = (body: Body, level: Level, dt: number): { hitWall: boolean } => {
  let hitWall = false;

  // Horizontal
  body.x += body.vx * dt;
  if (body.vx !== 0) {
    const top = Math.floor(body.y / TILE);
    const bottom = Math.floor((body.y + body.h - EPS) / TILE);
    const col = body.vx > 0 ? Math.floor((body.x + body.w - EPS) / TILE) : Math.floor(body.x / TILE);
    for (let row = top; row <= bottom; row++) {
      if (!isSolid(tileAt(level, col, row))) continue;
      body.x = body.vx > 0 ? col * TILE - body.w : (col + 1) * TILE;
      body.vx = 0;
      hitWall = true;
      break;
    }
  }

  // Vertical
  const previousBottom = body.y + body.h;
  body.y += body.vy * dt;
  body.onGround = false;
  const left = Math.floor(body.x / TILE);
  const right = Math.floor((body.x + body.w - EPS) / TILE);
  if (body.vy > 0) {
    const row = Math.floor((body.y + body.h - EPS) / TILE);
    for (let col = left; col <= right; col++) {
      const tile = tileAt(level, col, row);
      const lands = isSolid(tile) || (tile === Tile.OneWay && previousBottom <= row * TILE + 0.01);
      if (!lands) continue;
      body.y = row * TILE - body.h;
      body.vy = 0;
      body.onGround = true;
      break;
    }
  } else if (body.vy < 0) {
    const row = Math.floor(body.y / TILE);
    for (let col = left; col <= right; col++) {
      if (!isSolid(tileAt(level, col, row))) continue;
      body.y = (row + 1) * TILE;
      body.vy = 0;
      break;
    }
  }

  return { hitWall };
};

type Box = { x: number; y: number; w: number; h: number };

export const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** True when any tile under the box (shrunk by `inset`) is of the given kind. */
export const touchesTile = (box: Box, level: Level, kind: Tile, inset = 0) => {
  const left = Math.floor((box.x + inset) / TILE);
  const right = Math.floor((box.x + box.w - inset - EPS) / TILE);
  const top = Math.floor((box.y + inset) / TILE);
  const bottom = Math.floor((box.y + box.h - EPS) / TILE);
  for (let row = top; row <= bottom; row++)
    for (let col = left; col <= right; col++) if (tileAt(level, col, row) === kind) return true;
  return false;
};

/** Whether there is something to stand on right below the given point. */
export const hasFloorBelow = (level: Level, x: number, y: number) => {
  const tile = tileAt(level, Math.floor(x / TILE), Math.floor(y / TILE));
  return isSolid(tile) || tile === Tile.OneWay;
};
