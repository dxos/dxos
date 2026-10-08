//
// Copyright 2026 DXOS.org
//

import { type Box, type BuilderElement, SceneBuilder, type SceneElement, type SceneTree } from './builder.ts';
import { portId } from './ports.ts';
import { DEFAULT_SIZES } from './shapes.ts';

//
// A three-level model diagram, one box per class: the fixture for anything that needs a scene tree to look
// like a real model rather than one of every element type. The domain is invented — a document editor —
// so it stays readable without tracking any package's actual classes. (The UML class shape itself is
// plugin-uml's; the engine fixture draws each class as a labelled rectangle.)
//

/** The class fixture's unit: a major cell, so every box lands on the grid move and resize snap to. */
const cell = (units: number) => units * 64;

const CLASS_SIZE = { width: cell(4), height: cell(3) };
const PORTAL_SIZE = DEFAULT_SIZES.scene;

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
 * A three-level model diagram over {@link MODEL}: one scene per subsystem, each holding a box per class
 * in a row joined by an association, with a portal per child subsystem below them. Ids are
 * deterministic (`scene:app/editor`, `scene:app/editor/view`) so tests and stories can name elements.
 */
export const createModelSceneTree = (prefix = 'app'): SceneTree => classLevel(MODEL, prefix).build();

const classLevel = (level: LevelDef, path: string): SceneElement => {
  const id = `scene:${path}`;
  // Classes sit in a row; each child subsystem gets a portal in the row below, under its own column.
  const classes = level.classes.map(({ key, name }, index) =>
    SceneBuilder.rect(`${id}/${key}`, { x: cell(2) + index * cell(6), y: cell(2), ...CLASS_SIZE }).properties({
      label: name,
    }),
  );
  const associations = level.classes.slice(1).map((current, index) =>
    SceneBuilder.link('line', `${id}/${level.classes[index].key}#${portId('e')}`, `${id}/${current.key}#${portId('w')}`)
      .id(`${id}/assoc${index + 1}`)
      .properties({ ends: { end: 'arrow' } }),
  );
  const children = (level.children ?? []).map((child, index) =>
    classLevel(child, `${path}/${child.key}`).at({ x: cell(2) + index * cell(10), y: cell(7), ...PORTAL_SIZE }),
  );
  return SceneBuilder.scene(id, [...classes, ...associations, ...children]).name(level.title);
};

/**
 * A tree of scenes `depth` levels deep, written with the scene builder; depth 0 is one empty scene,
 * the blank canvas a new diagram starts from. The root holds a
 * rectangle, an ellipse, a class, a text and one link of each type; above the leaves it also holds
 * two portals whose child scenes alternate between a few simple diagrams (a flow, a class model, a
 * cycle, a note). Ids are deterministic so tests can name elements (`scene:root/a`; a portal shares its child scene's id, `scene:root/L`);
 * every coordinate is a whole number of `scale` steps and each scene is laid out symmetrically about
 * the origin, so the untouched layout is already snapped and already centred.
 */
export const createSceneTree = (depth: number, prefix = 'root'): SceneTree => treeScene(depth, prefix, 0).build();

/** The fixture's unit: every point and size is written as a count of these, never as raw pixels. */
const scale = (units: number) => units * 32;

const PORTAL = DEFAULT_SIZES.scene;

/** Child scene variants, chosen by nesting level and side so siblings differ. */
const VARIANTS = ['flow', 'model', 'cycle', 'note'] as const;
type Variant = (typeof VARIANTS)[number];

/** A box in fixture units. */
const units = (x: number, y: number, width: number, height: number): Box => ({
  x: scale(x),
  y: scale(y),
  width: scale(width),
  height: scale(height),
});

/** The scene `name` at `depth`; above the leaves it holds two portals, each the scene shape of a child. */
const treeScene = (depth: number, name: string, variant: number, frame?: Box): SceneElement => {
  const id = `scene:${name}`;
  const elementId = (suffix: string) => `${id}/${suffix}`;
  const elements =
    depth < 1
      ? []
      : variant === 0
        ? rootElements(name, elementId)
        : childElements(name, elementId, VARIANTS[variant % VARIANTS.length]);
  // Portals take the scene type's default frame, so every child gets the same frame shape.
  const portals =
    depth > 1
      ? [
          treeScene(depth - 1, `${name}/L`, variant * 2 + 1, { x: scale(8), y: scale(-12), ...PORTAL }),
          treeScene(depth - 1, `${name}/R`, variant * 2 + 2, { x: scale(8), y: scale(2), ...PORTAL }),
        ]
      : [];
  const scene = SceneBuilder.scene(id, [...elements, ...portals]).name(
    variant === 0 || depth < 1 ? name : `${name} (${VARIANTS[variant % VARIANTS.length]})`,
  );
  return frame ? scene.at(frame) : scene;
};

const labelled = (factory: typeof SceneBuilder.rect, id: string, box: Box, label: string) =>
  factory(id, box).properties({ label });

const rootElements = (name: string, elementId: (suffix: string) => string): BuilderElement[] => [
  labelled(SceneBuilder.rect, elementId('a'), units(-22, -12, 8, 4), `${name} · A`),
  labelled(SceneBuilder.ellipse, elementId('b'), units(-10, -12, 8, 4), `${name} · B`),
  SceneBuilder.note(elementId('t'), units(-10, 8, 12, 4)).properties({
    text: `Scene "${name}". Pinch to zoom, drag to pan, double-click a portal.`,
  }),
  labelled(SceneBuilder.rect, elementId('c'), units(-22, 6, 8, 6), `${name} · C`),
  SceneBuilder.link('curve', elementId('a'), elementId('b')).id(elementId('ab')),
  SceneBuilder.link('line', elementId('a'), elementId('c'))
    .id(elementId('ac'))
    .properties({ ends: { end: 'arrow' } }),
  // Pinned ports rather than automatic ones, so the spline leaves and arrives where its corners turn.
  SceneBuilder.link('spline', `${elementId('b')}#${portId('s')}`, `${elementId('c')}#${portId('n', 3)}`)
    .id(elementId('bc'))
    .properties({
      points: [
        { x: scale(-6), y: scale(-2) },
        { x: scale(-16), y: scale(-2) },
      ],
    }),
];

const childElements = (name: string, elementId: (suffix: string) => string, variant: Variant): BuilderElement[] => {
  const directed = (id: string, from: string, to: string) =>
    SceneBuilder.link('line', from, to)
      .id(elementId(id))
      .properties({ ends: { end: 'arrow' } });
  switch (variant) {
    case 'flow':
      return [
        labelled(SceneBuilder.rect, elementId('start'), units(-18, -2, 8, 4), 'Start'),
        labelled(SceneBuilder.rect, elementId('work'), units(-4, -2, 8, 4), 'Work'),
        labelled(SceneBuilder.ellipse, elementId('done'), units(10, -2, 8, 4), 'Done'),
        directed('l1', `${elementId('start')}#e2`, `${elementId('work')}#w2`),
        directed('l2', `${elementId('work')}#e2`, `${elementId('done')}#w2`),
      ];
    case 'model':
      return [
        labelled(SceneBuilder.rect, elementId('person'), units(-20, -4, 8, 8), 'Person'),
        labelled(SceneBuilder.rect, elementId('org'), units(-4, -4, 8, 8), 'Organization'),
        SceneBuilder.link('curve', `${elementId('person')}#e2`, `${elementId('org')}#w2`).id(elementId('works')),
      ];
    case 'cycle':
      return [
        labelled(SceneBuilder.ellipse, elementId('n1'), units(-2, -10, 4, 4), '1'),
        labelled(SceneBuilder.ellipse, elementId('n2'), units(-2, 6, 4, 4), '2'),
        labelled(SceneBuilder.ellipse, elementId('n3'), units(-14, -2, 4, 4), '3'),
        // Routed rather than drawn: the ring is the one arrangement where a stored control point has to be
        // re-placed every time a node moves.
        SceneBuilder.link('smart', elementId('n1'), elementId('n2')).id(elementId('e12')),
        SceneBuilder.link('smart', elementId('n2'), elementId('n3')).id(elementId('e23')),
        SceneBuilder.link('smart', elementId('n3'), elementId('n1')).id(elementId('e31')),
      ];
    case 'note':
      return [
        SceneBuilder.note(elementId('note'), units(-14, -4, 16, 8)).properties({
          text: `A note in "${name}". Portals below.`,
        }),
        labelled(SceneBuilder.rect, elementId('box'), units(6, -4, 8, 8), 'Box'),
        SceneBuilder.link('curve', elementId('note'), elementId('box')).id(elementId('nb')),
      ];
  }
};
