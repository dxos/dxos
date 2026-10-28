//
// Copyright 2026 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';
import * as Animation from '@dxos/plugin-animator/Animation';
import { makeBuiltinEffect } from '@dxos/plugin-animator/testing';

import { Model, Scene } from '#types';

import { labelMorphBeats } from '../animator/index.ts';

const PLANETS: [string, string][] = [
  ['Ada', '#5b8def'],
  ['Bo', '#2fbf71'],
  ['Cy', '#e57bd1'],
  ['Di', '#f2c230'],
  ['Ed', '#ff8a3d'],
];

/**
 * A small scene and a two-shot Animation over it that exercises the spacetime stage: every layout (ring, orbit, grid,
 * containment), a camera move, label styles and a label morph, then packet flow, a burst and conversations.
 */
export const makeDemoAnimation = (style: Scene.Style = 'cad') => {
  const hub = Model.make({
    primitive: 'sphere',
    label: 'Hub',
    labelStyle: 'hero',
    color: '#a07cf0',
    opacity: 0.3,
    scale: { x: 8, y: 8, z: 8 },
  });
  const planets = PLANETS.map(([label, color], index) =>
    Model.make({
      primitive: index % 2 === 0 ? 'sphere' : 'cube',
      label,
      color,
      position: { x: (index - 2) * 2.5, y: 0, z: -8 },
      scale: { x: 1.2, y: 1.2, z: 1.2 },
    }),
  );
  const scene = Obj.make(Scene.Scene, {
    name: 'Demo',
    style,
    objects: [hub, ...planets].map((object) => Ref.make(object)),
    links: planets.map((planet) => ({ id: `hub-${planet.id}`, from: hub.id, to: planet.id, opacity: 0.5 })),
  });
  const ids = planets.map((planet) => planet.id);
  const top = { alpha: -Math.PI / 2, beta: 0.6, radius: 30, target: { x: 0, y: 0, z: 0 } };

  const layouts: Animation.Shot = {
    ...Animation.makeShot(Ref.make(scene), 12),
    script: [
      { at: 0, duration: 0.01, camera: top },
      { at: 0.2, duration: 1, ease: 'ease-out', show: [hub.id, ...ids], caption: 'Layouts' },
      { at: 1.5, duration: 1.5, ease: 'ease-in-out', layout: { kind: 'ring', targets: ids, params: { radius: 9 } } },
      {
        at: 3.5,
        duration: 1.5,
        ease: 'ease-in-out',
        layout: { kind: 'orbit', targets: ids, params: { centre: hub.id, gap: 1.5, tilt: 0.5 } },
        camera: { beta: 1.1, radius: 24 },
      },
      {
        at: 5.5,
        duration: 1.5,
        ease: 'ease-in-out',
        layout: { kind: 'grid', targets: ids, params: { spacing: 3, centre: { x: 0, y: 0, z: -9 } } },
        set: { [hub.id]: { labelStyle: 'title' } },
      },
      {
        at: 7.5,
        duration: 1.5,
        ease: 'ease-in-out',
        layout: { kind: 'containment', targets: ids, params: { container: hub.id } },
        set: { [hub.id]: { labelStyle: 'inside' } },
        camera: top,
      },
      ...labelMorphBeats({ target: hub.id, from: 'Hub', to: 'The Central Hub', at: 9.5, duration: 2 }),
    ],
  };
  const flow = makeBuiltinEffect('Packet flow (3D)');
  const burst = makeBuiltinEffect('Burst (3D)');
  const conversations = makeBuiltinEffect('Conversations');
  const effects: Animation.Shot = {
    ...Animation.makeShot(Ref.make(scene), 8),
    transition: { kind: 'fade', duration: 0.5 },
    effects: [
      { id: 'flow', effect: Ref.make(flow), params: { count: 6, speed: 0.6, both: true, alert: 0.1 }, seed: 1 },
    ],
    script: [
      { at: 0, duration: 0.01, camera: top, layout: { kind: 'ring', targets: ids, params: { radius: 9 } } },
      {
        at: 1,
        duration: 0.1,
        effects: { add: [{ id: 'chat', effect: Ref.make(conversations), params: { rate: 1.2, max: 2 }, seed: 2 }] },
      },
      {
        at: 4,
        duration: 0.1,
        effects: {
          add: [{ id: 'burst', effect: Ref.make(burst), params: { objects: [ids[4]], duration: 1 }, seed: 3 }],
        },
      },
      { at: 4, duration: 0.6, ease: 'ease-in', hide: [ids[4]] },
    ],
  };
  const animation = Obj.make(Animation.Animation, { name: 'Spacetime demo', fps: 30, shots: [layouts, effects] });
  return { animation, scene, effects: [flow, burst, conversations] };
};
