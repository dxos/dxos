//
// Copyright 2025 DXOS.org
//

import { S } from '@dxos/echo-schema';

import { ComputeNode, DEFAULT_OUTPUT } from '../compute-node';

//
// REDUCE
//

export const ReduceInput = S.mutable(S.Struct({ values: S.Array(S.Any) }));
type ReduceInput = S.Schema.Type<typeof ReduceInput>;

export const ReduceOutput = S.mutable(S.Struct({ [DEFAULT_OUTPUT]: S.Any }));
type ReduceOutput = S.Schema.Type<typeof ReduceOutput>;

export class Reduce extends ComputeNode<ReduceInput, ReduceOutput> {
  override readonly type = 'reduce';

  constructor() {
    super(ReduceInput, ReduceOutput);
  }

  override async invoke({ values }: ReduceInput) {
    return { [DEFAULT_OUTPUT]: values[0] };
  }
}
