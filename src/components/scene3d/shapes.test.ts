import { describe, expect, it } from "vitest";
import { atom, galaxy, gallery, helix, paperPlane, portrait, seeded, sphere, type Shape } from "./shapes";

const COUNT = 4000;

const check = (shape: Shape) => {
  expect(shape.positions).toHaveLength(COUNT * 3);
  expect(shape.colors).toHaveLength(COUNT * 3);
  let farthest = 0;
  for (let i = 0; i < COUNT; i++) {
    const x = shape.positions[i * 3];
    const y = shape.positions[i * 3 + 1];
    const z = shape.positions[i * 3 + 2];
    expect(Number.isFinite(x + y + z)).toBe(true);
    farthest = Math.max(farthest, Math.hypot(x, y, z));
  }
  for (const c of shape.colors) {
    expect(c).toBeGreaterThanOrEqual(0);
    expect(c).toBeLessThanOrEqual(1.5);
  }
  return farthest;
};

describe("particle shapes", () => {
  const generators = { galaxy, sphere, helix, atom, gallery, paperPlane };

  for (const [name, generate] of Object.entries(generators)) {
    it(`${name} fills every particle and stays inside the stage`, () => {
      // The shader's bounding sphere has radius 12; shapes must fit well inside it.
      expect(check(generate(COUNT, seeded(1)))).toBeLessThan(11);
    });
  }

  it("are deterministic for a given seed", () => {
    expect(helix(COUNT, seeded(5)).positions).toEqual(helix(COUNT, seeded(5)).positions);
    expect(helix(COUNT, seeded(5)).positions).not.toEqual(helix(COUNT, seeded(6)).positions);
  });

  it("builds the portrait from pixels, favouring the darker subject", () => {
    // 4×2 image: left half black, right half white.
    const pixels: number[] = [];
    for (let y = 0; y < 2; y++) for (let x = 0; x < 4; x++) pixels.push(...(x < 2 ? [0, 0, 0, 255] : [255, 255, 255, 255]));
    const shape = portrait(COUNT, seeded(3), pixels, 4, 2);
    check(shape);
    let left = 0;
    for (let i = 0; i < COUNT; i++) if (shape.positions[i * 3] < 0) left++;
    expect(left).toBeGreaterThan(COUNT * 0.6);
  });

  it("does not hang on an image that rejects every sample", () => {
    const white = new Array(4 * 4 * 4).fill(255);
    expect(check(portrait(COUNT, seeded(9), white, 4, 4))).toBeLessThan(11);
  });
});
