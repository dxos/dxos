//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { FilesPlugin } from './FilesPlugin';

describe('FilesPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(FilesPlugin.meta).toBeDefined();
    expect(FilesPlugin.meta.id).toBeTypeOf('string');
  });
});
