//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type ContentMap, applyCommands } from '@dxos/diagram';
import { DEFAULT_LAYER, isEllipseNode, isRectNode, sortByZ } from '@dxos/react-ui-canvas/scene';

import { ROOT_SCENE_ID, readScenes, rootOf, writeScenes } from './content.ts';
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
    expect(rootOf(content)).toBe(ROOT_SCENE_ID);

    const scenes = readScenes(content);
    const root = scenes[ROOT_SCENE_ID];
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

  test('moves and removes objects; edits by the canvas keep the identity', ({ expect }) => {
    const content: ContentMap = {};
    applyCommands(content, [{ op: 'upsert-object', object: face }], SceneHandler);
    applyCommands(content, [{ op: 'move-object', objectId: 'face', origin: { x: 128, y: 64 } }], SceneHandler);
    expect(readScenes(content)[ROOT_SCENE_ID].nodes['face/head'].center).toEqual({ x: 256, y: 128 });
    expect(SceneHandler.read(content).scene.objects[0].origin).toEqual({ x: 128, y: 64 });

    // The canvas moves the head: the record changes, its DSL identity survives, the object reads back moved.
    const before = readScenes(content);
    const root = before[ROOT_SCENE_ID];
    const head = root.nodes['face/head'];
    const scenes = {
      ...before,
      [ROOT_SCENE_ID]: { ...root, nodes: { ...root.nodes, 'face/head': { ...head, center: { x: 512, y: 128 } } } },
    };
    expect(writeScenes(content, scenes)).toBe(true);
    expect(writeScenes(content, scenes)).toBe(false);
    expect(SceneHandler.read(content).scene.objects[0].elements[0]).toMatchObject({ id: 'head', x: 256 });

    const removed = applyCommands(content, [{ op: 'remove-object', objectId: 'face' }], SceneHandler);
    expect(removed.removed).toBe(4);
    expect(Object.keys(readScenes(content)[ROOT_SCENE_ID].nodes)).toEqual([]);
    expect(SceneHandler.read(content).scene.objects).toEqual([]);
  });

  test('a node drawn by hand is unmanaged and survives DSL edits', ({ expect }) => {
    const content: ContentMap = {};
    applyCommands(content, [{ op: 'upsert-object', object: face }], SceneHandler);
    const before = readScenes(content);
    const root = before[ROOT_SCENE_ID];
    const byhand = {
      type: 'rect' as const,
      id: 'byhand',
      z: 'z',
      center: { x: 640, y: 640 },
      size: { width: 128, height: 64 },
    };
    writeScenes(content, { ...before, [ROOT_SCENE_ID]: { ...root, nodes: { ...root.nodes, byhand } } });
    expect(SceneHandler.read(content).unmanaged).toBe(1);
    applyCommands(content, [{ op: 'remove-object', objectId: 'face' }], SceneHandler);
    expect(Object.keys(readScenes(content)[ROOT_SCENE_ID].nodes)).toEqual(['byhand']);
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
              { kind: 'text', id: 'a-b-0-label', x: 136, y: 180, text: 'calls', weight: 's' },
            ],
          },
        },
      ],
      SceneHandler,
    );
    const root = readScenes(content)[ROOT_SCENE_ID];
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
});
