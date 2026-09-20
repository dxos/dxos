//
// Copyright 2026 DXOS.org
//

import { type Scene, type SceneId } from '../model/types.ts';
import { SceneBuilder } from './builder.ts';

export type SceneTree = { scenes: Scene[]; root: SceneId };

/**
 * A tree of scenes `depth` levels deep, written with the chainable builder. The root holds a
 * rectangle, an ellipse, a class, a text and one link of each type; above the leaves it also holds
 * two portals whose child scenes alternate between a few simple diagrams (a flow, a class model, a
 * cycle, a note). Ids are deterministic so tests can name elements (`scene:root/a`, `scene:root/left`);
 * every edge lies on the major grid so the untouched layout is already snapped.
 */
export const createSceneTree = (depth: number, prefix = 'root'): SceneTree => {
  const scenes: Scene[] = [];
  const root = buildScene(depth, prefix, scenes, 0);
  return { scenes, root };
};

const PORTAL = { width: 512, height: 320 };

/** Child scene variants, chosen by nesting level and side so siblings differ. */
const VARIANTS = ['flow', 'model', 'cycle', 'note'] as const;
type Variant = (typeof VARIANTS)[number];

const buildScene = (depth: number, name: string, scenes: Scene[], variant: number): SceneId => {
  const id = `scene:${name}`;
  const elementId = (suffix: string) => `${id}/${suffix}`;
  const builder =
    variant === 0
      ? rootScene(id, name, elementId)
      : childScene(id, name, elementId, VARIANTS[variant % VARIANTS.length]);

  if (depth > 1) {
    const left = buildScene(depth - 1, `${name}/L`, scenes, variant * 2 + 1);
    const right = buildScene(depth - 1, `${name}/R`, scenes, variant * 2 + 2);
    // Portals keep one aspect (16:10) so every child gets the same frame shape; 512×320 is the
    // smallest such size on the major grid.
    builder
      .portal(elementId('left'), { x: 448, y: 448, ...PORTAL }, left)
      .portal(elementId('right'), { x: 1088, y: 448, ...PORTAL }, right);
  }

  scenes.push(builder.build());
  return id;
};

const rootScene = (id: SceneId, name: string, elementId: (suffix: string) => string) =>
  SceneBuilder.create(id, name)
    .rect(elementId('a'), { x: 128, y: 128, width: 256, height: 128 }, `${name} · A`)
    .ellipse(elementId('b'), { x: 576, y: 128, width: 256, height: 128 }, `${name} · B`)
    .text(
      elementId('t'),
      { x: 1088, y: 128, width: 384, height: 128 },
      `Scene "${name}". Pinch to zoom, drag to pan, double-click a portal.`,
    )
    .class(
      elementId('c'),
      { x: 128, y: 704, width: 256, height: 192 },
      `${name} · C`,
      ['id: string', 'name: string'],
      ['save(): void'],
    )
    .curve(elementId('ab'), elementId('a'), elementId('b'))
    .line(elementId('ac'), elementId('a'), elementId('c'))
    .spline(elementId('bc'), elementId('b'), elementId('c'), [{ x: 640, y: 512 }]);

const childScene = (id: SceneId, name: string, elementId: (suffix: string) => string, variant: Variant) => {
  const builder = SceneBuilder.create(id, `${name} (${variant})`);
  switch (variant) {
    case 'flow':
      return builder
        .rect(elementId('start'), { x: 128, y: 192, width: 256, height: 128 }, 'Start')
        .rect(elementId('work'), { x: 576, y: 192, width: 256, height: 128 }, 'Work')
        .ellipse(elementId('done'), { x: 1024, y: 192, width: 256, height: 128 }, 'Done')
        .line(elementId('l1'), `${elementId('start')}#e2`, `${elementId('work')}#w2`)
        .line(elementId('l2'), `${elementId('work')}#e2`, `${elementId('done')}#w2`);
    case 'model':
      return builder
        .class(
          elementId('person'),
          { x: 128, y: 128, width: 256, height: 192 },
          'Person',
          ['name: string'],
          ['greet()'],
        )
        .class(
          elementId('org'),
          { x: 704, y: 128, width: 256, height: 192 },
          'Organization',
          ['title: string'],
          ['hire(person)'],
        )
        .curve(elementId('works'), `${elementId('person')}#e2`, `${elementId('org')}#w2`);
    case 'cycle':
      return builder
        .ellipse(elementId('n1'), { x: 448, y: 64, width: 192, height: 128 }, '1')
        .ellipse(elementId('n2'), { x: 832, y: 320, width: 192, height: 128 }, '2')
        .ellipse(elementId('n3'), { x: 64, y: 320, width: 192, height: 128 }, '3')
        .spline(elementId('e12'), elementId('n1'), elementId('n2'), [{ x: 832, y: 128 }])
        .spline(elementId('e23'), elementId('n2'), elementId('n3'), [{ x: 544, y: 576 }])
        .spline(elementId('e31'), elementId('n3'), elementId('n1'), [{ x: 256, y: 128 }]);
    case 'note':
      return builder
        .text(elementId('note'), { x: 192, y: 128, width: 512, height: 192 }, `A note in "${name}". Portals below.`)
        .rect(elementId('box'), { x: 832, y: 128, width: 256, height: 192 }, 'Box')
        .curve(elementId('nb'), elementId('note'), elementId('box'));
  }
};
