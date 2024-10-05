//
// Copyright 2024 DXOS.org
//

import { describe, test, expect } from 'vitest';

import { HyperFormula } from '#hyperformula';

describe('hyperformula', () => {
  test('import bundle', async () => {
    const hf = HyperFormula.buildEmpty({ licenseKey: 'gpl-v3' });
    expect(hf).to.exist;
  });
});
