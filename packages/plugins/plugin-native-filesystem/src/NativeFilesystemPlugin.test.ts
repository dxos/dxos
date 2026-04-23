//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { NativeFilesystemPlugin } from './NativeFilesystemPlugin';

describe('NativeFilesystemPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(NativeFilesystemPlugin.meta).toBeDefined();
    expect(NativeFilesystemPlugin.meta.id).toBeTypeOf('string');
  });
});
