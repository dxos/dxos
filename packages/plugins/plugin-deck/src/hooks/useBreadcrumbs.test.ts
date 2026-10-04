//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ancestorPaths } from './useBreadcrumbs.ts';

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
