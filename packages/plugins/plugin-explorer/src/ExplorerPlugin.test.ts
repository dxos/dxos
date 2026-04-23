//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ExplorerPlugin } from './ExplorerPlugin';

describe('ExplorerPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(ExplorerPlugin.meta).toBeDefined();
    expect(ExplorerPlugin.meta.id).toBeTypeOf('string');
  });
});
