//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { isEllipseNode, isNoteNode, isRectNode, isViewNode } from '@dxos/scene';

import { DEFAULT_LAYER } from '../utils/index.ts';
import { ViewBuilder } from './builder.ts';

const box = (x: number, y: number) => ({ x, y, width: 200, height: 100 });

describe('ViewBuilder', () => {
  test('writes typed nodes and links from top-left boxes and port refs, in paint order', ({ expect }) => {
    const { root, views } = ViewBuilder.view('s', [
      ViewBuilder.rect('a', box(0, 0)).properties({ label: 'A' }),
      ViewBuilder.ellipse('b', box(400, 0)).properties({ label: 'B' }),
      ViewBuilder.note('c', { x: 0, y: 300, width: 200, height: 150 }).properties({ style: { hue: 'teal' } }),
      ViewBuilder.link('line', 'a#e2', 'b#w2'),
      ViewBuilder.link('spline', 'b', 'c').properties({ points: [{ x: 300, y: 250 }] }),
      ViewBuilder.link('line', '@10,20', 'a')
        .id('free')
        .properties({ ends: { start: 'circle', end: 'arrow' } }),
    ])
      .name('Sample')
      .build();

    expect(root).toBe('s');
    const [scene] = views;
    expect(scene.name).toBe('Sample');
    expect(Object.keys(scene.nodes)).toEqual(['a', 'b', 'c']);
    expect(scene.nodes.a.center).toEqual({ x: 100, y: 50 });
    expect(isEllipseNode(scene.nodes.b) && scene.nodes.b.size).toEqual({ width: 200, height: 100 });
    expect(scene.nodes.c.style).toEqual({ hue: 'teal' });
    // A note keeps its type's default text where the fixture does not set it.
    expect(isNoteNode(scene.nodes.c) && scene.nodes.c.text).toEqual('Note');
    expect(scene.links['a-b'].source).toEqual({ node: 'a', port: 'e2' });
    expect(scene.links['a-b'].target).toEqual({ node: 'b', port: 'w2' });
    expect(scene.links['b-c'].type === 'spline' && scene.links['b-c'].points).toEqual([{ x: 300, y: 250 }]);
    expect(scene.links.free.source).toEqual({ point: { x: 10, y: 20 } });
    expect(scene.links.free.ends).toEqual({ start: 'circle', end: 'arrow' });
    const zs = [scene.nodes.a.z, scene.nodes.b.z, scene.nodes.c.z, scene.links['a-b'].z, scene.links['b-c'].z];
    expect([...zs].sort()).toEqual(zs);
  });

  test('properties merge, style key by key, and an element is reused unchanged', ({ expect }) => {
    const orange = ViewBuilder.rect('a', box(0, 0)).properties({ style: { hue: 'orange' } });
    const { views } = ViewBuilder.view('s', [
      orange.properties({ label: 'A', style: { rounded: true } }),
      ViewBuilder.link('smart', 'a', 'a'),
      ViewBuilder.link('smart', 'a', 'a'),
    ]).build();
    const [scene] = views;
    expect(isRectNode(scene.nodes.a) && scene.nodes.a.label).toBe('A');
    expect(scene.nodes.a.style).toEqual({ hue: 'orange', rounded: true });
    expect(orange.node.label).toBeUndefined();
    // Links with the same ends take distinct ids.
    expect(Object.keys(scene.links)).toEqual(['a-a', 'a-a-2']);
  });

  test('a nested scene is a scene shape and its child scene, sharing its id', ({ expect }) => {
    const { root, views } = ViewBuilder.view('root', [
      ViewBuilder.view('f', [ViewBuilder.rect('f1', box(0, 0))])
        .name('F')
        .at(box(400, 0))
        .properties({ label: 'Inner' }),
    ]).build();
    expect(root).toBe('root');
    expect(views.map((scene) => scene.id)).toEqual(['root', 'f']);
    const portal = views[0].nodes.f;
    expect(isViewNode(portal) && [portal.scene, portal.label, portal.center]).toEqual([
      'f',
      'Inner',
      { x: 500, y: 50 },
    ]);
    expect(views[1].name).toBe('F');
    expect(Object.keys(views[1].nodes)).toEqual(['f1']);
    expect(() => ViewBuilder.view('root', [ViewBuilder.view('f')]).build()).toThrow(/needs a box/);
  });

  test('every scene has the default layer, and every element is on it', ({ expect }) => {
    const { views } = ViewBuilder.view('root', [
      ViewBuilder.rect('a', box(0, 0)),
      ViewBuilder.rect('b', box(400, 0)).properties({ layer: 'top' }),
      ViewBuilder.link('line', 'a', 'b').id('ab'),
      ViewBuilder.view('f', [ViewBuilder.rect('f1', box(0, 0))]).at(box(0, 200)),
    ]).build();
    for (const scene of views) {
      expect(scene.layers).toEqual({ [DEFAULT_LAYER.id]: DEFAULT_LAYER });
    }
    expect([views[0].nodes.a.layer, views[0].nodes.f.layer, views[0].links.ab.layer]).toEqual([
      DEFAULT_LAYER.id,
      DEFAULT_LAYER.id,
      DEFAULT_LAYER.id,
    ]);
    // A layer the fixture names is kept.
    expect(views[0].nodes.b.layer).toBe('top');
    expect(views[1].nodes.f1.layer).toBe(DEFAULT_LAYER.id);
  });

  test('two elements with one id fail the build', ({ expect }) => {
    const rect = ViewBuilder.rect('a', box(0, 0));
    expect(() => ViewBuilder.view('s', [rect, rect]).build()).toThrow(/Duplicate id a in view s/);
    const link = ViewBuilder.link('line', 'a', 'a').id('l');
    expect(() => ViewBuilder.view('s', [rect, link, link]).build()).toThrow(/Duplicate id l/);
    // An explicit id that repeats one already generated clashes too.
    const generated = ViewBuilder.link('line', 'a', 'a');
    expect(() => ViewBuilder.view('s', [rect, generated, generated.id('a-a')]).build()).toThrow(/Duplicate id a-a/);
  });

  test('an id an object inherits is not taken, and any id is kept', ({ expect }) => {
    const rect = ViewBuilder.rect('constructor', box(0, 0));
    const proto = ViewBuilder.rect('__proto__', box(0, 0));
    const link = ViewBuilder.link('line', 'constructor', '__proto__').id('toString');
    const [scene] = ViewBuilder.view('s', [rect, proto, link]).build().views;
    expect(Object.keys(scene.nodes)).toEqual(['constructor', '__proto__']);
    expect(Object.keys(scene.links)).toEqual(['toString']);
  });

  test('a node its type does not describe fails the build', ({ expect }) => {
    const host = ViewBuilder.node('rect', 'a', box(0, 0)).properties({ portsPerSide: 2 });
    expect(() => ViewBuilder.view('s', [host]).build()).not.toThrow();
    const typo = ViewBuilder.node('custom', 'x', box(0, 0)).properties({ lable: 'X' });
    // Unknown to the registry: nothing to check it against.
    expect(() => ViewBuilder.view('s', [typo]).build()).not.toThrow();
    // Typed as any string, the way a host's own type name arrives, so the misspelling reaches the schema.
    const rect: string = 'rect';
    const wrong = ViewBuilder.node(rect, 'b', box(0, 0)).properties({ lable: 'B' });
    expect(() => ViewBuilder.view('s', [wrong]).build()).toThrow(/not a valid rect/);
  });
});
