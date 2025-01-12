//
// Copyright 2025 DXOS.org
//

import { S } from '@dxos/echo-schema';

import { ComputeNode } from '../compute-node';

export const IfInput = S.mutable(S.Struct({ condition: S.Boolean, value: S.Any }));
type IfInput = S.Schema.Type<typeof IfInput>;

export const IfOutput = S.mutable(S.Struct({ true: S.optional(S.Any), false: S.optional(S.Any) }));
type IfOutput = S.Schema.Type<typeof IfOutput>;

/**
 * IF
 */
export class If extends ComputeNode<IfInput, IfOutput> {
  override readonly type = 'if';

  constructor() {
    super(IfInput, IfOutput);
  }

  override async invoke({ condition, value }: IfInput) {
    return condition ? { true: value } : { false: value };
  }
}
