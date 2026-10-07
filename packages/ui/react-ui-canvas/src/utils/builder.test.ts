//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { isClassNode, isEllipseNode, isPortalNode, isRectNode } from '../model/types.ts';
import { SceneBuilder } from './builder.ts';

const box = (x: number, y: number) => ({ x, y, width: 200, height: 100 });

describe('SceneBuilder', () => {
  test('writes typed nodes and links from top-left boxes and port refs, in paint order', ({ expect }) => {
    const { root, scenes } = SceneBuilder.scene('s', [
      SceneBuilder.rect('a', box(0, 0)).properties({ label: 'A' }),
      SceneBuilder.ellipse('b', box(400, 0)).properties({ label: 'B' }),
      SceneBuilder.class('c', { x: 0, y: 300, width: 200, height: 150 }).properties({
        name: 'C',
        attributes: ['id: string'],
      }),
      SceneBuilder.link('line', 'a#e2', 'b#w2'),
      SceneBuilder.link('spline', 'b', 'c').properties({ points: [{ x: 300, y: 250 }] }),
      SceneBuilder.link('line', '@10,20', 'a')
        .id('free')
        .properties({ ends: { start: 'circle', end: 'arrow' } }),
    ])
      .name('Sample')
      .build();

    expect(root).toBe('s');
    const [scene] = scenes;
    expect(scene.name).toBe('Sample');
    expect(Object.keys(scene.nodes)).toEqual(['a', 'b', 'c']);
    expect(scene.nodes.a.center).toEqual({ x: 100, y: 50 });
    expect(isEllipseNode(scene.nodes.b) && scene.nodes.b.size).toEqual({ width: 200, height: 100 });
    expect(isClassNode(scene.nodes.c) && scene.nodes.c.attributes).toEqual(['id: string']);
    // A class keeps its type's default methods where the fixture does not set them.
    expect(isClassNode(scene.nodes.c) && scene.nodes.c.methods).toEqual(['save(): void']);
    expect(scene.links['a-b'].source).toEqual({ node: 'a', port: 'e2' });
    expect(scene.links['a-b'].target).toEqual({ node: 'b', port: 'w2' });
    expect(scene.links['b-c'].type === 'spline' && scene.links['b-c'].points).toEqual([{ x: 300, y: 250 }]);
    expect(scene.links.free.source).toEqual({ point: { x: 10, y: 20 } });
    expect(scene.links.free.ends).toEqual({ start: 'circle', end: 'arrow' });
    const zs = [scene.nodes.a.z, scene.nodes.b.z, scene.nodes.c.z, scene.links['a-b'].z, scene.links['b-c'].z];
    expect([...zs].sort()).toEqual(zs);
  });

  test('properties merge, style key by key, and an element is reused unchanged', ({ expect }) => {
    const orange = SceneBuilder.rect('a', box(0, 0)).properties({ style: { hue: 'orange' } });
    const { scenes } = SceneBuilder.scene('s', [
      orange.properties({ label: 'A', style: { rounded: true } }),
      SceneBuilder.link('smart', 'a', 'a'),
      SceneBuilder.link('smart', 'a', 'a'),
    ]).build();
    const [scene] = scenes;
    expect(isRectNode(scene.nodes.a) && scene.nodes.a.label).toBe('A');
    expect(scene.nodes.a.style).toEqual({ hue: 'orange', rounded: true });
    expect(orange.node.label).toBeUndefined();
    // Links with the same ends take distinct ids.
    expect(Object.keys(scene.links)).toEqual(['a-a', 'a-a-2']);
  });

  test('a nested scene is a scene shape and its child scene, sharing its id', ({ expect }) => {
    const { root, scenes } = SceneBuilder.scene('root', [
      SceneBuilder.scene('f', [SceneBuilder.rect('f1', box(0, 0))])
        .name('F')
        .at(box(400, 0))
        .properties({ label: 'Inner' }),
    ]).build();
    expect(root).toBe('root');
    expect(scenes.map((scene) => scene.id)).toEqual(['root', 'f']);
    const portal = scenes[0].nodes.f;
    expect(isPortalNode(portal) && [portal.scene, portal.label, portal.center]).toEqual([
      'f',
      'Inner',
      { x: 500, y: 50 },
    ]);
    expect(scenes[1].name).toBe('F');
    expect(Object.keys(scenes[1].nodes)).toEqual(['f1']);
    expect(() => SceneBuilder.scene('root', [SceneBuilder.scene('f')]).build()).toThrow(/needs a frame/);
  });

  test('two elements with one id fail the build', ({ expect }) => {
    const rect = SceneBuilder.rect('a', box(0, 0));
    expect(() => SceneBuilder.scene('s', [rect, rect]).build()).toThrow(/Duplicate id a in scene s/);
    const link = SceneBuilder.link('line', 'a', 'a').id('l');
    expect(() => SceneBuilder.scene('s', [rect, link, link]).build()).toThrow(/Duplicate id l/);
    // An explicit id that repeats one already generated clashes too.
    const generated = SceneBuilder.link('line', 'a', 'a');
    expect(() => SceneBuilder.scene('s', [rect, generated, generated.id('a-a')]).build()).toThrow(/Duplicate id a-a/);
  });

  test('a node its type does not describe fails the build', ({ expect }) => {
    const host = SceneBuilder.node('rect', 'a', box(0, 0)).properties({ portsPerSide: 2 });
    expect(() => SceneBuilder.scene('s', [host]).build()).not.toThrow();
    const typo = SceneBuilder.node('custom', 'x', box(0, 0)).properties({ lable: 'X' });
    // Unknown to the registry: nothing to check it against.
    expect(() => SceneBuilder.scene('s', [typo]).build()).not.toThrow();
    // Typed as any string, the way a host's own type name arrives, so the misspelling reaches the schema.
    const rect: string = 'rect';
    const wrong = SceneBuilder.node(rect, 'b', box(0, 0)).properties({ lable: 'B' });
    expect(() => SceneBuilder.scene('s', [wrong]).build()).toThrow(/not a valid rect/);
  });
});
