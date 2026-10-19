//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { SceneBuilder } from '../builder/index.ts';
import { reduceIntent } from '../engine/index.ts';
import { type InstanceNode, type Scene, createTimeline, isInstanceNode, setKey } from '../model/index.ts';
import {
  composeSelection,
  compositeBounds,
  copyComposite,
  instanceCounts,
  instanceScene,
  instanceTransform,
  retargetInstance,
  ungroupInstance,
} from './compose.ts';
import { nodeBounds } from './shapes.ts';

const box = (x: number, y = 0) => ({ x, y, width: 100, height: 50 });
const {
  scenes: [scene],
} = SceneBuilder.scene('s', [
  SceneBuilder.rect('a', box(0)),
  SceneBuilder.rect('b', box(200)),
  SceneBuilder.rect('c', box(400)),
  SceneBuilder.link('line', 'a', 'b').id('ab'),
  SceneBuilder.link('line', 'b', 'c').id('bc'),
]).build();

const counter = () => {
  let next = 0;
  return (prefix: string) => `${prefix}-${next++}`;
};

const instanceOf = (parent: Scene, id: string): InstanceNode => {
  const node = parent.nodes[id];
  if (!node || !isInstanceNode(node)) {
    throw new Error(`no instance ${id}`);
  }
  return node;
};

describe('composeSelection', () => {
  test('the selection becomes a composite, re-centred, and one instance replaces it in place', ({ expect }) => {
    const composition = composeSelection(scene, ['a', 'b', 'ab'], { compositeId: 'obj', instanceId: 'i' });
    if (!composition) {
      throw new Error('no composition');
    }
    const { composite, intents } = composition;
    expect(composite.kind).toBe('composite');
    expect(Object.keys(composite.nodes)).toEqual(['a', 'b']);
    expect(Object.keys(composite.links)).toEqual(['ab']);
    // Re-centred on the bounds of the selection, which ran from x 0 to 300.
    expect(compositeBounds(composite)).toEqual({ x: -150, y: -25, width: 300, height: 50 });

    const parent = reduceIntent(scene, { kind: 'batch', intents });
    expect(Object.keys(parent.nodes).sort()).toEqual(['c', 'i']);
    const instance = instanceOf(parent, 'i');
    expect(nodeBounds(instance)).toEqual({ x: 0, y: 0, width: 300, height: 50 });
    // The link that crossed the edge leaves through a port of the instance, named by the inner node it left.
    expect(composite.nodes.b.exposed).toBe(true);
    expect(parent.links.bc.source).toEqual({ node: 'i', port: 'b' });
    expect(instance.ports).toEqual([{ id: 'b', side: 'e', offset: 0.5 }]);
  });

  test('keyed tracks of the grouped nodes move into the composite, in its coordinates', ({ expect }) => {
    const timeline = setKey(createTimeline(), 'a', 'center', { t: 1, value: { x: 50, y: 25 } });
    const composition = composeSelection({ ...scene, timeline }, ['a', 'b'], { compositeId: 'obj', instanceId: 'i' });
    expect(composition?.composite.timeline?.tracks['a:center'].keys).toEqual([{ t: 1, value: { x: -100, y: 0 } }]);
  });

  test('a locked node is not grouped', ({ expect }) => {
    const locked = { ...scene, nodes: { ...scene.nodes, a: { ...scene.nodes.a, locked: true } } };
    expect(composeSelection(locked, ['a', 'b'], { compositeId: 'obj', instanceId: 'i' })).toBeUndefined();
  });
});

describe('instances', () => {
  test('fit scales the composite uniformly into the frame, centred', ({ expect }) => {
    const transform = instanceTransform(
      { x: 0, y: 0, width: 600, height: 200 },
      { x: -150, y: -25, width: 300, height: 50 },
    );
    expect(transform).toEqual({ scale: 2, offset: { x: 300, y: 100 } });
  });

  test('overrides apply per field, style per key', ({ expect }) => {
    const composite: Scene = {
      id: 'obj',
      kind: 'composite',
      nodes: { a: { ...scene.nodes.a, style: { hue: 'red', rounded: true } } },
      links: {},
    };
    const instance: InstanceNode = {
      type: 'instance',
      id: 'i',
      z: 'a',
      center: { x: 0, y: 0 },
      size: { width: 100, height: 50 },
      composite: 'obj',
      overrides: { a: { style: { hue: 'blue', opacity: 0.5 } } },
    };
    expect(instanceScene(instance, composite).nodes.a).toMatchObject({
      style: { hue: 'blue', rounded: true, opacity: 0.5 },
    });
  });
});

describe('compose and ungroup', () => {
  test('ungrouping an instance puts the nodes back where they were drawn, links re-attached', ({ expect }) => {
    const composition = composeSelection(scene, ['a', 'b', 'ab'], { compositeId: 'obj', instanceId: 'i' });
    if (!composition) {
      throw new Error('no composition');
    }
    const parent = reduceIntent(scene, { kind: 'batch', intents: composition.intents });
    const restored = reduceIntent(parent, {
      kind: 'batch',
      intents: ungroupInstance(parent, instanceOf(parent, 'i'), composition.composite, counter()),
    });
    const nodes = Object.values(restored.nodes).sort((left, right) => left.center.x - right.center.x);
    expect(nodes.map(nodeBounds)).toEqual([box(0), box(200), box(400)]);
    expect(restored.nodes.i).toBeUndefined();
    // The crossing link now leaves the node that stood behind the port; the inner link joins the new nodes.
    const [first, second] = nodes;
    expect(restored.links.bc.source).toEqual({ node: second.id });
    expect(
      Object.values(restored.links).some(
        (link) =>
          'node' in link.source &&
          link.source.node === first.id &&
          'node' in link.target &&
          link.target.node === second.id,
      ),
    ).toBe(true);
  });

  test('make unique copies the definition under fresh ids and renames the overrides and ports', ({ expect }) => {
    const composition = composeSelection(scene, ['a', 'b', 'ab'], { compositeId: 'obj', instanceId: 'i' });
    if (!composition) {
      throw new Error('no composition');
    }
    const parent = reduceIntent(scene, { kind: 'batch', intents: composition.intents });
    const instance = { ...instanceOf(parent, 'i'), overrides: { a: { style: { opacity: 0.5 } } } };
    const { composite, rename } = copyComposite(composition.composite, 'obj2', counter());
    const unique = retargetInstance(instance, 'obj2', rename);
    expect(composite.id).toBe('obj2');
    expect(Object.keys(composite.nodes)).toEqual(['node-0', 'node-1']);
    expect(unique.overrides).toEqual({ 'node-0': { style: { opacity: 0.5 } } });
    expect(unique.ports?.map((port) => port.id)).toEqual(['node-1']);
    expect(instanceCounts({ s: { ...parent, nodes: { ...parent.nodes, j: unique } } })).toEqual({ obj: 1, obj2: 1 });
  });
});
