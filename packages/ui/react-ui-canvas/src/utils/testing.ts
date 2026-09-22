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
 * every coordinate is a whole number of `scale` steps, so the untouched layout is already snapped.
 */
export const createSceneTree = (depth: number, prefix = 'root'): SceneTree => {
  const scenes: Scene[] = [];
  const root = buildScene(depth, prefix, scenes, 0);
  return { scenes, root };
};

/** The fixture's unit: every point and size is written as a count of these, never as raw pixels. */
const scale = (units: number) => units * 32;

const PORTAL = { width: scale(16), height: scale(10) };

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
      .portal(elementId('left'), { x: scale(30), y: scale(4), ...PORTAL }, left)
      .portal(elementId('right'), { x: scale(30), y: scale(20), ...PORTAL }, right);
  }

  scenes.push(builder.build());
  return id;
};

const rootScene = (id: SceneId, name: string, elementId: (suffix: string) => string) =>
  SceneBuilder.create(id, name)
    .rect(elementId('a'), { x: scale(4), y: scale(4), width: scale(8), height: scale(4) }, `${name} · A`)
    .ellipse(elementId('b'), { x: scale(16), y: scale(4), width: scale(8), height: scale(4) }, `${name} · B`)
    .text(
      elementId('t'),
      { x: scale(34), y: scale(4), width: scale(12), height: scale(4) },
      `Scene "${name}". Pinch to zoom, drag to pan, double-click a portal.`,
    )
    .class(
      elementId('c'),
      { x: scale(4), y: scale(22), width: scale(8), height: scale(6) },
      `${name} · C`,
      ['id: string', 'name: string'],
      ['save(): void'],
    )
    .curve(elementId('ab'), elementId('a'), elementId('b'))
    .line(elementId('ac'), elementId('a'), elementId('c'), { directed: true })
    .spline(elementId('bc'), elementId('b'), elementId('c'), [
      { x: scale(20), y: scale(12) },
      { x: scale(10), y: scale(12) },
    ]);

const childScene = (id: SceneId, name: string, elementId: (suffix: string) => string, variant: Variant) => {
  const builder = SceneBuilder.create(id, `${name} (${variant})`);
  switch (variant) {
    case 'flow':
      return builder
        .rect(elementId('start'), { x: scale(4), y: scale(6), width: scale(8), height: scale(4) }, 'Start')
        .rect(elementId('work'), { x: scale(18), y: scale(6), width: scale(8), height: scale(4) }, 'Work')
        .ellipse(elementId('done'), { x: scale(32), y: scale(6), width: scale(8), height: scale(4) }, 'Done')
        .line(elementId('l1'), `${elementId('start')}#e2`, `${elementId('work')}#w2`, { directed: true })
        .line(elementId('l2'), `${elementId('work')}#e2`, `${elementId('done')}#w2`, { directed: true });
    case 'model':
      return builder
        .class(
          elementId('person'),
          { x: scale(4), y: scale(4), width: scale(8), height: scale(6) },
          'Person',
          ['name: string'],
          ['greet()'],
        )
        .class(
          elementId('org'),
          { x: scale(22), y: scale(4), width: scale(8), height: scale(6) },
          'Organization',
          ['title: string'],
          ['hire(person)'],
        )
        .curve(elementId('works'), `${elementId('person')}#e2`, `${elementId('org')}#w2`);
    case 'cycle':
      return builder
        .ellipse(elementId('n1'), { x: scale(14), y: scale(2), width: scale(6), height: scale(4) }, '1')
        .ellipse(elementId('n2'), { x: scale(26), y: scale(10), width: scale(6), height: scale(4) }, '2')
        .ellipse(elementId('n3'), { x: scale(2), y: scale(10), width: scale(6), height: scale(4) }, '3')
        .spline(elementId('e12'), elementId('n1'), elementId('n2'), [{ x: scale(26), y: scale(4) }])
        .spline(elementId('e23'), elementId('n2'), elementId('n3'), [{ x: scale(17), y: scale(18) }])
        .spline(elementId('e31'), elementId('n3'), elementId('n1'), [{ x: scale(8), y: scale(4) }]);
    case 'note':
      return builder
        .text(
          elementId('note'),
          { x: scale(6), y: scale(4), width: scale(16), height: scale(6) },
          `A note in "${name}". Portals below.`,
        )
        .rect(elementId('box'), { x: scale(26), y: scale(4), width: scale(8), height: scale(6) }, 'Box')
        .curve(elementId('nb'), elementId('note'), elementId('box'));
  }
};
