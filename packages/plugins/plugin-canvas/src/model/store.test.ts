//
// Copyright 2026 DXOS.org
//

import * as Registry from 'effect/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';

import { clone, isNodeRecord, nodeKey, readScenes } from './content.ts';
import { parseLinkedSceneId } from './scene-node.ts';
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
  test('a linked scene shape opens the other drawing, and edits inside it are written there', async ({ expect }) => {
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
        node: { id: 'f', type: 'scene', z: 'a0', ...frame, scene: 'f', drawing: Ref.make(other) },
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
    // The shape opens the linked drawing's root, named after that drawing.
    expect(scenes.root.nodes.f).toMatchObject({ scene: linkedId });
    expect(scenes[linkedId].name).toBe('Other');

    // An edit inside the linked scene lands in the other drawing; this drawing keeps the shape's own child id.
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
        node: { id: 'f', type: 'scene', z: 'a0', ...frame, scene: 'f', drawing: Ref.make(self) },
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
});
