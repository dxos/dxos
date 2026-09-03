//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { VoidInput, VoidOutput, defineComputeNode } from '../types/index.ts';

export const NODE_INPUT = 'dxn:node:input';
export const NODE_OUTPUT = 'dxn:node:output';

export const inputNode = defineComputeNode({
  input: VoidInput,
  output: Schema.Record(Schema.String, Schema.Any),
});

export const outputNode = defineComputeNode({
  input: Schema.Record(Schema.String, Schema.Any),
  output: VoidOutput,
});
