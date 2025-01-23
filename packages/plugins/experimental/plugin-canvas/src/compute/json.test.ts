//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { createTest3 } from './testing';

describe('Compute Graph JSON encoding', () => {
  test('compute graph toJSON', async ({ expect }) => {
    const model = createTest3({ db: true, artifact: true, cot: true });
    const json = JSON.stringify(model.graph, null, 2);
    expect(json).to.exist;
  });
});
