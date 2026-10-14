//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { isFrameNode } from '@dxos/react-ui-canvas/scene';

import { clone, isNodeRecord, nodeKey, readScenes } from './content.ts';
import { objectRef, parseLinkedSceneId } from './frame-node.ts';
import { bindCanvasStore, createCanvas } from './store.ts';

const frame = { center: { x: 0, y: 0 }, size: { width: 256, height: 128 } };

let builder: EchoTestBuilder;

beforeEach(async () => {
  builder = await new EchoTestBuilder().open();
});

afterEach(async () => {
  await builder.close();
});

describe('bindCanvasStore', () => {
  test('a frame on a canvas drawing opens it, and edits inside it are written there', async ({ expect }) => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Drawing.Drawing, Drawing.Canvas]);
    const otherCanvas = db.add(createCanvas());
    const other = db.add(Drawing.make({ name: 'Other', canvas: otherCanvas }));
    const canvas = db.add(createCanvas());
    db.add(Drawing.make({ name: 'Main', canvas }));
    Obj.update(canvas, (canvas) => {
      canvas.content['scene:f'] = { kind: 'scene', id: 'f' };
      canvas.content[nodeKey('f')] = {
        kind: 'node',
        scene: 'root',
        node: { id: 'f', type: 'frame', z: 'a0', ...frame, scene: 'f', object: Ref.make(other) },
      };
    });
    await db.flush();

    const registry = Registry.make();
    const bound = bindCanvasStore(registry, canvas);
    const linkedRoot = () =>
      Object.keys(registry.get(bound.store.scenes)).find((id) => parseLinkedSceneId(id)?.scene === 'root');
    await expect.poll(linkedRoot).toBeDefined();
    const linkedId = linkedRoot() ?? '';

    const scenes = registry.get(bound.store.scenes);
    // The frame opens the linked drawing's root, named after that drawing.
    expect(scenes.root.nodes.f).toMatchObject({ scene: linkedId });
    expect(scenes[linkedId].name).toBe('Other');

    // An edit inside the linked scene lands in the other drawing; this drawing keeps the frame's own child id.
    const added = { id: 'n', type: 'rect', z: 'a0', ...frame, label: 'Added' };
    registry.set(bound.store.scenes, {
      ...scenes,
      [linkedId]: { ...scenes[linkedId], nodes: { ...scenes[linkedId].nodes, n: added } },
    });
    expect(readScenes(clone(otherCanvas.content)).root.nodes.n).toMatchObject({ label: 'Added' });
    const record = canvas.content[nodeKey('f')];
    expect(isNodeRecord(record) && record.node).toMatchObject({ scene: 'f' });
    bound.dispose();
  });

  test('a linked drawing’s frame on a third drawing opens it, and an edit keeps the frame’s own child id', async ({
    expect,
  }) => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Drawing.Drawing, Drawing.Canvas]);
    const leafCanvas = db.add(createCanvas());
    const leaf = db.add(Drawing.make({ name: 'Leaf', canvas: leafCanvas }));
    const middleCanvas = db.add(createCanvas());
    const middle = db.add(Drawing.make({ name: 'Middle', canvas: middleCanvas }));
    const canvas = db.add(createCanvas());
    db.add(Drawing.make({ name: 'Main', canvas }));
    const frameOn = (id: string, object: Drawing.Drawing) => ({
      kind: 'node',
      scene: 'root',
      node: { id, type: 'frame', z: 'a1', ...frame, scene: id, object: Ref.make(object) },
    });
    Obj.update(middleCanvas, (middleCanvas) => {
      middleCanvas.content['scene:g'] = { kind: 'scene', id: 'g' };
      middleCanvas.content[nodeKey('g')] = frameOn('g', leaf);
    });
    Obj.update(canvas, (canvas) => {
      canvas.content['scene:f'] = { kind: 'scene', id: 'f' };
      canvas.content[nodeKey('f')] = frameOn('f', middle);
    });
    await db.flush();

    const registry = Registry.make();
    const bound = bindCanvasStore(registry, canvas);
    const nameOf = (id: string | undefined) => (id ? registry.get(bound.store.scenes)[id]?.name : undefined);
    // Main's frame opens Middle's root, and Middle's frame opens Leaf's.
    const middleFrame = () => {
      const scenes = registry.get(bound.store.scenes);
      const middleRoot = scenes.root.nodes.f;
      const inner = isFrameNode(middleRoot) ? scenes[middleRoot.scene]?.nodes.g : undefined;
      return inner && isFrameNode(inner) ? nameOf(inner.scene) : undefined;
    };
    await expect.poll(middleFrame).toBe('Leaf');

    // Writing Middle back leaves its frame on its own child scene, not on Leaf's.
    registry.set(bound.store.scenes, { ...registry.get(bound.store.scenes) });
    const record = middleCanvas.content[nodeKey('g')];
    expect(isNodeRecord(record) && record.node).toMatchObject({ scene: 'g' });

    // Pointing Middle's frame at another drawing through the store opens that drawing once the write settles.
    const other = db.add(Drawing.make({ name: 'Other', canvas: db.add(createCanvas()) }));
    const scenes = registry.get(bound.store.scenes);
    const middleRoot = scenes.root.nodes.f;
    const middleId = isFrameNode(middleRoot) ? middleRoot.scene : '';
    const inner = scenes[middleId].nodes.g;
    registry.set(bound.store.scenes, {
      ...scenes,
      [middleId]: {
        ...scenes[middleId],
        nodes: { ...scenes[middleId].nodes, g: { ...inner, object: Ref.make(other) } },
      },
    });
    await expect.poll(middleFrame).toBe('Other');
    bound.dispose();
  });

  test('a frame given a canvas drawing through the store opens it', async ({ expect }) => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Drawing.Drawing, Drawing.Canvas]);
    const other = db.add(Drawing.make({ name: 'Other', canvas: db.add(createCanvas()) }));
    const canvas = db.add(createCanvas());
    db.add(Drawing.make({ name: 'Main', canvas }));
    Obj.update(canvas, (canvas) => {
      canvas.content['scene:f'] = { kind: 'scene', id: 'f' };
      canvas.content[nodeKey('f')] = {
        kind: 'node',
        scene: 'root',
        node: { id: 'f', type: 'frame', z: 'a0', ...frame, scene: 'f' },
      };
    });
    await db.flush();

    const registry = Registry.make();
    const bound = bindCanvasStore(registry, canvas);
    // The properties panel picks the drawing: the edit reaches the canvas as the store's own write.
    const scenes = registry.get(bound.store.scenes);
    registry.set(bound.store.scenes, {
      ...scenes,
      root: { ...scenes.root, nodes: { ...scenes.root.nodes, f: { ...scenes.root.nodes.f, object: Ref.make(other) } } },
    });
    const shown = () => {
      const node = registry.get(bound.store.scenes).root.nodes.f;
      return isFrameNode(node) ? parseLinkedSceneId(node.scene)?.scene : undefined;
    };
    await expect.poll(shown).toBe('root');
    bound.dispose();
  });

  test('a drawing linked to itself keeps its own child scene', async ({ expect }) => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Drawing.Drawing, Drawing.Canvas]);
    const canvas = db.add(createCanvas());
    const self = db.add(Drawing.make({ name: 'Self', canvas }));
    Obj.update(canvas, (canvas) => {
      canvas.content['scene:f'] = { kind: 'scene', id: 'f' };
      canvas.content[nodeKey('f')] = {
        kind: 'node',
        scene: 'root',
        node: { id: 'f', type: 'frame', z: 'a0', ...frame, scene: 'f', object: Ref.make(self) },
      };
    });
    await db.flush();

    const registry = Registry.make();
    const bound = bindCanvasStore(registry, canvas);
    // Give the load a chance to resolve before checking that nothing was bound.
    await new Promise((resolve) => setTimeout(resolve, 100));
    const scenes = registry.get(bound.store.scenes);
    expect(Object.keys(scenes).some((id) => parseLinkedSceneId(id))).toBe(false);
    expect(scenes.root.nodes.f).toMatchObject({ scene: 'f' });
    bound.dispose();
  });

  test('a frame on any other object keeps its own child scene and reads the object as a live ref', async ({
    expect,
  }) => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Drawing.Drawing, Drawing.Canvas, TestSchema.Person]);
    const person = db.add(Obj.make(TestSchema.Person, { name: 'Alice' }));
    const canvas = db.add(createCanvas());
    db.add(Drawing.make({ name: 'Main', canvas }));
    Obj.update(canvas, (canvas) => {
      canvas.content['scene:f'] = { kind: 'scene', id: 'f' };
      canvas.content[nodeKey('f')] = {
        kind: 'node',
        scene: 'root',
        node: { id: 'f', type: 'frame', z: 'a0', ...frame, scene: 'f', object: Ref.make(person), role: 'section' },
      };
    });
    await db.flush();

    const registry = Registry.make();
    const bound = bindCanvasStore(registry, canvas);
    // Give the load a chance to resolve before checking that nothing was bound.
    await new Promise((resolve) => setTimeout(resolve, 100));
    const scenes = registry.get(bound.store.scenes);
    expect(Object.keys(scenes).some((id) => parseLinkedSceneId(id))).toBe(false);
    const node = scenes.root.nodes.f;
    expect(node).toMatchObject({ scene: 'f', role: 'section' });
    expect(await objectRef(node)?.load()).toBe(person);
    bound.dispose();
  });

  test('style classes are kept beside the scenes, both ways', async ({ expect }) => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Drawing.Drawing, Drawing.Canvas]);
    const canvas = db.add(createCanvas());
    const registry = Registry.make();
    const bound = bindCanvasStore(registry, canvas);
    const { styles } = bound.store;
    expect(styles && registry.get(styles)).toEqual({});

    // A class made in the view is written to the canvas.
    const warning = { id: 'warn', name: 'Warning', style: { hue: 'red' } };
    if (styles) {
      registry.set(styles, { warn: warning });
    }
    expect(clone(canvas.styles)).toEqual({ warn: warning });

    // A class changed in the canvas (a peer's edit) reaches the view.
    Obj.update(canvas, (canvas) => {
      canvas.styles = { warn: { ...warning, name: 'Alert' } };
    });
    await expect.poll(() => styles && registry.get(styles).warn?.name).toBe('Alert');
    bound.dispose();
  });
});
