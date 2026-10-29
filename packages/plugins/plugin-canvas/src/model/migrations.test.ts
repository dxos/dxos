//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Filter, Migration } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';

import { Canvas } from '#types';

import { clone } from './content.ts';
import { SceneMigrations, sceneV1ToV2 } from './migrations.ts';

const box = { center: { x: 0, y: 0 }, size: { width: 256, height: 128 } };

/** A canvas as stored at `dxos.org/scene/1`, with one of each legacy record shape. */
const legacyContent = {
  'canvas': { kind: 'canvas', root: 'scene:root' },
  'scene:scene:root': { kind: 'scene', id: 'scene:root' },
  'scene:child': { kind: 'scene', id: 'child' },
  'node:p': { kind: 'node', scene: 'scene:root', node: { id: 'p', type: 'polygon', z: 'a0', ...box, sides: 6 } },
  'node:f': {
    kind: 'node',
    scene: 'scene:root',
    node: { id: 'f', type: 'frame', z: 'a1', ...box, scene: 'child', contents: true, role: 'section', opacity: 0.5 },
  },
  'node:c': { kind: 'node', scene: 'child', node: { id: 'c', type: 'rect', z: 'a0', ...box, label: 'Current' } },
  'link:p-f': {
    kind: 'link',
    scene: 'scene:root',
    link: {
      id: 'p-f',
      type: 'line',
      z: 'a2',
      source: { node: 'p' },
      target: { node: 'f' },
      directed: true,
      line: { hue: 'red', dash: 'dashed' },
    },
  },
};

let builder: EchoTestBuilder;

beforeEach(async () => {
  builder = await new EchoTestBuilder().open();
});

afterEach(async () => {
  await builder.close();
});

describe('dxos.org/scene/1 -> dxos.org/scene/2', () => {
  test('a stored version-1 canvas is migrated to version 2 in the current shape', async ({ expect }) => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Drawing.Drawing, Drawing.Canvas]);
    db.add(Drawing.makeCanvas({ schema: Canvas.SCENE_SCHEMA_V1, content: clone(legacyContent) }));
    await db.flush();

    await db.runMigrations([...SceneMigrations]);

    const [canvas] = await db.query(Filter.type(Drawing.Canvas)).run();
    expect(canvas.schema).toBe(Canvas.SCENE_SCHEMA);
    const content = clone(canvas.content);
    expect(content.canvas).toEqual({ kind: 'canvas', root: 'root' });
    expect(content['scene:scene:root']).toBeUndefined();
    expect(content['scene:root']).toEqual({ kind: 'scene', id: 'root' });
    expect(content['node:p']).toEqual({
      kind: 'node',
      scene: 'root',
      node: { id: 'p', type: 'polygon', z: 'a0', ...box, params: { sides: 6 } },
    });
    expect(content['node:f']).toEqual({
      kind: 'node',
      scene: 'root',
      node: {
        id: 'f',
        type: 'view',
        z: 'a1',
        ...box,
        scene: 'child',
        style: { opacity: 0.5 },
        link: { role: 'section', contents: true },
      },
    });
    expect(content['node:c']).toEqual(legacyContent['node:c']);
    expect(content['link:p-f']).toEqual({
      kind: 'link',
      scene: 'root',
      link: {
        id: 'p-f',
        type: 'line',
        z: 'a2',
        source: { node: 'p' },
        target: { node: 'f' },
        ends: { end: 'arrow' },
        style: { hue: 'red', lineStyle: 'dashed' },
      },
    });

    // Migrated content matches no step, so a second pass writes nothing.
    await db.runMigrations([...SceneMigrations]);
    expect(clone(canvas.content)).toEqual(content);
  });

  test('a reader upgrades version-1 content in memory through the same step', ({ expect }) => {
    const { version, content } = Migration.upgradeContent(SceneMigrations, Drawing.Canvas, Canvas.SCENE_SCHEMA_V1, {
      content: clone(legacyContent),
    });
    expect(version).toBe(Canvas.SCENE_SCHEMA);
    expect(content).toEqual(sceneV1ToV2.transform({ content: clone(legacyContent) }));
    expect(Migration.upgradeContent(SceneMigrations, Drawing.Canvas, Canvas.SCENE_SCHEMA, content).content).toBe(
      content,
    );
  });

  test('the scene schema matches every revision of the format', ({ expect }) => {
    expect(Canvas.isSceneSchema(Canvas.SCENE_SCHEMA_V1)).toBe(true);
    expect(Canvas.isSceneSchema(Canvas.SCENE_SCHEMA)).toBe(true);
    expect(Canvas.isSceneSchema(Canvas.TLDRAW_SCHEMA)).toBe(false);
    expect(Drawing.isSameFormat(Canvas.SCENE_SCHEMA, Canvas.SCENE_SCHEMA_V1)).toBe(true);
    expect(Drawing.isSameFormat(Canvas.SCENE_SCHEMA, Canvas.TLDRAW_SCHEMA)).toBe(false);
  });
});
