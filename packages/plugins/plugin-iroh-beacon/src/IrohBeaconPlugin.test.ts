//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { IrohBeaconPlugin } from './IrohBeaconPlugin';

describe('IrohBeaconPlugin', () => {
  test('factory exposes meta', ({ expect }) => {
    expect(IrohBeaconPlugin.meta).toBeDefined();
    expect(IrohBeaconPlugin.meta.id).toBeTypeOf('string');
  });
});
