import type { SectionId } from "@/data/sections";
import { GROUND_ROWS, LEVEL_ROWS, TILE } from "./constants";

export enum Tile {
  Empty = 0,
  Ground = 1,
  Brick = 2,
  OneWay = 3,
  Spike = 4,
}

export type Point = { x: number; y: number };

export type Level = {
  /** Size in tiles. */
  cols: number;
  rows: number;
  tiles: Uint8Array;
  /** All positions below are in pixels, top-left of the tile the symbol sat on. */
  spawn: Point;
  commits: Point[];
  bugs: Point[];
  terminals: (Point & { section: SectionId })[];
  rocket: Point;
  /** First column of each zone, in tiles; one zone per section, in order. */
  zoneStarts: number[];
  zoneSections: SectionId[];
};

/**
 * A chunk is one zone of the level, written as ASCII so it can be read and
 * edited like a picture.
 *
 *   #  ground      B  brick        -  one-way platform   ^  spike
 *   o  commit      e  bug          T  terminal           P  spawn    R  rocket
 *
 * `rows` are the rows directly above the ground, listed top to bottom (the
 * last string sits right on the floor). `ground` describes the floor itself:
 * a space is a pit. Short rows are padded, so trailing spaces are optional.
 */
type Chunk = {
  section: SectionId;
  ground: string;
  rows: string[];
};

const CHUNKS: Chunk[] = [
  {
    // Warm-up: nothing here can hurt except a single slow bug at the very end.
    section: "about",
    //       0         1         2         3
    //       0123456789012345678901234567890123
    ground: "##################################",
    rows: [
      "                    ooo",
      "                   -----",
      "",
      "  P       T     o o         e",
    ],
  },
  {
    // Stairs up (studying), a first pit, two bugs.
    section: "forma",
    //       0         1         2         3
    //       0123456789012345678901234567890123456789
    ground: "###########################  ###########",
    rows: [
      "                     ooo",
      "",
      "                    BBBBB        o o",
      "    T    o o   BBBBBBBBBB      e    e",
    ],
  },
  {
    // Floating platforms full of commits; spikes underneath for the careless.
    section: "skills",
    //       0         1         2         3         4
    //       01234567890123456789012345678901234567890123
    ground: "############################################",
    rows: [
      "                      o o o",
      "                     -------",
      "",
      "            ooo               ooo",
      "           -----             -----",
      "",
      "    T                ^^^             e",
    ],
  },
  {
    // The busiest stretch: three pits, a brick tower and three bugs.
    section: "projects",
    //       0         1         2         3         4
    //       012345678901234567890123456789012345678901234567
    ground: "################  ######  ####  ################",
    rows: [
      "                          ooo",
      "                         -----",
      "              o                      o o",
      "             BBB        o     o     BBBBB",
      "    T    e   BBB   e                BBBBB   e",
    ],
  },
  {
    // Victory lap to the rocket.
    section: "contact",
    //       0         1         2         3
    //       0123456789012345678901234567890123456789
    ground: "########################################",
    rows: [
      "          o o o",
      "         -------",
      "",
      "    T             e     ooo       R",
    ],
  },
];

const px = (col: number, row: number): Point => ({ x: col * TILE, y: row * TILE });

export const buildLevel = (chunks: Chunk[] = CHUNKS): Level => {
  const cols = chunks.reduce((sum, c) => sum + c.ground.length, 0);
  const rows = LEVEL_ROWS;
  const tiles = new Uint8Array(cols * rows);
  const level: Level = {
    cols,
    rows,
    tiles,
    spawn: px(2, rows - GROUND_ROWS - 1),
    commits: [],
    bugs: [],
    terminals: [],
    rocket: px(cols - 4, rows - GROUND_ROWS - 1),
    zoneStarts: [],
    zoneSections: [],
  };

  let offset = 0;
  for (const chunk of chunks) {
    const width = chunk.ground.length;
    level.zoneStarts.push(offset);
    level.zoneSections.push(chunk.section);

    for (let c = 0; c < width; c++) {
      if (chunk.ground[c] !== "#") continue;
      for (let r = rows - GROUND_ROWS; r < rows; r++) tiles[r * cols + offset + c] = Tile.Ground;
    }

    const firstRow = rows - GROUND_ROWS - chunk.rows.length;
    chunk.rows.forEach((line, i) => {
      const row = firstRow + i;
      for (let c = 0; c < Math.min(line.length, width); c++) {
        const col = offset + c;
        const at = px(col, row);
        switch (line[c]) {
          case "#":
            tiles[row * cols + col] = Tile.Ground;
            break;
          case "B":
            tiles[row * cols + col] = Tile.Brick;
            break;
          case "-":
            tiles[row * cols + col] = Tile.OneWay;
            break;
          case "^":
            tiles[row * cols + col] = Tile.Spike;
            break;
          case "o":
            level.commits.push(at);
            break;
          case "e":
            level.bugs.push(at);
            break;
          case "T":
            level.terminals.push({ ...at, section: chunk.section });
            break;
          case "P":
            level.spawn = at;
            break;
          case "R":
            level.rocket = at;
            break;
        }
      }
    });

    offset += width;
  }

  return level;
};

export const tileAt = (level: Level, col: number, row: number): Tile => {
  if (col < 0 || col >= level.cols) return Tile.Brick; // invisible walls at both ends
  if (row < 0 || row >= level.rows) return Tile.Empty; // open sky above, pits below
  return level.tiles[row * level.cols + col] as Tile;
};

export const isSolid = (tile: Tile) => tile === Tile.Ground || tile === Tile.Brick;

/** Index of the zone that contains the given pixel x. */
export const zoneAt = (level: Level, x: number) => {
  const col = x / TILE;
  let zone = 0;
  for (let i = 0; i < level.zoneStarts.length; i++) if (col >= level.zoneStarts[i]) zone = i;
  return zone;
};
