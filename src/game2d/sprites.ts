/**
 * Pixel art written as text. Each character maps to a palette colour and "."
 * is transparent, so sprites can be read and tweaked without an image editor.
 * They are rasterised once into small canvases and blitted every frame.
 */
type Palette = Record<string, string>;

const PLAYER_PALETTE: Palette = {
  h: "#2a1c14", // hair
  s: "#f1c9a5", // skin
  e: "#1a1a2e", // eyes
  p: "#6e63f0", // hoodie
  P: "#4a41c4", // hoodie shade
  w: "#f5f5ff", // hoodie print
  j: "#262b52", // jeans
  b: "#e9e9f5", // sneakers
};

const PLAYER_TOP = [
  "....hhhh....",
  "...hhhhhh...",
  "...hsssss...",
  "...hsesse...",
  "...ssssss...",
  "....ssss....",
  "..pppppppp..",
  ".pPppppppPp.",
  ".pPppwwppPp.",
  ".sPppppppPs.",
  "..PppppppP..",
];

const PLAYER_LEGS = {
  idle: ["...jjjjjj...", "...jj..jj...", "...jj..jj...", "...jj..jj...", "..bbb..bbb.."],
  runA: ["...jjjjjj...", "..jjj..jj...", ".jj.....jj..", ".jj.....jj..", ".bb.....bbb."],
  runB: ["...jjjjjj...", "....jjjj....", "....jjjj....", "....jjj.....", "...bbbb....."],
  jump: ["...jjjjjj...", "..jj....jj..", "..jj....jj..", "..bb....jj..", "........bb.."],
};

const BUG_PALETTE: Palette = {
  r: "#f2568c",
  R: "#b8336a",
  k: "#14142b",
  w: "#ffffff",
};

const BUG_BODY = [
  "..k........k..",
  "...k......k...",
  "...rrrrrrrr...",
  "..rRrrrrrrRr..",
  ".rrwwrrrrwwrr.",
  ".rrwkrrrrwkrr.",
  ".rrrrrrrrrrrr.",
  "..rRRRRRRRRr..",
];

const BUG_LEGS = {
  a: ["..k..k..k..k..", ".k..k....k..k."],
  b: [".k..k....k..k.", "..k..k..k..k.."],
};

const rasterise = (rows: string[], palette: Palette, flip = false) => {
  const width = rows[0].length;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = rows.length;
  const ctx = canvas.getContext("2d")!;
  rows.forEach((row, y) => {
    for (let x = 0; x < width; x++) {
      const color = palette[row[x]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(flip ? width - 1 - x : x, y, 1, 1);
    }
  });
  return canvas;
};

export type PlayerFrame = keyof typeof PLAYER_LEGS;
export type Facing = "right" | "left";

export type SpriteSheet = {
  player: Record<PlayerFrame, Record<Facing, HTMLCanvasElement>>;
  bug: Record<"a" | "b", Record<Facing, HTMLCanvasElement>>;
};

export const SPRITE_ROWS = { PLAYER_TOP, PLAYER_LEGS, BUG_BODY, BUG_LEGS };

export const buildSprites = (): SpriteSheet => {
  const player = {} as SpriteSheet["player"];
  (Object.keys(PLAYER_LEGS) as PlayerFrame[]).forEach((frame) => {
    const rows = [...PLAYER_TOP, ...PLAYER_LEGS[frame]];
    player[frame] = {
      right: rasterise(rows, PLAYER_PALETTE),
      left: rasterise(rows, PLAYER_PALETTE, true),
    };
  });
  const bug = {} as SpriteSheet["bug"];
  (["a", "b"] as const).forEach((frame) => {
    const rows = [...BUG_BODY, ...BUG_LEGS[frame]];
    bug[frame] = { right: rasterise(rows, BUG_PALETTE), left: rasterise(rows, BUG_PALETTE, true) };
  });
  return { player, bug };
};
