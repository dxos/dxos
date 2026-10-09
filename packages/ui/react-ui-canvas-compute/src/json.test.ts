//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';
import { describe, test } from 'vitest';

import * as GraphEdge from '@dxos/graph/GraphEdge';
import * as GraphNode from '@dxos/graph/GraphNode';

import { createGptCircuit } from './testing/index.ts';

export const Shape = GraphNode.GraphNode.mapFields(
  Struct.assign({
    text: Schema.optional(Schema.String),
    guide: Schema.optional(Schema.Boolean),
    classNames: Schema.optional(Schema.String),
  }),
);

export const Connection = GraphEdge.GraphEdge.mapFields(
  Struct.assign({
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
