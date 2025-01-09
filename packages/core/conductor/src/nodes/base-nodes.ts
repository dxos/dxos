//
// Copyright 2025 DXOS.org
//

import { Schema as S } from '@effect/schema';

import { defineComputeNode } from '../schema';

export const inputNode = defineComputeNode({
  input: S.Struct({}),
  output: S.Record({ key: S.String, value: S.Any }),
});

export const outputNode = defineComputeNode({
  input: S.Record({ key: S.String, value: S.Any }),
  output: S.Struct({}),
});
