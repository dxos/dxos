//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';

import { ancestorPaths, trailPaths } from './useBreadcrumbs.ts';

describe('ancestorPaths', () => {
  test('lists every ancestor path, outermost first, excluding the node itself', ({ expect }) => {
    expect(ancestorPaths('root/space/ai/project-type/project/sessions/session')).toEqual([
      'root',
      'root/space',
      'root/space/ai',
      'root/space/ai/project-type',
      'root/space/ai/project-type/project',
      'root/space/ai/project-type/project/sessions',
    ]);
  });

  test('a top-level node has only the root above it', ({ expect }) => {
    expect(ancestorPaths('root/space')).toEqual(['root']);
    expect(ancestorPaths('root')).toEqual([]);
  });
});

describe('trailPaths', () => {
  const paths = ['root', 'root/space', 'root/space/project', 'root/space/project/spec'];
  const branch = (id: string, selectable?: boolean) => ({ data: id, properties: { selectable } });
  const object = { data: Obj.make(TestSchema.Person, { name: 'Ada' }), properties: {} };

  test('starts at the first object and leaves out nodes that cannot be opened', ({ expect }) => {
    expect(trailPaths(paths, [branch('root'), branch('space'), object, branch('spec', false)])).toEqual([
      'root/space/project',
    ]);
    expect(trailPaths(paths, [branch('root'), branch('space'), object, branch('spec')])).toEqual([
      'root/space/project',
      'root/space/project/spec',
    ]);
  });

  test('is undefined when no ancestor holds an object', ({ expect }) => {
    expect(trailPaths(paths, [branch('root'), branch('space'), undefined, branch('spec')])).toBeUndefined();
  });
});
