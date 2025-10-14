//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { BaseGraphEdge, BaseGraphNode } from '@dxos/graph';

import { createGptCircuit } from './testing';

export const Shape = Schema.extend(
  BaseGraphNode,
  Schema.Struct({
    text: Schema.optional(Schema.String),
    guide: Schema.optional(Schema.Boolean),
    classNames: Schema.optional(Schema.String),
  }),
);

export const Connection = Schema.extend(
  BaseGraphEdge,
  Schema.Struct({
    input: Schema.optional(Schema.String),
    output: Schema.optional(Schema.String),
  }),
);

describe('Compute Graph JSON encoding', () => {
  test('compute graph toJSON', async ({ expect }) => {
    const model = createGptCircuit({ db: true, artifact: true, cot: true });
    const json = JSON.stringify(model.graph, null, 2);
    expect(json).to.exist;
  });
});
