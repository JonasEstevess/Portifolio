import * as THREE from "three";
import { atom, galaxy, gallery, helix, paperPlane, portrait, seeded, sphere, type Shape } from "./shapes";

/** One entry per chapter, in order: intro, about, education, skills, projects, contact. */
export const CHAPTER_COUNT = 6;
const PROJECTS_CHAPTER = 4;

const VERTEX = /* glsl */ `
  attribute vec3 aFrom;
  attribute vec3 aTo;
  attribute vec3 aColorFrom;
  attribute vec3 aColorTo;
  attribute vec4 aRand;

  uniform float uTime;
  uniform float uProgress;
  uniform float uChaos;
  uniform float uSize;
  uniform vec3 uMouse;
  uniform float uMouseStrength;
  uniform float uBurst;
  uniform float uCalm;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Each particle leaves and arrives on its own schedule, so shapes dissolve instead of sliding.
    float local = clamp((uProgress - aRand.x * 0.4) / 0.6, 0.0, 1.0);
    float eased = local * local * (3.0 - 2.0 * local);
    vec3 pos = mix(aFrom, aTo, eased);

    // Mid-flight turbulence: a swirl that is zero at both ends of the transition.
    float mid = sin(eased * 3.14159265);
    vec3 swirl = vec3(
      sin(aRand.y * 6.2831 + uTime * 0.9 + pos.y),
      cos(aRand.z * 6.2831 + uTime * 1.1 + pos.x),
      sin(aRand.w * 6.2831 - uTime * 0.8 + pos.z)
    );
    pos += swirl * mid * uChaos * (0.6 + aRand.x);

    // Idle shimmer.
    pos += 0.022 * vec3(
      sin(uTime * 0.9 + aRand.y * 40.0),
      cos(uTime * 0.8 + aRand.z * 40.0),
      sin(uTime * 1.0 + aRand.w * 40.0)
    );

    // The pointer pushes particles away; a click sends a shockwave.
    vec3 away = pos - uMouse;
    float dist = length(away.xy);
    float push = smoothstep(1.3, 0.0, dist) * uMouseStrength;
    float wave = smoothstep(3.2, 0.0, dist) * uBurst;
    pos += normalize(vec3(away.xy, 0.35)) * (push * 0.55 + wave * 1.6);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mv;
    // "Calm" evens out size and twinkle so the portrait reads as a picture, not as noise.
    gl_PointSize = uSize * mix(0.55 + aRand.x * 0.9, 0.82, uCalm) / -mv.z;

    vColor = mix(aColorFrom, aColorTo, eased);
    vAlpha = mix(0.55 + 0.45 * sin(uTime * 1.6 + aRand.w * 30.0), 0.8, uCalm);
  }
`;

const FRAGMENT = /* glsl */ `
  precision mediump float;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float alpha = smoothstep(0.5, 0.08, d) * vAlpha;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

type Layout = { x: number; y: number; scale: number };

export type StageOptions = {
  count: number;
  reducedMotion: boolean;
  photoUrl: string;
  /** Screenshot URLs for the project carousel, in display order. */
  projectImages: string[];
};

/**
 * The WebGL side of the 3D experience: one particle system that morphs
 * between a shape per chapter, plus a ring of project screenshots. Knows
 * nothing about React; the component drives it through a few setters.
 */
export class ParticleStage {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private rig = new THREE.Group();
  private points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private carousel = new THREE.Group();
  private frames: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  private textures: THREE.Texture[] = [];
  private shapes: Shape[];
  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;

  private chapter = 0;
  private project = 0;
  private progress = 1;
  private spin = 0;
  private layout: Layout = { x: 0, y: 0, scale: 1 };
  private pointer = new THREE.Vector2(0, 0);
  private pointerActive = 0;
  private raycaster = new THREE.Raycaster();
  private plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  private hit = new THREE.Vector3();
  private carouselAngle = 0;
  private carouselOpacity = 0;

  constructor(
    private mount: HTMLElement,
    private options: StageOptions
  ) {
    const { count } = options;
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x05060f, 1);
    mount.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    this.camera.position.set(0, 0, 9);
    this.scene.add(this.rig);

    const rand = seeded(2026);
    this.shapes = [
      galaxy(count, rand),
      sphere(count, rand), // replaced by the portrait once the photo loads
      helix(count, rand),
      atom(count, rand),
      gallery(count, rand),
      paperPlane(count, rand),
    ];

    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < seeds.length; i++) seeds[i] = rand();

    const geometry = new THREE.BufferGeometry();
    const first = this.shapes[0];
    geometry.setAttribute("position", new THREE.BufferAttribute(first.positions.slice(), 3));
    geometry.setAttribute("aFrom", new THREE.BufferAttribute(first.positions.slice(), 3));
    geometry.setAttribute("aTo", new THREE.BufferAttribute(first.positions.slice(), 3));
    geometry.setAttribute("aColorFrom", new THREE.BufferAttribute(first.colors.slice(), 3));
    geometry.setAttribute("aColorTo", new THREE.BufferAttribute(first.colors.slice(), 3));
    geometry.setAttribute("aRand", new THREE.BufferAttribute(seeds, 4));
    // Positions move in the shader, so the default bounding sphere would cull the cloud wrongly.
    geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 12);

    this.points = new THREE.Points(
      geometry,
      new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uProgress: { value: 1 },
          uChaos: { value: options.reducedMotion ? 0 : 1.5 },
          uSize: { value: 30 },
          uMouse: { value: new THREE.Vector3(99, 99, 0) },
          uMouseStrength: { value: 0 },
          uBurst: { value: 0 },
          uCalm: { value: 0 },
        },
      })
    );
    this.rig.add(this.points);

    this.buildCarousel();
    this.loadPortrait();
    this.resize();
    this.animate();
  }

  // ---- public API -------------------------------------------------------

  setChapter(index: number) {
    if (index === this.chapter) return;
    this.chapter = index;
    this.morphTo(this.shapes[index]);
  }

  setProject(index: number) {
    this.project = index;
  }

  /** Where the sculpture sits, so it never hides behind the text column. */
  setLayout(layout: Layout) {
    this.layout = layout;
  }

  /** Pointer position in normalised device coordinates (-1..1), or null when it leaves. */
  setPointer(x: number | null, y = 0) {
    if (x === null) {
      this.pointerActive = 0;
      return;
    }
    this.pointer.set(x, y);
    this.pointerActive = 1;
  }

  burst() {
    if (!this.options.reducedMotion) this.points.material.uniforms.uBurst.value = 1;
  }

  resize() {
    const width = this.mount.clientWidth || 1;
    const height = this.mount.clientHeight || 1;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    // Point size is in pixels: tie it to the drawing-buffer height so density looks the same everywhere.
    this.points.material.uniforms.uSize.value = this.renderer.domElement.height * 0.034;
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    this.points.geometry.dispose();
    this.points.material.dispose();
    for (const frame of this.frames) {
      frame.geometry.dispose();
      frame.material.dispose();
    }
    this.textures.forEach((t) => t.dispose());
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }

  // ---- internals --------------------------------------------------------

  private morphTo(shape: Shape) {
    const geometry = this.points.geometry;
    const from = geometry.getAttribute("aFrom") as THREE.BufferAttribute;
    const to = geometry.getAttribute("aTo") as THREE.BufferAttribute;
    const colorFrom = geometry.getAttribute("aColorFrom") as THREE.BufferAttribute;
    const colorTo = geometry.getAttribute("aColorTo") as THREE.BufferAttribute;
    // Whatever was the target becomes the start. The component blocks input while a morph runs,
    // so the previous transition has always finished by now.
    (from.array as Float32Array).set(to.array as Float32Array);
    (colorFrom.array as Float32Array).set(colorTo.array as Float32Array);
    (to.array as Float32Array).set(shape.positions);
    (colorTo.array as Float32Array).set(shape.colors);
    from.needsUpdate = to.needsUpdate = colorFrom.needsUpdate = colorTo.needsUpdate = true;
    this.progress = this.options.reducedMotion ? 1 : 0;
  }

  private loadPortrait() {
    const image = new Image();
    image.onload = () => {
      if (this.disposed) return;
      const width = 150;
      const height = Math.round((width * image.naturalHeight) / image.naturalWidth);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(image, 0, 0, width, height);
      const pixels = ctx.getImageData(0, 0, width, height).data;
      this.shapes[1] = portrait(this.options.count, seeded(7), pixels, width, height);
      if (this.chapter === 1) this.morphTo(this.shapes[1]);
    };
    image.src = this.options.photoUrl;
  }

  private buildCarousel() {
    const urls = this.options.projectImages;
    const loader = new THREE.TextureLoader();
    const step = (Math.PI * 2) / Math.max(urls.length, 1);
    const radius = 2.55;
    urls.forEach((url, i) => {
      const texture = loader.load(url);
      texture.colorSpace = THREE.SRGBColorSpace;
      this.textures.push(texture);
      const frame = new THREE.Mesh(
        new THREE.PlaneGeometry(1.7, 0.96),
        new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0 })
      );
      const angle = i * step;
      frame.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
      frame.rotation.y = angle;
      this.carousel.add(frame);
      this.frames.push(frame);
    });
    this.carousel.visible = false;
    this.rig.add(this.carousel);
  }

  private animate = () => {
    if (this.disposed) return;
    this.frameId = requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const uniforms = this.points.material.uniforms;
    const ease = (rate: number) => Math.min(1, dt * rate);

    uniforms.uTime.value += dt;
    if (this.progress < 1) this.progress = Math.min(1, this.progress + dt / 1.7);
    uniforms.uProgress.value = this.progress;
    uniforms.uBurst.value *= Math.pow(0.04, dt);
    uniforms.uCalm.value += ((this.chapter === 1 ? 1 : 0) - uniforms.uCalm.value) * ease(2);

    // Rig follows the layout the UI asked for.
    this.rig.position.x += (this.layout.x - this.rig.position.x) * ease(3);
    this.rig.position.y += (this.layout.y - this.rig.position.y) * ease(3);
    const scale = this.rig.scale.x + (this.layout.scale - this.rig.scale.x) * ease(3);
    this.rig.scale.setScalar(scale);

    // The portrait and the plane face the viewer; everything else slowly turns.
    const spins = this.chapter === 0 || this.chapter === 2 || this.chapter === 3;
    if (spins && !this.options.reducedMotion) {
      this.spin += dt * (this.chapter === 0 ? 0.06 : 0.22);
    } else {
      const nearest = Math.round(this.spin / (Math.PI * 2)) * Math.PI * 2;
      this.spin += (nearest - this.spin) * ease(2.5);
    }
    const sway = this.options.reducedMotion ? 0 : 1;
    this.points.rotation.y = this.spin + this.pointer.x * 0.28 * sway * this.pointerActive;
    this.points.rotation.x = -this.pointer.y * 0.16 * sway * this.pointerActive;

    // Pointer in the particles' local space, on the z = 0 plane.
    this.raycaster.setFromCamera(this.pointer, this.camera);
    if (this.raycaster.ray.intersectPlane(this.plane, this.hit)) {
      this.points.worldToLocal(this.hit);
      (uniforms.uMouse.value as THREE.Vector3).copy(this.hit);
    }
    const strength = this.options.reducedMotion ? 0 : this.pointerActive;
    uniforms.uMouseStrength.value += (strength - uniforms.uMouseStrength.value) * ease(6);

    // Project carousel
    const showing = this.chapter === PROJECTS_CHAPTER && this.progress > 0.45;
    this.carouselOpacity += ((showing ? 1 : 0) - this.carouselOpacity) * ease(showing ? 3 : 8);
    this.carousel.visible = this.carouselOpacity > 0.01;
    if (this.carousel.visible) {
      const step = (Math.PI * 2) / Math.max(this.frames.length, 1);
      let delta = -this.project * step - this.carouselAngle;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta)); // always take the short way round
      this.carouselAngle += delta * ease(5);
      this.carousel.rotation.y = this.carouselAngle;
      this.frames.forEach((frame, i) => {
        const selected = i === this.project;
        frame.material.opacity = this.carouselOpacity * (selected ? 1 : 0.5);
        const target = selected ? 1.18 : 0.92;
        frame.scale.setScalar(frame.scale.x + (target - frame.scale.x) * ease(6));
      });
    }

    this.renderer.render(this.scene, this.camera);
  };
}
