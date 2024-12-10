//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { type Graph } from './graph';

describe('Graph', () => {
  test('basics', ({ expect }) => {
    const graph: Graph = {};
    expect(graph).to.deep.eq({});
  });
});
