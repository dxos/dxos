//
// Copyright 2020 DXOS.org
//

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DecoratedTorusKnot5a } from 'three/addons/curves/CurveExtras.js';
import GUI from 'three/addons/libs/lil-gui.module.min.js';
import Stats from 'three/addons/libs/stats.module.js';
import { type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// Bundled asset URL (handled by Vite via `vite/client` ambient types).
import camouflageUrl from '../../../assets/camouflage.png';

export type Options = {
  gui?: boolean;
  color: number;
  radius: number;
  threshold: number;
  strength: number;
  exposure: number;
};

export const presets: Record<string, Options> = {
  red: {
    color: 0xff2222,
    radius: 1,
    threshold: 0.3,
    strength: 0.4,
    exposure: 0.35,
  },
  purple: {
    color: 0x442266,
    radius: 0,
    threshold: 0.12,
    strength: 0.5,
    exposure: 0.5,
  },
  copper: {
    color: 0x995522,
    radius: 0.7,
    threshold: 0.6,
    strength: 0.3,
    exposure: 0.4,
  },
};

export const defaultOptions: Options = presets.red;

export type KnotHandle = {
  updateOptions: (options: Partial<Options>) => void;
  dispose: () => void;
};

type AnimationCallback = (delta: number) => void;

class Animator {
  readonly #clock = new THREE.Clock();
  readonly #container: HTMLElement;
  readonly #renderer: THREE.WebGLRenderer;
  readonly #camera: THREE.PerspectiveCamera;
  readonly #scene: THREE.Scene;
  readonly #composer: EffectComposer;
  readonly #bloomPass: UnrealBloomPass;
  readonly #controls?: OrbitControls;
  readonly #stats?: Stats;
  readonly #gui?: GUI;
  readonly #onResize: () => void;

  #mixer?: THREE.AnimationMixer;
  #callback?: AnimationCallback;
  #running = false;
  #rafId: number | null = null;

  constructor(container: HTMLElement, options: Options) {
    this.#container = container;

    if (options.gui) {
      this.#stats = new Stats();
      container.appendChild(this.#stats.dom);
    }

    // Size against the container so the initial frame matches the mount surface
    // (falling back to the window if the container hasn't been laid out yet).
    const initialWidth = container.clientWidth || window.innerWidth;
    const initialHeight = container.clientHeight || window.innerHeight;

    // Renderer.
    this.#renderer = new THREE.WebGLRenderer({ antialias: true });
    this.#renderer.setPixelRatio(window.devicePixelRatio);
    this.#renderer.setSize(initialWidth, initialHeight);
    this.#renderer.toneMapping = THREE.ReinhardToneMapping;
    this.#renderer.toneMappingExposure = Math.pow(options.exposure, 4.0);
    container.appendChild(this.#renderer.domElement);

    // Camera.
    this.#camera = new THREE.PerspectiveCamera(40, initialWidth / initialHeight, 1, 200);
    this.#camera.position.set(0, 0, 40);
    this.#camera.rotation.set(0, 40, 0);

    // Scene.
    this.#scene = new THREE.Scene();
    this.#scene.add(this.#camera);
    this.#scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    this.#scene.add(new THREE.HemisphereLight(0xffffff, 0x000000, 50));
    this.#scene.fog = new THREE.Fog(0x000000, 80, 110);

    // Post-processing.
    this.#composer = new EffectComposer(this.#renderer);
    this.#composer.addPass(new RenderPass(this.#scene, this.#camera));
    this.#bloomPass = new UnrealBloomPass(new THREE.Vector2(initialWidth, initialHeight), 1.5, 0.4, 0.85);
    this.#bloomPass.threshold = options.threshold;
    this.#bloomPass.strength = options.strength;
    this.#bloomPass.radius = options.radius;
    this.#composer.addPass(this.#bloomPass);
    this.#composer.addPass(new OutputPass());

    if (options.gui) {
      this.#gui = new GUI();
      this.#gui
        .add(options, 'radius', 0.0, 1.0)
        .step(0.01)
        .onChange((value: number) => {
          this.#bloomPass.radius = Number(value);
        });
      const bloomFolder = this.#gui.addFolder('bloom');
      bloomFolder.add(options, 'threshold', 0.0, 1.0).onChange((value: number) => {
        this.#bloomPass.threshold = Number(value);
      });
      bloomFolder.add(options, 'strength', 0.0, 3.0).onChange((value: number) => {
        this.#bloomPass.strength = Number(value);
      });
      const toneMappingFolder = this.#gui.addFolder('tone mapping');
      toneMappingFolder.add(options, 'exposure', 0.1, 2).onChange((value: number) => {
        this.#renderer.toneMappingExposure = Math.pow(value, 4.0);
      });

      this.#controls = new OrbitControls(this.#camera, this.#renderer.domElement);
      this.#controls.minDistance = 3;
      this.#controls.maxDistance = 100;
    }

    this.#onResize = () => this.#handleResize();
    window.addEventListener('resize', this.#onResize);
    this.#handleResize();
  }

  addObject(object: THREE.Object3D, callback?: AnimationCallback) {
    this.#callback = callback;
    this.#scene.add(object);
    this.#camera.lookAt(object.position);
  }

  addModel(gltf: GLTF, position: [number, number, number] = [0, 0, 0]) {
    const model = gltf.scene;
    model.position.set(position[0], position[1], position[2]);
    this.#scene.add(model);
    this.#mixer = new THREE.AnimationMixer(model);
    const clip = gltf.animations[0];
    if (clip) {
      this.#mixer.clipAction(clip.optimize()).play();
    }
  }

  updateOptions(options: Partial<Options>) {
    if (options.radius !== undefined) {
      this.#bloomPass.radius = options.radius;
    }
    if (options.threshold !== undefined) {
      this.#bloomPass.threshold = options.threshold;
    }
    if (options.strength !== undefined) {
      this.#bloomPass.strength = options.strength;
    }
    if (options.exposure !== undefined) {
      this.#renderer.toneMappingExposure = Math.pow(options.exposure, 4.0);
    }
  }

  start() {
    this.#running = true;
    const tick = () => {
      if (!this.#running) {
        return;
      }
      const delta = this.#clock.getDelta();
      this.#callback?.(delta);
      this.#mixer?.update(delta);
      this.#composer.render();
      this.#stats?.update();
      this.#rafId = requestAnimationFrame(tick);
    };

    tick();
  }

  dispose() {
    this.#running = false;
    if (this.#rafId !== null) {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
    }
    window.removeEventListener('resize', this.#onResize);
    this.#controls?.dispose();
    this.#gui?.destroy();
    this.#stats?.dom.remove();
    this.#renderer.domElement.remove();
    this.#renderer.dispose();
    this.#composer.dispose();
  }

  #handleResize() {
    const width = this.#container.clientWidth || window.innerWidth;
    const height = this.#container.clientHeight || window.innerHeight;

    this.#camera.aspect = width / height;
    this.#camera.updateProjectionMatrix();

    this.#renderer.setSize(width, height);
    this.#composer.setSize(width, height);
  }
}

/**
 * Mount a torus-knot scene into the given container and start the render loop.
 * Returns a handle that streams `Options` patches to the running animator and
 * tears the scene down via `dispose()`.
 */
export const render = (container: HTMLElement, options: Partial<Options> = {}): KnotHandle => {
  const merged: Options = { ...defaultOptions, ...options };
  const animator = new Animator(container, merged);

  // Build extruded shape that's swept along a decorated torus-knot curve.
  const segment = new THREE.Shape();
  const n = 3; // Higher numbers create ridges.
  for (let i = 0; i < n; i++) {
    const r = i % 2 < 1 ? 1.75 : 0.6;
    const angle = (i * Math.PI * 2) / n;
    const x = r * Math.cos(angle) * r;
    const y = r * Math.sin(angle) * r;
    if (i === 0) {
      segment.moveTo(x, y);
    } else {
      segment.lineTo(x, y);
    }
  }

  const texture = new THREE.TextureLoader().load(camouflageUrl);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(0.1, 0.1);
  const material = new THREE.MeshPhysicalMaterial({
    color: merged.color,
    metalness: -1,
    map: texture,
  });

  const geometry = new THREE.ExtrudeGeometry(segment, {
    extrudePath: new DecoratedTorusKnot5a(5.5),
    steps: 100,
  });

  const object = new THREE.Mesh(geometry, material);
  object.scale.set(3, 3, 3);
  object.position.set(0, 0, -67);
  let offset = 0;
  animator.addObject(object, () => {
    texture.offset.set(offset, 0);
    object.rotateZ(0.001);
    offset -= 0.0005;
  });

  animator.start();

  return {
    updateOptions: (options) => {
      animator.updateOptions(options);
      if (options.color !== undefined) {
        material.color.setHex(options.color);
      }
    },
    dispose: () => {
      animator.dispose();
      geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
};
