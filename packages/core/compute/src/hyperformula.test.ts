//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { HyperFormula } from '@dxos/vendor-hyperformula';

describe('hyperformula', () => {
  test('sanity test', async () => {
    const hf = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' });
    expect(hf).to.exist;
  });
});
