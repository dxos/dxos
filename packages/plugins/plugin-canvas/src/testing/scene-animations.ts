//
// Copyright 2026 DXOS.org
//

import { Dsl } from '@dxos/diagram';
import { type ExemplarName, EXEMPLARS } from '@dxos/diagram/testing';
import { Obj, Ref } from '@dxos/echo';
import * as Animation from '@dxos/plugin-animator/Animation';
import { toEcho } from '@dxos/scene';

const DURATION = 5;

/** A short script per exemplar: 2D shapes move and fade under a zoom; 3D scenes turn and rearrange under the camera. */
const SCRIPTS: Record<ExemplarName, Animation.Beat[]> = {
  square: [
    { duration: 1.5, ease: 'ease-in-out', set: { a: { rotation: 45, size: { width: 220, height: 220 } } } },
    { at: 2.5, duration: 1.5, ease: 'ease-in-out', set: { a: { rotation: 0, size: { width: 160, height: 160 } } } },
  ],
  links: [
    { duration: 1.5, ease: 'ease-in-out', set: { a: { center: { x: 0, y: -80 } } }, camera: { zoom: 1.4 } },
    { duration: 1.5, ease: 'ease-in-out', set: { c: { 'style.opacity': 0.2 } } },
    {
      duration: 1.5,
      ease: 'ease-in-out',
      set: { a: { center: { x: 0, y: 0 } }, c: { 'style.opacity': 1 } },
      camera: { zoom: 1 },
    },
  ],
  subscene: [
    { duration: 2, ease: 'ease-in-out', set: { b: { size: { width: 280, height: 196 } } }, camera: { zoom: 1.3 } },
    { at: 3, duration: 2, ease: 'ease-in-out', set: { b: { size: { width: 200, height: 140 } } }, camera: { zoom: 1 } },
  ],
  cube: [
    { duration: 2.5, ease: 'ease-in-out', set: { box: { rotation: { x: 0, y: 45, z: 0 } } }, camera: { yaw: 0 } },
    { duration: 2.5, ease: 'ease-in-out', camera: { yaw: -45, pitch: 50 } },
  ],
  cluster: [
    {
      duration: 2,
      ease: 'ease-in-out',
      layout: { kind: 'ring', targets: ['s1', 's2', 's3', 's4'], params: { radius: 5 } },
    },
    { duration: 3, ease: 'ease-in-out', camera: { yaw: 45, distance: 16 } },
  ],
  encapsulated: [
    { duration: 2.5, ease: 'ease-in-out', set: { client: { position: { x: -9, y: 2, z: 0 } } }, camera: { yaw: 0 } },
    { duration: 2.5, ease: 'ease-in-out', camera: { yaw: -60, pitch: 45 } },
  ],
  hierarchy: [{ duration: 5, ease: 'ease-in-out', camera: { yaw: 45, pitch: 50 } }],
  solid: [{ duration: 5, ease: 'ease-in-out', camera: { yaw: 135, pitch: 40 } }],
};

/** One shot over an exemplar scene stored as ECHO objects, scripted by `SCRIPTS`. */
export const makeExemplarAnimation = (name: ExemplarName): Animation.Animation => {
  const { root } = toEcho(Dsl.readScenes(EXEMPLARS[name]).document);
  const shot: Animation.Shot = { ...Animation.makeShot(Ref.make(root), DURATION), script: SCRIPTS[name] };
  return Obj.make(Animation.Animation, { name, fps: 30, shots: [shot] });
};
