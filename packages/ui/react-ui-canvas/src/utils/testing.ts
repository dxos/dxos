//
// Copyright 2026 DXOS.org
//

import { type Scene, type SceneId } from '../model/types.ts';
import { SceneBuilder } from './builder.ts';
import { portId } from './ports.ts';

export type SceneTree = { scenes: Scene[]; root: SceneId };

//
// A three-level class diagram: the fixture for anything that needs a scene tree to look like a real
// model rather than one of every element type. The domain is invented — a document editor — so it
// stays readable without tracking any package's actual classes.
//

/** The class fixture's unit: a major cell, so every box lands on the grid move and resize snap to. */
const cell = (units: number) => units * 64;

const CLASS_SIZE = { width: cell(4), height: cell(3) };
const PORTAL_SIZE = { width: cell(8), height: cell(5) };

type ClassDef = { key: string; name: string; attributes: string[]; methods: string[] };
type LevelDef = { key: string; title: string; classes: ClassDef[]; children?: LevelDef[] };

/**
 * Each level names a subsystem: the root holds one class per subsystem with a portal beneath it,
 * and drilling in opens that subsystem's own classes. Three levels deep, a handful of classes each.
 */
const MODEL: LevelDef = {
  key: 'app',
  title: 'App',
  classes: [
    { key: 'workspace', name: 'Workspace', attributes: ['id: string'], methods: ['open(doc)'] },
    { key: 'session', name: 'Session', attributes: ['user: string'], methods: ['close()'] },
  ],
  children: [
    {
      key: 'editor',
      title: 'Editor',
      classes: [
        { key: 'view', name: 'View', attributes: ['root: Node'], methods: ['render()'] },
        { key: 'selection', name: 'Selection', attributes: ['anchor: number'], methods: ['collapse()'] },
      ],
      children: [
        {
          key: 'commands',
          title: 'Commands',
          classes: [
            { key: 'command', name: 'Command', attributes: ['label: string'], methods: ['run()'] },
            { key: 'history', name: 'History', attributes: ['depth: number'], methods: ['undo()'] },
          ],
        },
      ],
    },
    {
      key: 'model',
      title: 'Model',
      classes: [
        { key: 'document', name: 'Document', attributes: ['title: string'], methods: ['insert(node)'] },
        { key: 'node', name: 'Node', attributes: ['kind: string'], methods: ['children()'] },
      ],
      children: [
        {
          key: 'schema',
          title: 'Schema',
          classes: [
            { key: 'type', name: 'Type', attributes: ['name: string'], methods: ['validate(node)'] },
            { key: 'field', name: 'Field', attributes: ['optional: boolean'], methods: ['parse(value)'] },
          ],
        },
      ],
    },
  ],
};

/**
 * A three-level class diagram over {@link MODEL}: one scene per subsystem, each holding its classes
 * in a row joined by an association, with a portal per child subsystem below them. Ids are
 * deterministic (`scene:app/editor`, `scene:app/editor/view`) so tests and stories can name elements.
 */
export const createClassSceneTree = (prefix = 'app'): SceneTree => {
  const scenes: Scene[] = [];
  const root = buildLevel(MODEL, prefix, scenes);
  return { scenes, root };
};

const buildLevel = (level: LevelDef, path: string, scenes: Scene[]): SceneId => {
  const id = `scene:${path}`;
  const builder = SceneBuilder.create(id, level.title);

  // Classes sit in a row; each child subsystem gets a portal in the row below, under its own column.
  level.classes.forEach(({ key, name, attributes, methods }, index) => {
    const x = cell(2) + index * cell(6);
    builder.class(`${id}/${key}`, { x, y: cell(2), ...CLASS_SIZE }, name, attributes, methods);
  });
  for (let index = 1; index < level.classes.length; ++index) {
    const from = `${id}/${level.classes[index - 1].key}`;
    const to = `${id}/${level.classes[index].key}`;
    builder.line(`${id}/assoc${index}`, `${from}#${portId('e')}`, `${to}#${portId('w')}`, { directed: true });
  }

  (level.children ?? []).forEach((child, index) => {
    const childId = buildLevel(child, `${path}/${child.key}`, scenes);
    builder.portal(`${id}/${child.key}`, { x: cell(2) + index * cell(10), y: cell(7), ...PORTAL_SIZE }, childId);
  });

  scenes.push(builder.build());
  return id;
};

/**
 * A tree of scenes `depth` levels deep, written with the chainable builder; depth 0 is one empty scene,
 * the blank canvas a new diagram starts from. The root holds a
 * rectangle, an ellipse, a class, a text and one link of each type; above the leaves it also holds
 * two portals whose child scenes alternate between a few simple diagrams (a flow, a class model, a
 * cycle, a note). Ids are deterministic so tests can name elements (`scene:root/a`, `scene:root/left`);
 * every coordinate is a whole number of `scale` steps and each scene is laid out symmetrically about
 * the origin, so the untouched layout is already snapped and already centred.
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
    depth < 1
      ? SceneBuilder.create(id, name)
      : variant === 0
        ? rootScene(id, name, elementId)
        : childScene(id, name, elementId, VARIANTS[variant % VARIANTS.length]);

  if (depth > 1) {
    const left = buildScene(depth - 1, `${name}/L`, scenes, variant * 2 + 1);
    const right = buildScene(depth - 1, `${name}/R`, scenes, variant * 2 + 2);
    // Portals keep one aspect (16:10) so every child gets the same frame shape; 512×320 is the
    // smallest such size on the major grid.
    builder
      .portal(elementId('left'), { x: scale(8), y: scale(-12), ...PORTAL }, left)
      .portal(elementId('right'), { x: scale(8), y: scale(2), ...PORTAL }, right);
  }

  scenes.push(builder.build());
  return id;
};

const rootScene = (id: SceneId, name: string, elementId: (suffix: string) => string) =>
  SceneBuilder.create(id, name)
    .rect(elementId('a'), { x: scale(-22), y: scale(-12), width: scale(8), height: scale(4) }, `${name} · A`)
    .ellipse(elementId('b'), { x: scale(-10), y: scale(-12), width: scale(8), height: scale(4) }, `${name} · B`)
    .text(
      elementId('t'),
      { x: scale(-10), y: scale(8), width: scale(12), height: scale(4) },
      `Scene "${name}". Pinch to zoom, drag to pan, double-click a portal.`,
    )
    .class(
      elementId('c'),
      { x: scale(-22), y: scale(6), width: scale(8), height: scale(6) },
      `${name} · C`,
      ['id: string', 'name: string'],
      ['save(): void'],
    )
    .curve(elementId('ab'), elementId('a'), elementId('b'))
    .line(elementId('ac'), elementId('a'), elementId('c'), { directed: true })
    // Pinned ports rather than automatic ones, so the spline leaves and arrives where its corners turn.
    .spline(elementId('bc'), `${elementId('b')}#${portId('s')}`, `${elementId('c')}#${portId('n', 3)}`, [
      { x: scale(-6), y: scale(-2) },
      { x: scale(-16), y: scale(-2) },
    ]);

const childScene = (id: SceneId, name: string, elementId: (suffix: string) => string, variant: Variant) => {
  const builder = SceneBuilder.create(id, `${name} (${variant})`);
  switch (variant) {
    case 'flow':
      return builder
        .rect(elementId('start'), { x: scale(-18), y: scale(-2), width: scale(8), height: scale(4) }, 'Start')
        .rect(elementId('work'), { x: scale(-4), y: scale(-2), width: scale(8), height: scale(4) }, 'Work')
        .ellipse(elementId('done'), { x: scale(10), y: scale(-2), width: scale(8), height: scale(4) }, 'Done')
        .line(elementId('l1'), `${elementId('start')}#e2`, `${elementId('work')}#w2`, { directed: true })
        .line(elementId('l2'), `${elementId('work')}#e2`, `${elementId('done')}#w2`, { directed: true });
    case 'model':
      return builder
        .class(
          elementId('person'),
          { x: scale(-20), y: scale(-4), width: scale(8), height: scale(8) },
          'Person',
          ['name: string'],
          ['greet()'],
        )
        .class(
          elementId('org'),
          { x: scale(-4), y: scale(-4), width: scale(8), height: scale(8) },
          'Organization',
          ['title: string'],
          ['hire(person)'],
        )
        .curve(elementId('works'), `${elementId('person')}#e2`, `${elementId('org')}#w2`);
    case 'cycle':
      return (
        builder
          .ellipse(elementId('n1'), { x: scale(-2), y: scale(-4), width: scale(4), height: scale(4) }, '1')
          .ellipse(elementId('n2'), { x: scale(8), y: scale(2), width: scale(4), height: scale(4) }, '2')
          .ellipse(elementId('n3'), { x: scale(-14), y: scale(2), width: scale(4), height: scale(4) }, '3')
          // Routed rather than drawn: the ring is the one arrangement where a stored control point has to be
          // re-placed every time a node moves.
          .smart(elementId('e12'), elementId('n1'), elementId('n2'))
          .smart(elementId('e23'), elementId('n2'), elementId('n3'))
          .smart(elementId('e31'), elementId('n3'), elementId('n1'))
      );
    case 'note':
      return builder
        .text(
          elementId('note'),
          { x: scale(-14), y: scale(-4), width: scale(16), height: scale(8) },
          `A note in "${name}". Portals below.`,
        )
        .rect(elementId('box'), { x: scale(6), y: scale(-4), width: scale(8), height: scale(8) }, 'Box')
        .curve(elementId('nb'), elementId('note'), elementId('box'));
  }
};
