//
// Copyright 2025 DXOS.org
//

import { Schema as S } from 'effect';

import { defineComputeNode, VoidInput, VoidOutput } from '../types';

export const NODE_INPUT = 'dxn:node:input';
export const NODE_OUTPUT = 'dxn:node:output';

export const inputNode = defineComputeNode({
  input: VoidInput,
  output: S.Record({ key: S.String, value: S.Any }),
});

export const outputNode = defineComputeNode({
  input: S.Record({ key: S.String, value: S.Any }),
  output: VoidOutput,
});
