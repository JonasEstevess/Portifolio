import type { SectionId } from "@/data/sections";
import { buildWorld, groundAt, MONUMENT_RADIUS, PORTAL_RADIUS, type World } from "./world";

export const EYE_HEIGHT = 1.7;
const WALK_SPEED = 6.2;
const SPRINT = 1.65;
// Tuned together with the bridges: even a sprinting jump (about 7.6 units) lands on the next
// piece instead of sailing over it into the following gap.
const JUMP_SPEED = 8.2;
const GRAVITY = 22;
const PLAYER_RADIUS = 0.45;
const CRYSTAL_REACH = 1.35;
/** Monuments start assembling when the player gets this close... */
export const AWAKEN_DISTANCE = 13;
/** ...and can be opened from here. */
export const INTERACT_DISTANCE = 6.8;
const VOID_DEPTH = -28;

export type ExplorerInput = {
  /** -1..1, positive is forward. */
  forward: number;
  /** -1..1, positive is right. */
  strafe: number;
  /** Where the player looks, radians around the vertical axis (three.js convention). */
  yaw: number;
  jump: boolean;
  sprint: boolean;
  /** Edge-triggered. */
  interact: boolean;
};

export const idleInput = (): ExplorerInput => ({ forward: 0, strafe: 0, yaw: 0, jump: false, sprint: false, interact: false });

export type ExplorerEvent =
  | { type: "crystal"; index: number }
  | { type: "jump" }
  | { type: "fall" }
  | { type: "open"; section: SectionId }
  | { type: "portal" }
  | { type: "won" };

export type ExplorerHud = {
  status: "exploring" | "won";
  crystals: number;
  totalCrystals: number;
  visited: SectionId[];
  near: SectionId | null;
  portalOpen: boolean;
  falls: number;
  time: number;
};

/**
 * First-person simulation: walking, sprinting, jumping, falling into the
 * void and respawning, picking up crystals, opening monuments and finally
 * stepping through the portal. Free of three.js and DOM so a test can walk
 * the whole world.
 */
export class Explorer {
  readonly world: World;
  position = { x: 0, y: 0, z: 0 };
  velocity = { x: 0, y: 0, z: 0 };
  grounded = true;
  status: "exploring" | "won" = "exploring";
  time = 0;
  falls = 0;
  crystalTaken: boolean[];
  visited: boolean[];
  /** Index of the monument in reach, or -1. */
  near = -1;
  private checkpoint: { x: number; z: number };

  onEvent?: (event: ExplorerEvent) => void;

  constructor(world: World = buildWorld()) {
    this.world = world;
    this.position.x = world.spawn.x;
    this.position.z = world.spawn.z;
    this.checkpoint = { ...world.spawn };
    this.crystalTaken = world.crystals.map(() => false);
    this.visited = world.islands.map(() => false);
  }

  get portalOpen() {
    return this.visited.every(Boolean);
  }

  hud(): ExplorerHud {
    return {
      status: this.status,
      crystals: this.crystalTaken.filter(Boolean).length,
      totalCrystals: this.world.crystals.length,
      visited: this.world.islands.filter((_, i) => this.visited[i]).map((island) => island.section),
      near: this.near >= 0 ? this.world.islands[this.near].section : null,
      portalOpen: this.portalOpen,
      falls: this.falls,
      time: this.time,
    };
  }

  /** How assembled each monument should look, 0..1, from the player's distance to it. */
  awakening(index: number) {
    const island = this.world.islands[index];
    const distance = Math.hypot(this.position.x - island.x, this.position.z - island.z);
    return Math.max(0, Math.min(1, (AWAKEN_DISTANCE + 6 - distance) / 6));
  }

  /** Marks a section as seen: used when it is opened from a menu instead of at its monument. */
  markVisited(section: SectionId) {
    const index = this.world.islands.findIndex((island) => island.section === section);
    if (index < 0 || this.visited[index]) return;
    this.visited[index] = true;
    if (this.portalOpen) this.onEvent?.({ type: "portal" });
  }

  /** Puts the player in front of a monument, for the quick-travel shortcut. Returns the yaw that faces it. */
  travelTo(section: SectionId) {
    const island = this.world.islands.find((i) => i.section === section);
    if (!island) return 0;
    // Close enough to open it straight away, on the side that faces the hub.
    const x = island.x - Math.cos(island.angle) * 5.4;
    const z = island.z - Math.sin(island.angle) * 5.4;
    this.position = { x, y: 0, z };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.grounded = true;
    this.checkpoint = { ...island.spawn };
    return Math.atan2(-(island.x - x), -(island.z - z));
  }

  step(input: ExplorerInput, dt: number) {
    if (this.status !== "exploring") return;
    this.time += dt;
    const p = this.position;
    const v = this.velocity;

    // Wish direction from the look angle. In three.js, yaw 0 looks down -z.
    const sin = Math.sin(input.yaw);
    const cos = Math.cos(input.yaw);
    let wishX = -sin * input.forward + cos * input.strafe;
    let wishZ = -cos * input.forward - sin * input.strafe;
    const length = Math.hypot(wishX, wishZ);
    if (length > 1) {
      wishX /= length;
      wishZ /= length;
    }
    const speed = WALK_SPEED * (input.sprint ? SPRINT : 1);
    // Tight control on the ground, a little steering in the air.
    const grip = Math.min(1, dt * (this.grounded ? 11 : 2.5));
    v.x += (wishX * speed - v.x) * grip;
    v.z += (wishZ * speed - v.z) * grip;

    if (input.jump && this.grounded) {
      v.y = JUMP_SPEED;
      this.grounded = false;
      this.onEvent?.({ type: "jump" });
    }
    v.y -= GRAVITY * dt;

    const previousY = p.y;
    p.x += v.x * dt;
    p.z += v.z * dt;
    p.y += v.y * dt;

    // Monuments are solid.
    for (const island of this.world.islands) {
      const dx = p.x - island.x;
      const dz = p.z - island.z;
      const distance = Math.hypot(dx, dz);
      const minimum = MONUMENT_RADIUS + PLAYER_RADIUS;
      if (distance < minimum && distance > 0.0001) {
        p.x = island.x + (dx / distance) * minimum;
        p.z = island.z + (dz / distance) * minimum;
      }
    }

    // Land only when coming down onto a platform from above: no climbing back from the void.
    const ground = groundAt(this.world, p.x, p.z);
    this.grounded = false;
    if (ground !== null && p.y <= 0 && v.y <= 0 && previousY >= -0.35) {
      p.y = 0;
      v.y = 0;
      this.grounded = true;
      if (ground === "hub") this.checkpoint = { ...this.world.spawn };
      else if (typeof ground === "number") this.checkpoint = { ...this.world.islands[ground].spawn };
    }

    if (p.y < VOID_DEPTH) {
      this.position = { x: this.checkpoint.x, y: 0, z: this.checkpoint.z };
      this.velocity = { x: 0, y: 0, z: 0 };
      this.grounded = true;
      this.falls += 1;
      this.onEvent?.({ type: "fall" });
      return;
    }

    this.world.crystals.forEach((crystal, i) => {
      if (this.crystalTaken[i]) return;
      if (Math.hypot(crystal.x - p.x, crystal.y - (p.y + 1), crystal.z - p.z) > CRYSTAL_REACH) return;
      this.crystalTaken[i] = true;
      this.onEvent?.({ type: "crystal", index: i });
    });

    this.near = -1;
    let best = INTERACT_DISTANCE;
    this.world.islands.forEach((island, i) => {
      const distance = Math.hypot(p.x - island.x, p.z - island.z);
      if (distance < best) {
        best = distance;
        this.near = i;
      }
    });
    if (input.interact && this.near >= 0) {
      const wasOpen = this.portalOpen;
      this.visited[this.near] = true;
      v.x = v.z = 0;
      this.onEvent?.({ type: "open", section: this.world.islands[this.near].section });
      if (!wasOpen && this.portalOpen) this.onEvent?.({ type: "portal" });
    }

    if (this.portalOpen && this.grounded && Math.hypot(p.x, p.z) < PORTAL_RADIUS) {
      this.status = "won";
      this.onEvent?.({ type: "won" });
    }
  }
}
