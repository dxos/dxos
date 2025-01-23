//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { S } from '@dxos/echo-schema';
import { BaseGraphEdge, BaseGraphNode } from '@dxos/graph';

import { createTest3 } from './testing';

export const Shape = S.extend(
  BaseGraphNode,
  S.Struct({
    text: S.optional(S.String),
    guide: S.optional(S.Boolean),
    classNames: S.optional(S.String),
  }),
);

export const Connection = S.extend(
  BaseGraphEdge,
  S.Struct({
    input: S.optional(S.String),
    output: S.optional(S.String),
  }),
);

describe('Compute Graph JSON encoding', () => {
  test('compute graph toJSON', async ({ expect }) => {
    const model = createTest3({ db: true, artifact: true, cot: true });
    const json = JSON.stringify(model.graph, null, 2);
    expect(json).to.exist;
  });
});
