//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type ContentMap } from '@dxos/diagram';

import {
  ROOT_SCENE_ID,
  canvasRecordOf,
  deleteStyleClass,
  hasLegacyRoot,
  migrateContent,
  readScenes,
  rootOf,
  seedContent,
  styleClassUses,
  updateCanvasRecord,
  writeScenes,
} from './content.ts';

const box = { z: 'a0', center: { x: 0, y: 0 }, size: { width: 256, height: 128 } };

describe('content', () => {
  test('a new canvas keys its root scene once: `scene:root`', ({ expect }) => {
    const content: ContentMap = {};
    expect(seedContent(content)).toBe('root');
    expect(Object.keys(content).sort()).toEqual(['canvas', 'scene:root']);
  });

  test('a canvas saved with the legacy root id is renamed in place', ({ expect }) => {
    const content: ContentMap = {
      'canvas': { kind: 'canvas', root: 'scene:root' },
      'scene:scene:root': { kind: 'scene', id: 'scene:root', name: 'Root' },
      'scene:f': { kind: 'scene', id: 'f' },
      'node:a': { kind: 'node', scene: 'scene:root', node: { id: 'a', type: 'rect', ...box } },
      'node:f': { kind: 'node', scene: 'scene:root', node: { id: 'f', type: 'scene', scene: 'f', ...box } },
      // A shape in a nested scene that shows the root itself.
      'node:up': { kind: 'node', scene: 'f', node: { id: 'up', type: 'scene', scene: 'scene:root', ...box } },
      'link:a-f': {
        kind: 'link',
        scene: 'scene:root',
        link: { id: 'a-f', type: 'line', z: 'a1', source: { node: 'a' }, target: { node: 'f' } },
      },
    };
    expect(hasLegacyRoot(content)).toBe(true);
    expect(migrateContent(content)).toBe(true);
    expect(hasLegacyRoot(content)).toBe(false);
    expect(rootOf(content)).toBe(ROOT_SCENE_ID);
    expect(content['scene:scene:root']).toBeUndefined();
    expect(content['scene:root']).toEqual({ kind: 'scene', id: 'root', name: 'Root' });

    const scenes = readScenes(content);
    expect(Object.keys(scenes[ROOT_SCENE_ID].nodes).sort()).toEqual(['a', 'f']);
    expect(Object.keys(scenes[ROOT_SCENE_ID].links)).toEqual(['a-f']);
    expect(scenes.f.nodes.up).toMatchObject({ scene: 'root' });
    // Already migrated: nothing more to do.
    expect(migrateContent(content)).toBe(false);
  });

  test('the drawing settings live on the canvas record and survive scene writes', ({ expect }) => {
    const content: ContentMap = {};
    seedContent(content);
    updateCanvasRecord(content, { lattice: true, grid: 24 });
    writeScenes(content, readScenes(content));
    expect(canvasRecordOf(content)).toEqual({ kind: 'canvas', root: ROOT_SCENE_ID, lattice: true, grid: 24 });
    // An unset value removes its key rather than storing `undefined`.
    updateCanvasRecord(content, { grid: undefined });
    expect(canvasRecordOf(content)).toEqual({ kind: 'canvas', root: ROOT_SCENE_ID, lattice: true });
  });

  test('a link saved with a line reads it as its style', ({ expect }) => {
    const content: ContentMap = {};
    seedContent(content);
    content['link:l'] = {
      kind: 'link',
      scene: ROOT_SCENE_ID,
      link: {
        type: 'line',
        id: 'l',
        z: 'a',
        source: { point: { x: 0, y: 0 } },
        target: { point: { x: 1, y: 0 } },
        line: { hue: 'red', dash: 'dotted' },
      },
    };
    const link = readScenes(content)[ROOT_SCENE_ID].links.l;
    expect(link.style).toEqual({ hue: 'red', lineStyle: 'dotted' });
    expect('line' in link).toBe(false);
  });

  test('a link saved as directed reads as an arrow at its end', ({ expect }) => {
    const content: ContentMap = {};
    seedContent(content);
    content['link:l'] = {
      kind: 'link',
      scene: ROOT_SCENE_ID,
      link: {
        type: 'line',
        id: 'l',
        z: 'a',
        source: { point: { x: 0, y: 0 } },
        target: { point: { x: 1, y: 0 } },
        directed: true,
      },
    };
    const link = readScenes(content)[ROOT_SCENE_ID].links.l;
    expect(link.ends).toEqual({ end: 'arrow' });
    expect('directed' in link).toBe(false);
  });

  test('a deleted style class leaves its look on the elements that took it', ({ expect }) => {
    const frame = { center: { x: 0, y: 0 }, size: { width: 256, height: 128 } };
    const content: ContentMap = {};
    seedContent(content);
    const node = (id: string, values: object) => ({
      kind: 'node',
      scene: ROOT_SCENE_ID,
      node: { id, type: 'rect', z: 'a0', ...frame, ...values },
    });
    content['node:a'] = node('a', { class: 'warn', style: { rounded: true } });
    content['node:b'] = node('b', { class: 'warn' });
    content['node:c'] = node('c', {});
    content['link:l'] = {
      kind: 'link',
      scene: ROOT_SCENE_ID,
      link: { id: 'l', type: 'line', z: 'a0', source: { node: 'a' }, target: { node: 'b' }, class: 'warn' },
    };
    const styles: Record<string, unknown> = {
      warn: { id: 'warn', name: 'Warning', style: { hue: 'red', lineStyle: 'dashed', rounded: true } },
    };
    expect(styleClassUses(content)).toEqual({ warn: 3 });

    deleteStyleClass(content, styles, 'warn');
    expect(styles).toEqual({});
    expect(styleClassUses(content)).toEqual({});
    const { nodes, links } = readScenes(content)[ROOT_SCENE_ID];
    expect(nodes.a.style).toEqual({ hue: 'red', lineStyle: 'dashed', rounded: true });
    expect(nodes.b.style).toEqual({ hue: 'red', lineStyle: 'dashed', rounded: true });
    expect(nodes.c.style).toBeUndefined();
    // A link keeps only the common base of the class's style.
    expect(links.l.style).toEqual({ hue: 'red', lineStyle: 'dashed' });
  });
});
