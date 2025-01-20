//
// Copyright 2025 DXOS.org
//

import { Schema as S } from '@effect/schema';

import { defineComputeNode, VoidInput, VoidOutput } from '../types';

export const inputNode = defineComputeNode({
  input: VoidInput,
  output: S.Record({ key: S.String, value: S.Any }),
});

export const outputNode = defineComputeNode({
  input: S.Record({ key: S.String, value: S.Any }),
  output: VoidOutput,
});
