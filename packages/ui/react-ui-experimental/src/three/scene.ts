//
// Copyright 2026 DXOS.org
//

import { type RefObject, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/** What a scene builder draws into, and the renderer for any pass of its own (e.g. a simulation into a texture). */
export type SceneContext = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
};

/** A built scene, advanced once per frame before it is rendered. */
export type SceneInstance = {
  update(delta: number): void;
  dispose(): void;
};

export type UseSceneOptions = {
  /** Transparent, so the page shows behind the scene; otherwise it clears to black. */
  alpha?: boolean;
  fov?: number;
  /** Camera distance from the origin, on the z axis. */
  distance?: number;
  /** Frames are skipped while false, freezing the scene. */
  active?: boolean;
};

/** Seconds a frame may claim at most, so a stalled tab does not jump the animation. */
const MAX_DELTA = 0.1;

/**
 * Mounts a three.js renderer in the returned ref's element, sized to it, and runs `create`'s scene every animation
 * frame. The scene is rebuilt only when `deps` change; read changing props from refs inside `update`.
 */
export const useScene = <T extends HTMLElement>(
  create: (context: SceneContext) => SceneInstance,
  deps: unknown[],
  { alpha = false, fov = 35, distance = 6, active = true }: UseSceneOptions = {},
): { ref: RefObject<T | null>; ready: boolean } => {
  const ref = useRef<T>(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mount = ref.current;
    if (!mount) {
      return;
    }

    const renderer = new THREE.WebGLRenderer({ alpha, antialias: !alpha });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.domElement.className = 'absolute inset-0 w-full h-full';
    mount.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(fov, 1, 0.01, 100);
    camera.position.set(0, 0, distance);
    const instance = create({ scene, camera, renderer });

    const resize = () => {
      const { clientWidth: width, clientHeight: height } = mount;
      if (width > 0 && height > 0) {
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    let last = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const delta = Math.min(MAX_DELTA, (now - last) / 1_000);
      last = now;
      if (activeRef.current) {
        instance.update(delta);
        renderer.render(scene, camera);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    setReady(true);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      instance.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, deps);

  return { ref, ready };
};
