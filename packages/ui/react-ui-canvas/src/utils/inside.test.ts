//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type InstanceNode, type Node, type NoteNode } from '@dxos/scene';

import { defaultNodeRegistry } from '../components/index.ts';
import { type RenderList2D } from '../model/index.ts';
import { moveNodes, updateElement } from './edits.ts';
import { insideScene, insideWrites } from './inside.ts';
import { nodeBounds } from './shapes.ts';

const note = (id: string, x: number, y: number, text: string, constrain?: Node['constrain']): NoteNode => ({
  id,
  type: 'note',
  z: 'a0',
  center: { x, y },
  size: { width: 100, height: 20 },
  text,
  ...(constrain ? { constrain } : {}),
});

/** A card authored 200x100 about the origin: a title pinned to the top, a footer to the bottom. */
const CARD: RenderList2D = {
  id: 'card',
  kind: 'composite',
  nodes: {
    frame: {
      id: 'frame',
      type: 'rect',
      z: 'a0',
      center: { x: 0, y: 0 },
      size: { width: 200, height: 100 },
      constrain: { x: 'stretch', y: 'stretch' },
    },
    title: note('title', 0, -30, 'Title', { x: 'stretch', y: 'min' }),
    footer: note('footer', 0, 30, 'Footer', { x: 'stretch', y: 'max' }),
  },
  links: {},
};

const instance = (size = { width: 200, height: 100 }): InstanceNode => ({
  type: 'instance',
  id: 'card-1',
  z: 'b0',
  center: { x: 0, y: 0 },
  size,
  composite: 'card',
  fit: 'none',
});

const OUTER = (node: InstanceNode): RenderList2D => ({
  id: 'board',
  nodes: {
    [node.id]: node,
    other: { id: 'other', type: 'rect', z: 'b1', center: { x: 400, y: 0 }, size: { width: 80, height: 40 } },
  },
  links: {},
});

const writes = (node: InstanceNode, edit: (scene: RenderList2D) => RenderList2D) => {
  const { scene, parts } = insideScene(OUTER(node), node, CARD);
  return insideWrites(defaultNodeRegistry, node, CARD, edit(scene), parts);
};

describe('insideScene', () => {
  test('the Instance is replaced by its parts, drawn where it drew them', () => {
    const { scene, parts } = insideScene(OUTER(instance()), instance(), CARD);
    expect(scene.nodes['card-1']).toBeUndefined();
    expect(parts).toEqual(new Set(['frame', 'title', 'footer']));
    expect(scene.nodes.title?.center).toEqual({ x: 0, y: -30 });
  });

  test('a stretched Instance shows its parts solved, not scaled', () => {
    const { scene } = insideScene(
      OUTER(instance({ width: 200, height: 200 })),
      instance({ width: 200, height: 200 }),
      CARD,
    );
    // The footer keeps its 10px gap to the bottom edge, which is now at 100, and keeps its own height.
    expect(nodeBounds(scene.nodes.footer!)).toMatchObject({ y: 100 - 10 - 20, height: 20 });
  });

  test('the drawing around the Object is locked, so a gesture inside it moves nothing outside', () => {
    const { scene } = insideScene(OUTER(instance()), instance(), CARD);
    expect(scene.nodes.other?.locked).toBe(true);
    expect(scene.nodes.title?.locked).toBeUndefined();
  });
});

describe('insideWrites', () => {
  test("typing in a part is this Instance's own words, and the definition is untouched", () => {
    const result = writes(instance(), updateElement('title', { text: 'Mine' }));
    expect(result.overrides).toEqual({ title: { text: 'Mine' } });
    expect(result.composite).toBeUndefined();
  });

  test('typing a part back to the definition’s text clears the override', () => {
    const node = { ...instance(), overrides: { title: { text: 'Mine' } } };
    const result = writes(node, updateElement('title', { text: 'Title' }));
    expect(result.overrides).toBeUndefined();
  });

  test('restyling a part writes the definition, so every Instance of it follows', () => {
    const result = writes(instance(), updateElement('title', { style: { hue: 'blue' } }));
    expect(result.composite?.nodes.title?.style).toMatchObject({ hue: 'blue' });
    expect(result.overrides).toBeUndefined();
  });

  test('moving a part writes the definition, in the composite’s own coordinates', () => {
    const result = writes(instance(), moveNodes(['title'], { x: 10, y: 0 }));
    expect(result.composite?.nodes.title?.center).toEqual({ x: 10, y: -30 });
  });

  test('a part moved inside a stretched Instance lands where it was dragged, in every Instance', () => {
    const node = instance({ width: 400, height: 100 });
    // The title stretches, so its box is 200 wide inside a 400-wide frame; a 20px drag down is 20px in both.
    const result = writes(node, moveNodes(['title'], { x: 0, y: 20 }));
    expect(result.composite?.nodes.title?.center).toEqual({ x: 0, y: -10 });
  });

  test('deleting a part takes it out of the definition and drops its override', () => {
    const node = { ...instance(), overrides: { footer: { text: 'Mine' } } };
    const result = writes(node, (scene) => {
      const { footer: _, ...nodes } = scene.nodes;
      return { ...scene, nodes };
    });
    expect(result.composite?.nodes.footer).toBeUndefined();
    expect(result.overrides).toBeUndefined();
  });

  test('an edit that touches nothing of the Object writes nothing', () => {
    const result = writes(instance(), (scene) => scene);
    expect(result).toEqual({});
  });
});
