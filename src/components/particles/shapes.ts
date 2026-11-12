/**
 * Point-cloud sculptures. Every chapter of the 3D experience is the same set
 * of particles rearranged into one of these shapes, so each generator returns
 * exactly `count` positions and colours. They are pure functions of a seeded
 * random source: no DOM, no three.js, easy to test.
 */
export type Shape = {
  /** xyz triples, roughly inside a sphere of radius 4. */
  positions: Float32Array;
  /** rgb triples, 0..1. */
  colors: Float32Array;
};

export type Random = () => number;

export const seeded = (seed: number): Random => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

type RGB = [number, number, number];

const hex = (value: string): RGB => {
  const n = parseInt(value.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

const WHITE: RGB = [1, 1, 1];

/** Approximately normal-distributed value in about -1..1. */
const gauss = (rand: Random) => (rand() + rand() + rand() - 1.5) / 1.5;

const builder = (count: number) => {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  return {
    set(i: number, x: number, y: number, z: number, color: RGB, brightness = 1) {
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      colors[i * 3] = color[0] * brightness;
      colors[i * 3 + 1] = color[1] * brightness;
      colors[i * 3 + 2] = color[2] * brightness;
    },
    done: (): Shape => ({ positions, colors }),
  };
};

const rotateX = (y: number, z: number, angle: number): [number, number] => [
  y * Math.cos(angle) - z * Math.sin(angle),
  y * Math.sin(angle) + z * Math.cos(angle),
];

/** Intro: a three-armed spiral galaxy seen at an angle. */
export const galaxy = (count: number, rand: Random): Shape => {
  const b = builder(count);
  const core = hex("#fff4d6");
  const arm = hex("#6e63f0");
  const edge = hex("#46c2e3");
  for (let i = 0; i < count; i++) {
    const r = Math.pow(rand(), 0.62) * 3.8;
    const angle = (Math.floor(rand() * 3) * Math.PI * 2) / 3 + r * 1.15 + gauss(rand) * 0.28;
    const x = Math.cos(angle) * r;
    const flatZ = Math.sin(angle) * r;
    const flatY = gauss(rand) * 0.16 * (1.2 - r / 4.2);
    const [y, z] = rotateX(flatY, flatZ, 1.05);
    const t = r / 3.8;
    const color = t < 0.25 ? mix(core, arm, t * 4) : mix(arm, edge, (t - 0.25) / 0.75);
    b.set(i, x, y, z, color, 0.55 + rand() * 0.6);
  }
  return b.done();
};

/** Fallback used until the portrait image has loaded: a hollow sphere. */
export const sphere = (count: number, rand: Random, color = "#6e63f0"): Shape => {
  const b = builder(count);
  const base = hex(color);
  for (let i = 0; i < count; i++) {
    const u = rand() * 2 - 1;
    const theta = rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r = 2.1 + gauss(rand) * 0.04;
    b.set(i, Math.cos(theta) * s * r, u * r, Math.sin(theta) * s * r, base, 0.5 + rand() * 0.6);
  }
  return b.done();
};

/**
 * About: the portrait photo as a relief of points. Darker pixels (the person,
 * against a bright wall) attract more particles, and brightness sets the
 * depth, so the figure reads in 3D when the cloud turns. `pixels` is RGBA data of a `width` × `height` image.
 */
export const portrait = (
  count: number,
  rand: Random,
  pixels: Uint8ClampedArray | number[],
  width: number,
  height: number
): Shape => {
  const b = builder(count);
  const spanX = 4.3;
  const spanY = (spanX * height) / width;
  let i = 0;
  let guard = 0;
  while (i < count) {
    const px = Math.floor(rand() * width);
    const py = Math.floor(rand() * height);
    const at = (py * width + px) * 4;
    const r = pixels[at] / 255;
    const g = pixels[at + 1] / 255;
    const bl = pixels[at + 2] / 255;
    const lum = 0.299 * r + 0.587 * g + 0.114 * bl;
    // Rejection sampling; the guard keeps an all-black image from looping forever.
    if (rand() > 0.3 + 0.7 * (1 - lum) && guard++ < count * 40) continue;
    const x = ((px + rand()) / width - 0.5) * spanX;
    const y = (0.5 - (py + rand()) / height) * spanY;
    const z = (lum - 0.5) * 0.9 + gauss(rand) * 0.02;
    // Particles are drawn additively: keep them dim or overlapping points burn out to white.
    b.set(i, x, y, z, [r, g, bl], lum > 0.75 ? 0.3 : 0.62);
    i++;
  }
  return b.done();
};

/** Education: a double helix climbing through five glowing milestones. */
export const helix = (count: number, rand: Random): Shape => {
  const b = builder(count);
  const low = hex("#8b7cf6");
  const high = hex("#46c2e3");
  const HEIGHT = 5.4;
  const TURNS = Math.PI * 5;
  const strand = (t: number, which: number): [number, number, number] => {
    const angle = t * TURNS + which * Math.PI;
    return [Math.cos(angle) * 1.05, (t - 0.5) * HEIGHT, Math.sin(angle) * 1.05];
  };
  for (let i = 0; i < count; i++) {
    const kind = rand();
    if (kind < 0.62) {
      const t = rand();
      const [x, y, z] = strand(t, i % 2);
      b.set(i, x + gauss(rand) * 0.05, y + gauss(rand) * 0.05, z + gauss(rand) * 0.05, mix(low, high, t), 0.6 + rand() * 0.5);
    } else if (kind < 0.8) {
      const t = (Math.floor(rand() * 26) + 0.5) / 26;
      const a = strand(t, 0);
      const c = strand(t, 1);
      const k = rand();
      b.set(i, a[0] + (c[0] - a[0]) * k, a[1], a[2] + (c[2] - a[2]) * k, mix(low, high, t), 0.35 + rand() * 0.3);
    } else {
      const [x, y, z] = strand((Math.floor(rand() * 5) + 0.5) / 5, 0);
      const u = rand() * 2 - 1;
      const theta = rand() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const r = 0.26 * Math.cbrt(rand());
      b.set(i, x + Math.cos(theta) * s * r, y + u * r, z + Math.sin(theta) * s * r, WHITE, 0.9 + rand() * 0.4);
    }
  }
  return b.done();
};

/** Skills: an atom, nucleus plus three tilted orbits with their electrons. */
export const atom = (count: number, rand: Random): Shape => {
  const b = builder(count);
  const cyan = hex("#46c2e3");
  const nucleus = hex("#d8f6ff");
  for (let i = 0; i < count; i++) {
    const kind = rand();
    if (kind < 0.18) {
      const u = rand() * 2 - 1;
      const theta = rand() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const r = 0.6 * Math.cbrt(rand());
      b.set(i, Math.cos(theta) * s * r, u * r, Math.sin(theta) * s * r, nucleus, 0.8 + rand() * 0.5);
      continue;
    }
    if (kind < 0.9) {
      const orbit = Math.floor(rand() * 3);
      const electron = kind > 0.82;
      const angle = electron ? orbit * 2.1 + 0.6 + gauss(rand) * 0.07 : rand() * Math.PI * 2;
      const jitter = electron ? 0.13 : 0.035;
      const ex = Math.cos(angle) * 2.9 + gauss(rand) * jitter;
      const ey = Math.sin(angle) * 1.05 + gauss(rand) * jitter;
      const tilt = (orbit * Math.PI) / 3;
      b.set(
        i,
        ex * Math.cos(tilt) - ey * Math.sin(tilt),
        ex * Math.sin(tilt) + ey * Math.cos(tilt),
        gauss(rand) * jitter + Math.sin(angle) * 0.5,
        electron ? WHITE : cyan,
        electron ? 1.2 : 0.55 + rand() * 0.5
      );
      continue;
    }
    const u = rand() * 2 - 1;
    const theta = rand() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    b.set(i, Math.cos(theta) * s * 3.5, u * 3.5, Math.sin(theta) * s * 3.5, cyan, 0.25 + rand() * 0.2);
  }
  return b.done();
};

/** Projects: a stage. Two rings and a dotted floor frame the screenshot carousel. */
export const gallery = (count: number, rand: Random): Shape => {
  const b = builder(count);
  const amber = hex("#f5a742");
  const pale = hex("#ffe3b0");
  for (let i = 0; i < count; i++) {
    const kind = rand();
    const angle = rand() * Math.PI * 2;
    if (kind < 0.36) {
      const r = 3.35 + gauss(rand) * 0.035;
      b.set(i, Math.cos(angle) * r, -1.2 + gauss(rand) * 0.03, Math.sin(angle) * r, amber, 0.6 + rand() * 0.6);
    } else if (kind < 0.5) {
      const r = 3.35 + gauss(rand) * 0.03;
      b.set(i, Math.cos(angle) * r, 1.25 + gauss(rand) * 0.03, Math.sin(angle) * r, amber, 0.35 + rand() * 0.4);
    } else if (kind < 0.82) {
      const ringIndex = Math.floor(rand() * 9) + 1;
      const r = (ringIndex / 9) * 3.2;
      const snapped = (Math.round((angle / (Math.PI * 2)) * ringIndex * 14) / (ringIndex * 14)) * Math.PI * 2;
      b.set(i, Math.cos(snapped) * r, -1.22, Math.sin(snapped) * r, pale, 0.2 + (ringIndex / 9) * 0.35);
    } else {
      const r = 4.2 + rand() * 1.6;
      b.set(i, Math.cos(angle) * r, gauss(rand) * 2.4, Math.sin(angle) * r, pale, 0.2 + rand() * 0.35);
    }
  }
  return b.done();
};

/** Contact: a paper plane, mid-flight, trailing the path it flew. */
export const paperPlane = (count: number, rand: Random): Shape => {
  const b = builder(count);
  const pink = hex("#f2568c");
  const light = hex("#ffd1e0");
  type V = [number, number, number];
  const nose: V = [2.3, 0, 0];
  const keel: V = [-1.6, -0.75, 0];
  const leftTip: V = [-1.9, 0.28, 1.55];
  const rightTip: V = [-1.9, 0.28, -1.55];
  const leftFold: V = [-1.75, 0.28, 0.24];
  const rightFold: V = [-1.75, 0.28, -0.24];
  const faces: { tri: [V, V, V]; weight: number; shade: number }[] = [
    { tri: [nose, leftTip, leftFold], weight: 0.34, shade: 1 },
    { tri: [nose, rightTip, rightFold], weight: 0.34, shade: 0.8 },
    { tri: [nose, leftFold, keel], weight: 0.16, shade: 0.55 },
    { tri: [nose, rightFold, keel], weight: 0.16, shade: 0.45 },
  ];
  // Bank and yaw the whole figure so it flies up and to the right.
  const place = (x: number, y: number, z: number): V => {
    const yaw = -0.55;
    const x1 = x * Math.cos(yaw) + z * Math.sin(yaw);
    const z1 = -x * Math.sin(yaw) + z * Math.cos(yaw);
    const roll = 0.32;
    return [x1 * Math.cos(roll) - y * Math.sin(roll), x1 * Math.sin(roll) + y * Math.cos(roll), z1];
  };
  for (let i = 0; i < count; i++) {
    const kind = rand();
    if (kind < 0.72) {
      let pick = rand();
      let face = faces[0];
      for (const f of faces) {
        if (pick < f.weight) {
          face = f;
          break;
        }
        pick -= f.weight;
      }
      let u = rand();
      let v = rand();
      if (u + v > 1) {
        u = 1 - u;
        v = 1 - v;
      }
      const [a, c, d] = face.tri;
      const [x, y, z] = place(
        a[0] + (c[0] - a[0]) * u + (d[0] - a[0]) * v,
        a[1] + (c[1] - a[1]) * u + (d[1] - a[1]) * v,
        a[2] + (c[2] - a[2]) * u + (d[2] - a[2]) * v
      );
      // Denser, brighter edges make the folds read.
      const edge = Math.min(u, v, 1 - u - v) < 0.03;
      b.set(i, x, y, z, edge ? light : pink, (edge ? 1.2 : 0.5 + rand() * 0.4) * face.shade);
    } else if (kind < 0.92) {
      const t = Math.pow(rand(), 0.8);
      const spread = 0.05 + t * 0.3;
      const [x, y, z] = place(
        -1.8 - t * 4.2,
        Math.sin(t * 4.5) * 0.55 - t * 0.9 + gauss(rand) * spread,
        Math.cos(t * 3) * 0.5 - 0.5 + gauss(rand) * spread
      );
      b.set(i, x, y, z, light, (1 - t) * 0.7 + 0.1);
    } else {
      b.set(i, gauss(rand) * 5.5, gauss(rand) * 3.2, gauss(rand) * 2.5 - 1.5, light, 0.15 + rand() * 0.3);
    }
  }
  return b.done();
};
