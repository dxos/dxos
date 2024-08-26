//
// Copyright 2024 DXOS.org
//

import { expect } from 'chai';
import { describe, test } from 'vitest';

import { createComputeGraph } from './graph';

/**
 * VITEST_ENV=chrome p vitest --watch
 * NOTE: Browser test required for hyperformula due to raw translation files.
 */
describe('compute graph', () => {
  test('graph', async () => {
    const graph = createComputeGraph();
    expect(graph).to.exist;
  });
});
