import { describe, expect, it } from "vitest";
import { SECTIONS } from "@/data/sections";
import { Explorer, idleInput, type ExplorerEvent, type ExplorerInput } from "./explorer";
import { buildWorld, GAP_LENGTH, groundAt, HUB_RADIUS, ISLAND_DISTANCE, ISLAND_RADIUS } from "./world";

const DT = 1 / 60;

describe("world", () => {
  const world = buildWorld();

  it("has one island per portfolio section, evenly spread around the hub", () => {
    expect(world.islands.map((i) => i.section)).toEqual(SECTIONS.map((s) => s.id));
    for (const island of world.islands) expect(Math.hypot(island.x, island.z)).toBeCloseTo(ISLAND_DISTANCE);
  });

  it("knows what is under a point", () => {
    expect(groundAt(world, 0, 0)).toBe("hub");
    expect(groundAt(world, world.islands[2].x, world.islands[2].z)).toBe(2);
    expect(groundAt(world, 60, 60)).toBeNull();
    const first = world.segments[0];
    expect(groundAt(world, first.x, first.z)).toBe("bridge");
  });

  it("connects the hub to every island, with gaps only on later bridges", () => {
    world.islands.forEach((island, index) => {
      let gaps = 0;
      let inGap = false;
      for (let r = HUB_RADIUS - 1; r < ISLAND_DISTANCE - ISLAND_RADIUS + 1; r += 0.1) {
        const empty = groundAt(world, Math.cos(island.angle) * r, Math.sin(island.angle) * r) === null;
        if (empty && !inGap) gaps++;
        inGap = empty;
      }
      expect(gaps).toBe([0, 1, 1, 2, 2][index]);
    });
    expect(GAP_LENGTH).toBeLessThan(4); // a walking jump clears about 4.6
    // No bridge piece is so short that a sprinting jump (about 7.6) could overshoot it into the next gap.
    for (const s of world.segments) expect(GAP_LENGTH + s.halfLength * 2).toBeGreaterThan(7.7);
  });

  it("puts spawn points and ground-level crystals over solid ground", () => {
    expect(groundAt(world, world.spawn.x, world.spawn.z)).toBe("hub");
    for (const island of world.islands) expect(groundAt(world, island.spawn.x, island.spawn.z)).toBe(island.index);
    const low = world.crystals.filter((c) => c.y < 1.5);
    const high = world.crystals.filter((c) => c.y >= 1.5);
    for (const c of low) expect(groundAt(world, c.x, c.z)).not.toBeNull();
    for (const c of high) expect(groundAt(world, c.x, c.z)).toBeNull();
    expect(high.length).toBe(6);
  });
});

const run = (explorer: Explorer, steps: number, input: Partial<ExplorerInput> = {}) => {
  for (let i = 0; i < steps; i++) explorer.step({ ...idleInput(), ...input }, DT);
};

describe("explorer", () => {
  it("walks where it looks and strafes sideways", () => {
    const ahead = new Explorer();
    run(ahead, 60, { forward: 1, yaw: 0 });
    expect(ahead.position.z).toBeLessThan(ahead.world.spawn.z - 4);
    expect(Math.abs(ahead.position.x)).toBeLessThan(0.01);

    const right = new Explorer();
    run(right, 60, { strafe: 1, yaw: 0 });
    expect(right.position.x).toBeGreaterThan(4);

    const turned = new Explorer();
    run(turned, 60, { forward: 1, yaw: Math.PI / 2 });
    expect(turned.position.x).toBeLessThan(-4);
  });

  it("sprints faster than it walks, and jumps only from the ground", () => {
    const walk = new Explorer();
    const sprint = new Explorer();
    run(walk, 30, { forward: 1 });
    run(sprint, 30, { forward: 1, sprint: true });
    expect(sprint.position.z).toBeLessThan(walk.position.z - 0.8);

    const jumper = new Explorer();
    jumper.step({ ...idleInput(), jump: true }, DT);
    let peak = 0;
    for (let i = 0; i < 80; i++) {
      jumper.step({ ...idleInput(), jump: true }, DT); // holding jump must not double-jump in the air
      peak = Math.max(peak, jumper.position.y);
    }
    expect(peak).toBeGreaterThan(1.4);
    expect(peak).toBeLessThan(2.2);
    run(jumper, 90);
    expect(jumper.grounded).toBe(true);
  });

  it("falls off the edge and comes back at the last platform", () => {
    const explorer = new Explorer();
    const events: string[] = [];
    explorer.onEvent = (e) => events.push(e.type);
    // Walk straight off the hub between two bridges.
    const between = explorer.world.islands[0].angle + Math.PI / 5;
    const yaw = Math.atan2(-Math.cos(between), -Math.sin(between));
    run(explorer, 60 * 8, { forward: 1, yaw });
    expect(events).toContain("fall");
    expect(explorer.falls).toBeGreaterThan(0);
    expect(groundAt(explorer.world, explorer.position.x, explorer.position.z)).toBe("hub");
  });

  it("cannot walk through a monument", () => {
    const explorer = new Explorer();
    const island = explorer.world.islands[0];
    explorer.travelTo(island.section);
    const yaw = Math.atan2(-(island.x - explorer.position.x), -(island.z - explorer.position.z));
    run(explorer, 240, { forward: 1, yaw });
    expect(Math.hypot(explorer.position.x - island.x, explorer.position.z - island.z)).toBeGreaterThan(2.5);
  });

  it("opens a monument only within reach, and opens the portal after all five", () => {
    const explorer = new Explorer();
    const events: ExplorerEvent[] = [];
    explorer.onEvent = (e) => events.push(e);
    explorer.step({ ...idleInput(), interact: true }, DT);
    expect(events).toEqual([]);

    for (const section of SECTIONS) {
      explorer.travelTo(section.id);
      explorer.step(idleInput(), DT);
      expect(explorer.hud().near).toBe(section.id);
      explorer.step({ ...idleInput(), interact: true }, DT);
    }
    expect(events.filter((e) => e.type === "open")).toHaveLength(5);
    expect(events.at(-1)).toEqual({ type: "portal" });
    expect(explorer.hud().portalOpen).toBe(true);
  });

  it("a bot can cross every bridge, open every monument, take every crystal and win", () => {
    const explorer = new Explorer();
    const world = explorer.world;
    let steps = 0;

    const walkTo = (x: number, z: number, stopAt = 0.6) => {
      while (Math.hypot(explorer.position.x - x, explorer.position.z - z) > stopAt && steps < 60 * 900) {
        const p = explorer.position;
        const yaw = Math.atan2(-(x - p.x), -(z - p.z));
        // Jump when the ground runs out a step ahead.
        const aheadX = p.x - Math.sin(yaw) * 1.1;
        const aheadZ = p.z - Math.cos(yaw) * 1.1;
        const jump = explorer.grounded && groundAt(world, aheadX, aheadZ) === null;
        explorer.step({ forward: 1, strafe: 0, yaw, jump, sprint: true, interact: false }, DT);
        steps++;
        if (explorer.status === "won") return;
      }
    };

    for (const island of world.islands) {
      // Line up with the bridge on the hub first: a diagonal would cut across the void.
      walkTo(Math.cos(island.angle) * 4, Math.sin(island.angle) * 4);
      walkTo(island.spawn.x, island.spawn.z);
      // Once around the monument for the ring of crystals.
      for (let k = 0; k <= 5; k++) {
        const a = island.angle + Math.PI / 5 + (k * Math.PI * 2) / 5;
        walkTo(island.x + Math.cos(a) * 6, island.z + Math.sin(a) * 6);
      }
      explorer.step({ ...idleInput(), interact: true }, DT);
      walkTo(island.spawn.x, island.spawn.z);
      walkTo(Math.cos(island.angle) * 4, Math.sin(island.angle) * 4);
    }
    walkTo(0, 0, 0.2);

    const hud = explorer.hud();
    expect({ steps, falls: hud.falls, visited: hud.visited.length, at: [Math.round(explorer.position.x), Math.round(explorer.position.z)] }).toMatchObject({ falls: 0, visited: 5 });
    expect(hud.status).toBe("won");
    expect(hud.visited).toEqual(SECTIONS.map((s) => s.id));
    expect(hud.falls).toBe(0);
    expect(hud.crystals).toBe(hud.totalCrystals);
  });
});
