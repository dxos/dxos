//
// Copyright 2024 DXOS.org
//

import { describe, test, expect } from 'vitest';

import { HyperFormula } from '#hyperformula';

describe('hyperformula', () => {
  test('sanity', async () => {
    // TODO(burdon): Throws "Cannot convert undefined or null to object" in vitest (without browser).
    const hf = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' });
    expect(hf).to.exist;
  });
});
