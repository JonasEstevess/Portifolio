import { SECTIONS, type SectionId } from "@/data/sections";

/**
 * Layout of the first-person world: a hub platform floating in space, five
 * islands around it (one per portfolio section) and a bridge to each. Later
 * bridges have gaps that must be jumped. Everything walkable sits at y = 0;
 * the simulation only needs to know which (x, z) points have ground under them.
 */
export const HUB_RADIUS = 7;
export const ISLAND_RADIUS = 8.5;
export const ISLAND_DISTANCE = 36;
export const BRIDGE_WIDTH = 3.2;
export const GAP_LENGTH = 2.6;
export const MONUMENT_RADIUS = 2.4;
export const PORTAL_RADIUS = 1.5;

export type Island = {
  section: SectionId;
  index: number;
  /** Direction from the hub, in radians (x = cos, z = sin). */
  angle: number;
  x: number;
  z: number;
  /** Where the player lands after a fall: on the island, by the bridge. */
  spawn: { x: number; z: number };
};

/** A straight piece of bridge: an oriented rectangle on the ground plane. */
export type Segment = {
  island: number;
  x: number;
  z: number;
  angle: number;
  halfLength: number;
  halfWidth: number;
};

export type Crystal = { x: number; y: number; z: number };

export type World = {
  islands: Island[];
  segments: Segment[];
  crystals: Crystal[];
  spawn: { x: number; z: number };
};

/** How many gaps the bridge to each island has: the walk gets harder as it goes. */
const GAPS = [0, 1, 1, 2, 2];

export const buildWorld = (): World => {
  const islands: Island[] = [];
  const segments: Segment[] = [];
  const crystals: Crystal[] = [];

  SECTIONS.forEach((section, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / SECTIONS.length;
    const dx = Math.cos(angle);
    const dz = Math.sin(angle);
    const island: Island = {
      section: section.id,
      index,
      angle,
      x: dx * ISLAND_DISTANCE,
      z: dz * ISLAND_DISTANCE,
      spawn: { x: dx * (ISLAND_DISTANCE - ISLAND_RADIUS + 2), z: dz * (ISLAND_DISTANCE - ISLAND_RADIUS + 2) },
    };
    islands.push(island);

    // Bridge from the rim of the hub to the rim of the island, cut into pieces by the gaps.
    const from = HUB_RADIUS - 0.5;
    const to = ISLAND_DISTANCE - ISLAND_RADIUS + 0.5;
    const gaps = GAPS[index] ?? 0;
    const pieceLength = (to - from - gaps * GAP_LENGTH) / (gaps + 1);
    for (let piece = 0; piece <= gaps; piece++) {
      const start = from + piece * (pieceLength + GAP_LENGTH);
      const mid = start + pieceLength / 2;
      segments.push({ island: index, x: dx * mid, z: dz * mid, angle, halfLength: pieceLength / 2, halfWidth: BRIDGE_WIDTH / 2 });
      for (const t of [0.25, 0.5, 0.75]) {
        const at = start + pieceLength * t;
        crystals.push({ x: dx * at, y: 1.1, z: dz * at });
      }
      if (piece < gaps) {
        // A crystal hanging over each gap rewards the jump.
        const over = start + pieceLength + GAP_LENGTH / 2;
        crystals.push({ x: dx * over, y: 2.1, z: dz * over });
      }
    }

    // A ring of crystals around each monument.
    for (let k = 0; k < 5; k++) {
      const a = angle + Math.PI / 5 + (k * Math.PI * 2) / 5;
      crystals.push({ x: island.x + Math.cos(a) * 6, y: 1.1, z: island.z + Math.sin(a) * 6 });
    }
  });

  return { islands, segments, crystals, spawn: { x: 0, z: 4 } };
};

/** Which platform is under the point: "hub", an island index, a bridge, or nothing (the void). */
export const groundAt = (world: World, x: number, z: number): "hub" | "bridge" | number | null => {
  if (Math.hypot(x, z) <= HUB_RADIUS) return "hub";
  for (const island of world.islands) {
    if (Math.hypot(x - island.x, z - island.z) <= ISLAND_RADIUS) return island.index;
  }
  for (const s of world.segments) {
    const rx = x - s.x;
    const rz = z - s.z;
    const along = rx * Math.cos(s.angle) + rz * Math.sin(s.angle);
    const across = -rx * Math.sin(s.angle) + rz * Math.cos(s.angle);
    if (Math.abs(along) <= s.halfLength && Math.abs(across) <= s.halfWidth) return "bridge";
  }
  return null;
};
