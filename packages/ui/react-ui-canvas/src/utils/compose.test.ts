//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type InstanceNode, type Node, type PlacedComposite, isInstanceNode } from '@dxos/scene';

import { ViewBuilder } from '../builder/index.ts';
import { type RenderList2D } from '../model/index.ts';
import {
  composeSelection,
  compositeBounds,
  copyComposite,
  instanceCounts,
  instancePlacement,
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

const instanceOf = (parent: RenderList2D, id: string): PlacedComposite => {
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
    const { composite, edit } = composition;
    expect(composite.kind).toBe('composite');
    expect(Object.keys(composite.nodes)).toEqual(['a', 'b']);
    expect(Object.keys(composite.links)).toEqual(['ab']);
    // Re-centred on the bounds of the selection, which ran from x 0 to 300.
    expect(compositeBounds(composite)).toEqual({ x: -150, y: -25, width: 300, height: 50 });

    const parent = edit(scene);
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
    const composite: RenderList2D = {
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
    const parent = composition.edit(scene);
    const restored = ungroupInstance(parent, instanceOf(parent, 'i'), composition.composite, counter()).edit(parent);
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
    const parent = composition.edit(scene);
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
    const parent = named.edit(group.edit(scene));
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
  const view = (
    id: string,
    nodes: RenderList2D['nodes'],
    links: RenderList2D['links'] = {},
    extra: Partial<RenderList2D> = {},
  ): RenderList2D => ({
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

describe('constrained parts', () => {
  /** A card authored 288x192 about the origin: a glyph top-left, a body between, a footer on the bottom edge. */
  const CARD: RenderList2D = {
    id: 'card',
    kind: 'composite',
    nodes: {
      frame: {
        id: 'frame',
        type: 'rect',
        z: 'a0',
        center: { x: 0, y: 0 },
        size: { width: 288, height: 192 },
        constrain: { x: 'stretch', y: 'stretch' },
      },
      icon: {
        id: 'icon',
        type: 'rect',
        z: 'a1',
        center: { x: -114, y: -66 },
        size: { width: 36, height: 36 },
        constrain: { x: 'min', y: 'min' },
      },
      footer: {
        id: 'footer',
        type: 'rect',
        z: 'a2',
        center: { x: 0, y: 75 },
        size: { width: 264, height: 18 },
        constrain: { x: 'stretch', y: 'max' },
      },
    },
    links: {
      rule: {
        id: 'rule',
        type: 'line',
        z: 'b0',
        source: { point: { x: -132, y: 72 } },
        target: { point: { x: 132, y: 72 } },
        constrain: { x: 'stretch', y: 'max' },
      },
    },
  };

  const PLAIN: RenderList2D = {
    id: 'plain',
    kind: 'composite',
    nodes: { only: { id: 'only', type: 'rect', z: 'a0', center: { x: 0, y: 0 }, size: { width: 100, height: 50 } } },
    links: {},
  };

  const instance = (size: { width: number; height: number }): InstanceNode => ({
    type: 'instance',
    id: 'i',
    z: 'c0',
    center: { x: 0, y: 0 },
    size,
    composite: 'card',
    fit: 'fit',
  });

  test('a composite with no constraint still draws through one uniform transform', ({ expect }) => {
    const placement = instancePlacement({ ...instance({ width: 200, height: 100 }), composite: 'plain' }, PLAIN);
    expect(placement.transform.scale).toEqual(2);
    expect(placement.view.nodes.only?.size).toEqual({ width: 100, height: 50 });
  });

  test('a constrained composite places its parts in the scene and needs no transform', ({ expect }) => {
    const placement = instancePlacement(instance({ width: 288, height: 192 }), CARD);
    expect(placement.transform).toEqual({ scale: 1, offset: { x: 0, y: 0 } });
    // Drawn at the size it was authored, every part is exactly where it was.
    expect(placement.view.nodes.icon?.center).toEqual({ x: -114, y: -66 });
    expect(placement.view.nodes.footer?.center).toEqual({ x: 0, y: 75 });
  });

  test('the footer stays on the bottom edge and the glyph in the corner as the instance grows', ({ expect }) => {
    const { view } = instancePlacement(instance({ width: 576, height: 384 }), CARD);
    // The instance is centred on the origin, so its frame runs -288..288 by -192..192.
    expect(nodeBounds(view.nodes.icon!)).toEqual({ x: -276, y: -180, width: 36, height: 36 });
    expect(nodeBounds(view.nodes.footer!)).toMatchObject({ y: 192 - 12 - 18, height: 18 });
    expect(nodeBounds(view.nodes.frame!)).toEqual({ x: -288, y: -192, width: 576, height: 384 });
  });

  test("a hairline's ends keep their inset and follow the bottom edge", ({ expect }) => {
    const { view } = instancePlacement(instance({ width: 576, height: 384 }), CARD);
    const rule = view.links.rule!;
    expect(rule.source).toEqual({ point: { x: -276, y: 168 } });
    expect(rule.target).toEqual({ point: { x: 276, y: 168 } });
  });

  test('an overridden part is solved after the override, not before', ({ expect }) => {
    const node = { ...instance({ width: 576, height: 384 }), overrides: { icon: { size: { width: 24, height: 24 } } } };
    const { view } = instancePlacement(node, CARD);
    // The smaller glyph keeps its own gap to the corner, measured in the definition's box, not the overridden one.
    expect(nodeBounds(view.nodes.icon!)).toEqual({ x: -270, y: -174, width: 24, height: 24 });
  });

  test('ungrouping a constrained instance leaves its parts where they were drawn', ({ expect }) => {
    const node = instance({ width: 576, height: 384 });
    const { edit } = ungroupInstance(scene, node, CARD, counter());
    const placed = edit(scene);
    const footer = Object.values(placed.nodes).find((candidate) => candidate.size.height === 18);
    expect(footer && nodeBounds(footer)).toMatchObject({ y: 192 - 12 - 18, height: 18 });
  });
});
