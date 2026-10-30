//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type InstanceNode, type Node, isInstanceNode } from '@dxos/scene';

import { ViewBuilder } from '../builder/index.ts';
import { reduceIntent } from '../engine/index.ts';
import { type View } from '../model/index.ts';
import {
  composeSelection,
  compositeBounds,
  copyComposite,
  instanceCounts,
  instanceTransform,
  instanceView,
  libraryViews,
  promoted,
  promotedBy,
  removeComposite,
  retargetInstance,
  ungroupInstance,
} from './compose.ts';
import { nodeBounds } from './shapes.ts';

const box = (x: number, y = 0) => ({ x, y, width: 100, height: 50 });
const {
  views: [scene],
} = ViewBuilder.view('s', [
  ViewBuilder.rect('a', box(0)),
  ViewBuilder.rect('b', box(200)),
  ViewBuilder.rect('c', box(400)),
  ViewBuilder.link('line', 'a', 'b').id('ab'),
  ViewBuilder.link('line', 'b', 'c').id('bc'),
]).build();

const nodeCenter = (node: Node | undefined) => node?.center ?? { x: 0, y: 0 };

const counter = () => {
  let next = 0;
  return (prefix: string) => `${prefix}-${next++}`;
};

const instanceOf = (parent: View, id: string): InstanceNode => {
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
    const composite: View = {
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
    expect(instanceView(instance, composite).nodes.a).toMatchObject({
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

describe('anonymous Objects', () => {
  const group = composeSelection(scene, ['a', 'b'], { compositeId: 'g', instanceId: 'i', anonymous: true });
  const named = composeSelection(scene, ['c'], { compositeId: 'n', instanceId: 'j', name: 'Named' });

  test('Group marks its Object anonymous, and the library leaves it out until it is named', ({ expect }) => {
    expect(group?.composite.anonymous).toBe(true);
    expect(named?.composite.anonymous).toBeUndefined();
    if (!group || !named) {
      return;
    }
    const scenes = { s: scene, g: group.composite, n: named.composite };
    expect(libraryViews(scenes).map((view) => view.id)).toEqual(['n']);
    const renamed = { ...promoted(group.composite), name: 'Pair' };
    expect(renamed.anonymous).toBeUndefined();
    expect(libraryViews({ ...scenes, g: renamed }).map((view) => view.id)).toEqual(['n', 'g']);
    expect(promoted(named.composite)).toBe(named.composite);
  });

  test('placing an anonymous Object again promotes it; a named one needs nothing', ({ expect }) => {
    if (!group || !named) {
      return;
    }
    const parent = reduceIntent(reduceIntent(scene, { kind: 'batch', intents: group.intents }), {
      kind: 'batch',
      intents: named.intents,
    });
    const scenes = { s: parent, g: group.composite, n: named.composite };
    const placed = promotedBy(scenes, [instanceOf(parent, 'i'), instanceOf(parent, 'j'), parent.nodes.i]);
    expect(Object.keys(placed)).toEqual(['g']);
    expect(placed.g.anonymous).toBeUndefined();
    expect(promotedBy(scenes, [instanceOf(parent, 'j')])).toEqual({});
  });

  test('a copy of an anonymous Object is named, so it is in the library', ({ expect }) => {
    if (!group) {
      return;
    }
    expect(copyComposite(group.composite, 'g2', counter()).composite.anonymous).toBeUndefined();
  });
});

describe('removeComposite', () => {
  const instance = (id: string, composite: string): InstanceNode => ({
    type: 'instance',
    id,
    z: 'a',
    center: { x: 0, y: 0 },
    size: { width: 100, height: 50 },
    composite,
  });
  const view = (id: string, nodes: View['nodes'], links: View['links'] = {}, extra: Partial<View> = {}): View => ({
    id,
    nodes,
    links,
    ...extra,
  });
  // The root places Card (linked to a box); Card places an anonymous Object; Logo is a named Object placed nowhere.
  const views = {
    'root': view(
      'root',
      {
        card: instance('card', 'card-def'),
        box: { type: 'rect', id: 'box', z: 'b', center: { x: 0, y: 0 }, size: { width: 10, height: 10 } },
      },
      { l: { type: 'line', id: 'l', z: 'a', source: { node: 'box' }, target: { node: 'card' } } },
    ),
    'card-def': view('card-def', { inner: instance('inner', 'anon') }, {}, { kind: 'composite', name: 'Card' }),
    'anon': view('anon', {}, {}, { kind: 'composite', anonymous: true }),
    'logo': view('logo', {}, {}, { kind: 'composite', name: 'Logo' }),
  };

  test('with its instances, the Object, its Instances and their links go, and so do records only they pointed at', ({
    expect,
  }) => {
    const next = removeComposite(views, 'card-def', { instances: true, roots: ['root'] });
    expect(Object.keys(next ?? {}).sort()).toEqual(['logo', 'root']);
    expect(Object.keys(next?.root.nodes ?? {})).toEqual(['box']);
    expect(next?.root.links).toEqual({});
  });

  test('without, a placed Object stays and an unplaced one goes alone', ({ expect }) => {
    expect(removeComposite(views, 'card-def', { instances: false, roots: ['root'] })).toBeUndefined();
    expect(Object.keys(removeComposite(views, 'logo', { instances: false, roots: ['root'] }) ?? {}).sort()).toEqual([
      'anon',
      'card-def',
      'root',
    ]);
  });
});
