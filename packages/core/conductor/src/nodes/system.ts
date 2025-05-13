//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { defineComputeNode, VoidInput, VoidOutput } from '../types';

export const NODE_INPUT = 'dxn:node:input';
export const NODE_OUTPUT = 'dxn:node:output';

export const inputNode = defineComputeNode({
  input: VoidInput,
  output: Schema.Record({ key: Schema.String, value: Schema.Any }),
});

export const outputNode = defineComputeNode({
  input: Schema.Record({ key: Schema.String, value: Schema.Any }),
  output: VoidOutput,
});
