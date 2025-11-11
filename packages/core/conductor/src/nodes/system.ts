//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { VoidInput, VoidOutput, defineComputeNode } from '../types';

export const NODE_INPUT = 'dxn:node:input';
export const NODE_OUTPUT = 'dxn:node:output';

export const inputNode = defineComputeNode({
  type: NODE_INPUT,
  input: VoidInput,
  output: Schema.Record({ key: Schema.String, value: Schema.Any }),
});

export const outputNode = defineComputeNode({
  type: NODE_OUTPUT,
  input: Schema.Record({ key: Schema.String, value: Schema.Any }),
  output: VoidOutput,
});
