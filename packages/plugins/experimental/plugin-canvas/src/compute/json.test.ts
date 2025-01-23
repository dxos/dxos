//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { createTest3 } from './testing';

describe('Compute Graph JSON encoding', () => {
  test('compute graph toJSON', async () => {
    const model = createTest3({ db: true, artifact: true, cot: true });
    const json = JSON.stringify(model.graph, null, 2);
    console.log(json);
    // expect(json).to.deep.equal({
    //   graph: {
    //     nodes: 4,
    //     edges: 3,
    //   },
    // });
  });
});
