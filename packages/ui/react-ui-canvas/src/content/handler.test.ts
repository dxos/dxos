//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type ContentMap, Dsl, SvgFile, applyCommands } from '@dxos/diagram';
import * as EffectEx from '@dxos/effect/EffectEx';
import { type Node, type Shape, isDiagramNode, isEllipseNode, isRectNode } from '@dxos/scene';

import { defaultNodeRegistry } from '../components/index.ts';
import { type RenderList2D } from '../model/index.ts';
import {
  DEFAULT_LAYER,
  diagramLinkMarkup,
  diagramNodeMarkup,
  linkGeometry,
  nodeTitle,
  sortByZ,
} from '../utils/index.ts';
import { ROOT_VIEW_ID, readViews, rootOf, seedContent, updateCanvasRecord, writeViews } from './content.ts';
import { BACKDROP_LAYER, SceneHandler, elementId } from './handler.ts';

const face = {
  id: 'face',
  origin: { x: 64, y: 64 },
  elements: [
    { kind: 'rect' as const, id: 'head', x: 0, y: 0, w: 256, h: 128, text: 'Head', color: 'blue' as const },
    { kind: 'circle' as const, id: 'eye', cx: 64, cy: 32, r: 16 },
    { kind: 'text' as const, id: 'caption', x: 0, y: 192, w: 256, text: 'A face' },
    { kind: 'arrow' as const, id: 'look', from: 'head', to: 'eye' },
    { kind: 'line' as const, id: 'ignored', points: [{ x: 0, y: 0 }] },
  ],
};

describe('SceneHandler', () => {
  test('compiles DSL objects into root-scene nodes and links, and reads them back', ({ expect }) => {
    const content: ContentMap = {};
    const result = applyCommands(content, [{ op: 'upsert-object', object: face }], SceneHandler);
    expect(result.upserted).toEqual(['face']);
    expect(rootOf(content)).toBe(ROOT_VIEW_ID);

    const scenes = readViews(content);
    const root = scenes[ROOT_VIEW_ID];
    expect(Object.keys(root.nodes).sort()).toEqual(['face/caption', 'face/eye', 'face/head']);
    expect(Object.keys(root.links)).toEqual(['face/look']);
    const head = root.nodes[elementId('face', 'head')];
    expect(isRectNode(head) && [head.center, head.size, head.label, head.style?.hue]).toEqual([
      { x: 192, y: 128 },
      { width: 256, height: 128 },
      'Head',
      'blue',
    ]);
    const eye = root.nodes[elementId('face', 'eye')];
    expect(isEllipseNode(eye) && [eye.center, eye.size.width]).toEqual([{ x: 128, y: 96 }, 32]);
    expect(root.links['face/look'].source).toEqual({ node: 'face/head' });
    expect(root.links['face/look'].type).toBe('smart');

    const { scene, unmanaged } = SceneHandler.read(content);
    expect(unmanaged).toBe(0);
    expect(scene.objects).toHaveLength(1);
    const [object] = scene.objects;
    expect(object.id).toBe('face');
    expect(object.origin).toEqual({ x: 64, y: 64 });
    expect(object.elements.map((element) => [element.kind, element.id])).toEqual([
      ['rect', 'head'],
      ['ellipse', 'eye'],
      ['text', 'caption'],
      ['arrow', 'look'],
    ]);
    const [rect, , , arrow] = object.elements;
    expect(rect.kind === 'rect' && [rect.x, rect.y, rect.w, rect.h, rect.text]).toEqual([0, 0, 256, 128, 'Head']);
    expect(arrow.kind === 'arrow' && [arrow.from, arrow.to]).toEqual(['head', 'eye']);
  });

  test('a contributed kind survives records to text and back, with its own fields', ({ expect }) => {
    // A kind is what a plugin contributes (decision 1), so the handler cannot know its fields; it carries whatever
    // the node holds. Without this every card in a drawing printed as a plain `rect` and `Rebuild` replaced the
    // drawing with boxes.
    const content: ContentMap = {};
    seedContent(content);
    const scene = rootOf(content);
    // A kind's node holds fields the engine does not declare, which is the whole point of a kind.
    const node: Node & Record<string, unknown> = {
      type: 'card',
      id: elementId('deck', 'card-1'),
      z: 'a1',
      center: { x: 100, y: 64 },
      size: { width: 200, height: 128 },
      label: 'Calendar',
      icon: { type: 'ph--calendar--regular' },
      // `fill` is also a style attribute, so it needs escaping; `marks` holds a list, which has no spelling.
      data: { tone: 'event', variant: 'simple', fill: 0.55, marks: [1, 2] },
    };
    content['node:deck/card-1'] = { kind: 'node', scene, node, dsl: { object: 'deck', element: 'card-1' } };

    const text = Dsl.print(SceneHandler.read(content).scene);
    expect(text).toContain('kind=card');
    expect(text).toContain('tone=event');
    expect(text).toContain('variant=simple');

    const { commands, problems } = Dsl.read(text);
    expect(problems).toEqual([]);
    const rebuilt: ContentMap = {};
    applyCommands(rebuilt, commands, SceneHandler);
    const rebuiltNode = readViews(rebuilt)[ROOT_VIEW_ID].nodes[elementId('deck', 'card-1')];
    expect([rebuiltNode.type, nodeTitle(defaultNodeRegistry, rebuiltNode), Reflect.get(rebuiltNode, 'data')]).toEqual([
      'card',
      'Calendar',
      { tone: 'event', variant: 'simple', fill: 0.55 },
    ]);
    // A field whose name an element attribute claims is escaped rather than dropped: `substrate` keeps a numeric
    // `fill`, which is the cell density its hexagon is drawn at, and dropping it flattened the drawing.
    expect(text).toContain('data-fill=0.55');

    // Two gaps, asserted so they stay measured rather than assumed away. A field holding a list has no spelling in
    // the DSL at all. And the kind's remaining top-level fields do not survive: putting a name back on the right
    // side of the `data` split needs the kind's own schema, which only the registry holding the kind has.
    expect(text).not.toContain('marks=');
    expect(Reflect.get(rebuiltNode, 'icon')).toBeUndefined();
  });

  test('a connector keeps the head it was drawn with, a missing one included', ({ expect }) => {
    const heads: (Shape.ArrowHead | undefined)[] = [undefined, 'arrow', 'triangle', 'crowsfoot', 'none'];
    const object = {
      id: 'heads',
      origin: { x: 0, y: 0 },
      elements: [
        { kind: 'rect' as const, id: 'a', x: 0, y: 0, w: 128, h: 64, text: 'A' },
        { kind: 'rect' as const, id: 'b', x: 256, y: 0, w: 128, h: 64, text: 'B' },
        ...heads.map((head, index) => ({
          kind: 'arrow' as const,
          id: `link-${index}`,
          from: 'a',
          to: 'b',
          ...(head ? { head } : {}),
        })),
        { kind: 'arrow' as const, id: 'tailed', from: 'a', to: 'b', head: 'none' as const, tail: 'circle' as const },
      ],
    };
    const content: ContentMap = {};
    applyCommands(content, [{ op: 'upsert-object', object }], SceneHandler);
    const [read] = SceneHandler.read(content).scene.objects;
    const arrows = read.elements.flatMap((element) => (element.kind === 'arrow' ? [element] : []));
    // An arrow that states no head draws the default one, so it reads back as that head, not as none. A headless
    // one is stored with no end markers at all, which is what once came back as the default arrow.
    expect(arrows.map(({ id, head, tail }) => `${id}:${head}:${tail}`)).toEqual([
      'link-0:arrow:undefined',
      'link-1:arrow:undefined',
      'link-2:triangle:undefined',
      'link-3:crowsfoot:undefined',
      'link-4:none:undefined',
      'tailed:none:circle',
    ]);
  });

  test('a connector keeps the stroke it was drawn with, dotted included', ({ expect }) => {
    const strokes: (Shape.Stroke | undefined)[] = [undefined, 'solid', 'dashed', 'dotted'];
    const object = {
      id: 'strokes',
      origin: { x: 0, y: 0 },
      elements: [
        { kind: 'rect' as const, id: 'a', x: 0, y: 0, w: 128, h: 64, text: 'A' },
        { kind: 'rect' as const, id: 'b', x: 256, y: 0, w: 128, h: 64, text: 'B', stroke: 'dotted' as const },
        ...strokes.map((stroke, index) => ({
          kind: 'arrow' as const,
          id: `link-${index}`,
          from: 'a',
          to: 'b',
          ...(stroke ? { stroke } : {}),
        })),
        // A relation that draws dashes of its own, which a stated stroke overrides.
        { kind: 'arrow' as const, id: 'depends', from: 'a', to: 'b', relation: 'dependency' as const },
        {
          kind: 'arrow' as const,
          id: 'depends-dotted',
          from: 'a',
          to: 'b',
          relation: 'dependency' as const,
          stroke: 'dotted' as const,
        },
      ],
    };
    const content: ContentMap = {};
    applyCommands(content, [{ op: 'upsert-object', object }], SceneHandler);
    // What the canvas draws: the link's own line style.
    const drawn = Object.values(content).flatMap((record) =>
      record.kind === 'link' ? [`${record.link.id.split('/').pop()}:${record.link.style?.lineStyle}`] : [],
    );
    expect(drawn).toEqual([
      'link-0:undefined',
      'link-1:undefined',
      'link-2:dashed',
      'link-3:dotted',
      'depends:dashed',
      'depends-dotted:dotted',
    ]);
    const [read] = SceneHandler.read(content).scene.objects;
    const strokeOf = (id: string) => read.elements.flatMap((element) => (element.id === id ? [element] : []))[0];
    expect(Reflect.get(strokeOf('link-3'), 'stroke')).toBe('dotted');
    expect(Reflect.get(strokeOf('link-2'), 'stroke')).toBe('dashed');
    expect(Reflect.get(strokeOf('b'), 'stroke')).toBe('dotted');
  });

  test('moves and removes objects; edits by the canvas keep the identity', ({ expect }) => {
    const content: ContentMap = {};
    applyCommands(content, [{ op: 'upsert-object', object: face }], SceneHandler);
    applyCommands(content, [{ op: 'move-object', objectId: 'face', origin: { x: 128, y: 64 } }], SceneHandler);
    expect(readViews(content)[ROOT_VIEW_ID].nodes['face/head'].center).toEqual({ x: 256, y: 128 });
    expect(SceneHandler.read(content).scene.objects[0].origin).toEqual({ x: 128, y: 64 });

    // The canvas moves the head: the record changes, its DSL identity survives, the object reads back moved.
    const before = readViews(content);
    const root = before[ROOT_VIEW_ID];
    const head = root.nodes['face/head'];
    const scenes = {
      ...before,
      [ROOT_VIEW_ID]: { ...root, nodes: { ...root.nodes, 'face/head': { ...head, center: { x: 512, y: 128 } } } },
    };
    expect(writeViews(content, scenes)).toBe(true);
    expect(writeViews(content, scenes)).toBe(false);
    expect(SceneHandler.read(content).scene.objects[0].elements[0]).toMatchObject({ id: 'head', x: 256 });

    const removed = applyCommands(content, [{ op: 'remove-object', objectId: 'face' }], SceneHandler);
    expect(removed.removed).toBe(4);
    expect(Object.keys(readViews(content)[ROOT_VIEW_ID].nodes)).toEqual([]);
    expect(SceneHandler.read(content).scene.objects).toEqual([]);
  });

  test('a node drawn by hand is unmanaged and survives DSL edits', ({ expect }) => {
    const content: ContentMap = {};
    applyCommands(content, [{ op: 'upsert-object', object: face }], SceneHandler);
    const before = readViews(content);
    const root = before[ROOT_VIEW_ID];
    const byhand = {
      type: 'rect' as const,
      id: 'byhand',
      z: 'z',
      center: { x: 640, y: 640 },
      size: { width: 128, height: 64 },
    };
    writeViews(content, { ...before, [ROOT_VIEW_ID]: { ...root, nodes: { ...root.nodes, byhand } } });
    expect(SceneHandler.read(content).unmanaged).toBe(1);
    applyCommands(content, [{ op: 'remove-object', objectId: 'face' }], SceneHandler);
    expect(Object.keys(readViews(content)[ROOT_VIEW_ID].nodes)).toEqual(['byhand']);
  });

  test('a laid-out connector binds each end to the box it lands on, past the group around it', ({ expect }) => {
    const content: ContentMap = {};
    applyCommands(
      content,
      [
        {
          op: 'upsert-object',
          object: {
            id: 'group',
            origin: { x: 0, y: 0 },
            elements: [
              { kind: 'rect', id: 'frame', x: 0, y: 0, w: 800, h: 400, stroke: 'dashed', fill: 'tint' },
              { kind: 'text', id: 'label', x: 16, y: 8, text: 'Group', weight: 's' },
            ],
          },
        },
        {
          op: 'upsert-object',
          object: {
            id: 'a',
            origin: { x: 32, y: 32 },
            elements: [{ kind: 'rect', id: 'box', x: 0, y: 0, w: 192, h: 96 }],
          },
        },
        {
          op: 'upsert-object',
          object: {
            id: 'b',
            origin: { x: 32, y: 256 },
            elements: [{ kind: 'rect', id: 'box', x: 0, y: 0, w: 192, h: 96 }],
          },
        },
        {
          op: 'upsert-object',
          object: {
            id: 'edges',
            origin: { x: 0, y: 0 },
            elements: [
              { kind: 'arrow', id: 'a-b-0', start: { x: 128, y: 128 }, end: { x: 128, y: 256 } },
              { kind: 'arrow', id: 'a-b-1', start: { x: 96, y: 128 }, end: { x: 96, y: 256 }, head: 'crowsfoot' },
              { kind: 'text', id: 'a-b-0-label', x: 136, y: 180, text: 'calls', weight: 's' },
            ],
          },
        },
      ],
      SceneHandler,
    );
    const root = readViews(content)[ROOT_VIEW_ID];
    const link = root.links[elementId('edges', 'a-b-0')];
    // The caption is the link's own text, not a shape beside it.
    expect([link.type, link.source, link.target, link.ends, link.text]).toEqual([
      'smart',
      { node: 'a/box' },
      { node: 'b/box' },
      { end: 'arrow' },
      'calls',
    ]);
    expect(root.nodes[elementId('edges', 'a-b-0-label')]).toBeUndefined();
    // A crow's foot is the canvas's `many` end.
    expect(root.links[elementId('edges', 'a-b-1')].ends).toEqual({ end: 'many' });
    // The group is a guide (off the lattice) titled at its top-left corner; its title is no shape of its own.
    const group = root.nodes[elementId('group', 'frame')];
    expect(isRectNode(group) && [group.label, group.style]).toEqual([
      'Group',
      expect.objectContaining({ lineStyle: 'dashed', guide: true, alignHorizontal: 'left', alignVertical: 'top' }),
    ]);
    expect(root.nodes[elementId('group', 'label')]).toBeUndefined();
    // The group is decoration, on a backdrop layer below the boxes and links it groups.
    expect([group.layer, root.nodes[elementId('a', 'box')].layer, link.layer]).toEqual([
      BACKDROP_LAYER.id,
      DEFAULT_LAYER.id,
      DEFAULT_LAYER.id,
    ]);
    const layers = sortByZ(Object.values(root.layers ?? {})).map((layer) => layer.id);
    expect(layers).toEqual([BACKDROP_LAYER.id, DEFAULT_LAYER.id]);
  });

  test('a title reads back as small text in its box, and folds into the box again', ({ expect }) => {
    const content: ContentMap = {};
    seedContent(content);
    const group = {
      id: 'group',
      origin: { x: 0, y: 0 },
      elements: [
        { kind: 'rect' as const, id: 'frame', x: 0, y: 0, w: 800, h: 400 },
        { kind: 'text' as const, id: 'label', x: 16, y: 8, text: 'Group', weight: 's' as const },
      ],
    };
    applyCommands(content, [{ op: 'upsert-object', object: group }], SceneHandler);

    const [object] = SceneHandler.read(content).scene.objects;
    const [box, title] = object.elements;
    expect(box.kind === 'rect' && box.text).toBeUndefined();
    expect(title.kind === 'text' && [title.x, title.y, title.text, title.weight]).toEqual([8, 8, 'Group', 's']);

    const again: ContentMap = {};
    seedContent(again);
    applyCommands(again, [{ op: 'upsert-object', object }], SceneHandler);
    const node = readViews(again)[ROOT_VIEW_ID].nodes[elementId('group', 'frame')];
    expect(isRectNode(node) && [node.label, node.style?.alignHorizontal, node.style?.alignVertical]).toEqual([
      'Group',
      'left',
      'top',
    ]);
  });

  describe('titled boxes', () => {
    const titled = (elements: Shape.Element[]) => {
      const content: ContentMap = {};
      seedContent(content);
      applyCommands(
        content,
        [{ op: 'upsert-object', object: { id: 'group', origin: { x: 0, y: 0 }, elements } }],
        SceneHandler,
      );
      return content;
    };
    const frame = { kind: 'rect' as const, id: 'frame', x: 0, y: 0, w: 800, h: 400 };
    const label = { kind: 'text' as const, id: 'label', x: 16, y: 8, text: 'Group', weight: 's' as const };
    const nodeOf = (content: ContentMap, element: string) =>
      readViews(content)[ROOT_VIEW_ID].nodes[elementId('group', element)];
    const labelOf = (content: ContentMap, element: string) => {
      const node = nodeOf(content, element);
      return isRectNode(node) ? node.label : undefined;
    };

    test('updating only the box keeps its title', ({ expect }) => {
      const content = titled([frame, label]);
      applyCommands(
        content,
        [{ op: 'upsert-elements', objectId: 'group', elements: [{ ...frame, x: 100, w: 500 }] }],
        SceneHandler,
      );
      expect(labelOf(content, 'frame')).toBe('Group');
      const [object] = SceneHandler.read(content).scene.objects;
      expect(object.elements.map(({ id }) => id)).toEqual(['frame', 'frame-title']);
    });

    test('a partial update keeps the style it does not restate', ({ expect }) => {
      const content = titled([{ ...frame, color: 'violet', fill: 'tint', stroke: 'dashed' }, label]);
      const [{ elements }] = SceneHandler.read(content).scene.objects;
      const title = elements.find(({ id }) => id === 'frame-title');
      expect(title?.kind).toBe('text');
      if (title?.kind === 'text') {
        applyCommands(
          content,
          [{ op: 'upsert-elements', objectId: 'group', elements: [{ ...title, text: 'Renamed' }] }],
          SceneHandler,
        );
      }
      expect(nodeOf(content, 'frame').style).toMatchObject({ hue: 'violet', guide: true, lineStyle: 'dashed' });

      applyCommands(
        content,
        [{ op: 'upsert-elements', objectId: 'group', elements: [{ ...frame, x: 40, color: 'green' }] }],
        SceneHandler,
      );
      expect(nodeOf(content, 'frame').style).toMatchObject({ hue: 'green', guide: true, lineStyle: 'dashed' });
      expect(labelOf(content, 'frame')).toBe('Renamed');
    });

    test('removing a title clears it from its box and keeps the box', ({ expect }) => {
      const content = titled([{ ...frame, color: 'violet' }, label]);
      applyCommands(content, [{ op: 'remove-elements', objectId: 'group', elementIds: ['frame-title'] }], SceneHandler);
      expect(labelOf(content, 'frame')).toBeUndefined();
      expect(nodeOf(content, 'frame').style).toMatchObject({ hue: 'violet' });
      const [object] = SceneHandler.read(content).scene.objects;
      expect(object.elements.map(({ id }) => id)).toEqual(['frame']);
    });

    test('removing a box and its title removes both', ({ expect }) => {
      const content = titled([frame, { ...frame, id: 'other', x: 900 }, label]);
      applyCommands(
        content,
        [{ op: 'remove-elements', objectId: 'group', elementIds: ['frame', 'frame-title'] }],
        SceneHandler,
      );
      const [object] = SceneHandler.read(content).scene.objects;
      expect(object.elements.map(({ id }) => id)).toEqual(['other']);
    });

    test('a box given its own text replaces the title', ({ expect }) => {
      const content = titled([frame, label]);
      applyCommands(
        content,
        [{ op: 'upsert-elements', objectId: 'group', elements: [{ ...frame, text: 'Centred' }] }],
        SceneHandler,
      );
      expect(labelOf(content, 'frame')).toBe('Centred');
    });

    test('updating only the title changes the box rather than adding a text', ({ expect }) => {
      const content = titled([frame, label]);
      const [{ elements }] = SceneHandler.read(content).scene.objects;
      const title = elements.find(({ id }) => id === 'frame-title');
      expect(title?.kind).toBe('text');
      if (title?.kind === 'text') {
        applyCommands(
          content,
          [{ op: 'upsert-elements', objectId: 'group', elements: [{ ...title, text: 'Renamed' }] }],
          SceneHandler,
        );
      }
      expect(labelOf(content, 'frame')).toBe('Renamed');
      const [object] = SceneHandler.read(content).scene.objects;
      expect(object.elements.map(({ id }) => id)).toEqual(['frame', 'frame-title']);
    });

    test('a title id never collides with an element, which survives the round trip', ({ expect }) => {
      const content = titled([
        frame,
        label,
        { kind: 'text', id: 'frame-title', x: 900, y: 900, text: 'Elsewhere', weight: 's' },
      ]);
      const [object] = SceneHandler.read(content).scene.objects;
      const ids = object.elements.map(({ id }) => id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids).toContain('frame-title');

      const again: ContentMap = {};
      seedContent(again);
      applyCommands(again, [{ op: 'upsert-object', object }], SceneHandler);
      expect(labelOf(again, 'frame')).toBe('Group');
      expect(labelOf(again, 'frame-title')).toBe('Elsewhere');
    });

    test('a title stays with its inner box inside an untitled outer box', ({ expect }) => {
      const content = titled([
        { kind: 'rect', id: 'outer', x: 0, y: 0, w: 800, h: 400 },
        { kind: 'rect', id: 'inner', x: 100, y: 100, w: 200, h: 100 },
        { kind: 'text', id: 'label', x: 108, y: 108, text: 'Inner', weight: 's' },
      ]);
      expect(labelOf(content, 'outer')).toBeUndefined();
      expect(labelOf(content, 'inner')).toBe('Inner');

      const [object] = SceneHandler.read(content).scene.objects;
      const again: ContentMap = {};
      seedContent(again);
      applyCommands(again, [{ op: 'upsert-object', object }], SceneHandler);
      expect(labelOf(again, 'outer')).toBeUndefined();
      expect(labelOf(again, 'inner')).toBe('Inner');
    });
  });
});

const ARCHITECTURE = `
diagram flow=down
node Browser "Browser SPA"
node Api "API server"
node Worker "Background worker"
group data "Storage" {
  node Db "Postgres"
  node Cache "Redis"
}
group ext "External services" {
  node Stripe "Stripe"
  node Postmark "Postmark"
}
edge Browser -> Api "HTTPS"
edge Api -> Db "reads, writes"
edge Api -> Cache "sessions"
edge Api -> Stripe "payments"
edge Api -> Postmark "email"
edge Worker -> Cache "consume jobs"
edge Worker -> Db "writes"
`;

/** Every SVG element the canvas draws for a scene's diagram shapes and connectors, as text. */
const drawn = (scene: RenderList2D): string[] =>
  [
    ...Object.values(scene.nodes).flatMap((node) => (isDiagramNode(node) ? diagramNodeMarkup(node) : [])),
    ...Object.values(scene.links).flatMap((link) => {
      const geometry = linkGeometry(scene, defaultNodeRegistry, link);
      return geometry?.diagram && link.connector
        ? diagramLinkMarkup(link, link.connector, geometry.diagram, SvgFile.markerIds('dx'))
        : [];
    }),
  ].map(SvgFile.serialize);

describe('SceneHandler on a canvas of diagram shapes', () => {
  test('the canvas draws a laid-out diagram element for element as its SVG file does', async ({ expect }) => {
    const { commands, problems } = await EffectEx.runPromise(Dsl.compile(ARCHITECTURE));
    expect(problems).toEqual([]);
    const { objects } = Dsl.toScene(commands);
    const content: ContentMap = {};
    seedContent(content);
    updateCanvasRecord(content, { diagramShapes: true });
    applyCommands(
      content,
      objects.map((object) => ({ op: 'upsert-object' as const, object })),
      SceneHandler,
    );
    const root = readViews(content)[ROOT_VIEW_ID];
    expect(Object.values(root.nodes).every(isDiagramNode)).toBe(true);
    expect(Object.keys(root.links)).toHaveLength(7);

    const file = SvgFile.toSvgFile(objects);
    const elements = drawn(root);
    // Two groups (frame and title), seven boxes, and seven connectors with their bends and captions.
    expect(elements.length).toBeGreaterThanOrEqual(2 * 2 + 7 + 7 * 2);
    for (const element of elements) {
      expect(file).toContain(element);
    }
  });

  test('a moved box re-routes its connectors at right angles, in the same renderer', async ({ expect }) => {
    const { commands } = await EffectEx.runPromise(Dsl.compile(ARCHITECTURE));
    const content: ContentMap = {};
    seedContent(content);
    updateCanvasRecord(content, { diagramShapes: true });
    applyCommands(
      content,
      Dsl.toScene(commands).objects.map((object) => ({ op: 'upsert-object' as const, object })),
      SceneHandler,
    );
    const before = readViews(content);
    const root = before[ROOT_VIEW_ID];
    const cache = root.nodes[elementId('Cache', 'box')];
    const moved: RenderList2D = {
      ...root,
      nodes: { ...root.nodes, [cache.id]: { ...cache, center: { x: cache.center.x + 200, y: cache.center.y + 160 } } },
    };
    for (const link of Object.values(moved.links).filter(
      (link) => 'node' in link.target && link.target.node === cache.id,
    )) {
      const route = linkGeometry(moved, defaultNodeRegistry, link)?.diagram;
      expect(route?.laid).toBe(false);
      const points = route?.points ?? [];
      expect(points.slice(1).every((point, index) => point.x === points[index].x || point.y === points[index].y)).toBe(
        true,
      );
      const markup = (
        route && link.connector ? diagramLinkMarkup(link, link.connector, route, SvgFile.markerIds('dx')) : []
      ).map(SvgFile.serialize);
      expect(markup.join('')).toContain(`marker-end="url(#dx-arrow)"`);
      expect(markup.join('')).toContain(link.text ?? '');
    }

    // The canvas reads back the DSL it was given, at the box's new place.
    const { scene } = SceneHandler.read(content);
    const group = scene.objects.find((object) => object.id === 'data');
    expect(group?.elements.map((element) => [element.kind, element.id])).toEqual([
      ['rect', 'frame'],
      ['text', 'label'],
    ]);
  });
});
