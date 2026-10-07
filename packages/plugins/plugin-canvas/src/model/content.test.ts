//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type ContentMap } from '@dxos/diagram';

import { ROOT_SCENE_ID, hasLegacyRoot, migrateContent, readScenes, rootOf, seedContent } from './content.ts';

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
});
