//
// Copyright 2025 DXOS.org
//

import { S } from '@dxos/echo-schema';

import { ComputeNode, DEFAULT_OUTPUT } from '../compute-node';

//
// IF
//

export const IfInput = S.mutable(S.Struct({ condition: S.Boolean, value: S.Any }));
type IfInput = S.Schema.Type<typeof IfInput>;

export const IfOutput = S.mutable(S.Struct({ true: S.optional(S.Any), false: S.optional(S.Any) }));
type IfOutput = S.Schema.Type<typeof IfOutput>;

export class If extends ComputeNode<IfInput, IfOutput> {
  override readonly type = 'if';

  constructor() {
    super(IfInput, IfOutput);
  }

  override async invoke({ condition, value }: IfInput) {
    return condition ? { true: value } : { false: value };
  }
}

//
// IF ELSE
//

export const IfElseInput = S.mutable(S.Struct({ condition: S.Boolean, true: S.Any, false: S.Any }));
type IfElseInput = S.Schema.Type<typeof IfElseInput>;

export const IfElseOutput = S.mutable(S.Struct({ [DEFAULT_OUTPUT]: S.optional(S.Any) }));
type IfElseOutput = S.Schema.Type<typeof IfElseOutput>;

export class IfElse extends ComputeNode<IfElseInput, IfElseOutput> {
  override readonly type = 'if-else';

  constructor() {
    super(IfElseInput, IfElseOutput);
  }

  override async invoke({ condition, true: _true, false: _false }: IfElseInput) {
    return { [DEFAULT_OUTPUT]: condition ? _true : _false };
  }
}
