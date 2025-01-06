//
// Copyright 2025 DXOS.org
//

import { S } from '@dxos/echo-schema';

import { ComputeNode, DEFAULT_INPUT, DEFAULT_OUTPUT, type DefaultInput, type DefaultOutput } from '../compute-node';

const LogicGateInput = S.mutable(S.Struct({ a: S.Boolean, b: S.Boolean }));

type LogicGateInput = S.Schema.Type<typeof LogicGateInput>;

/**
 * Logical AND gate.
 */
export class AndGate extends ComputeNode<LogicGateInput, DefaultOutput<boolean>> {
  override readonly type = 'and';

  constructor() {
    super(LogicGateInput, S.Struct({ [DEFAULT_OUTPUT]: S.Boolean }));
  }

  override async invoke({ a, b }: LogicGateInput) {
    return { [DEFAULT_OUTPUT]: a && b };
  }
}

/**
 * Logical OR gate.
 */
export class OrGate extends ComputeNode<LogicGateInput, DefaultOutput<boolean>> {
  override readonly type = 'or';

  constructor() {
    super(LogicGateInput, S.Struct({ [DEFAULT_OUTPUT]: S.Boolean }));
  }

  override async invoke({ a, b }: LogicGateInput) {
    return { [DEFAULT_OUTPUT]: a || b };
  }
}

/**
 * Logical NOT gate.
 */
export class NotGate extends ComputeNode<DefaultInput<boolean>, DefaultOutput<boolean>> {
  override readonly type = 'not';

  constructor() {
    super(S.Struct({ [DEFAULT_INPUT]: S.Boolean }), S.Struct({ [DEFAULT_OUTPUT]: S.Boolean }));
  }

  override async invoke(input: DefaultInput<boolean>) {
    return { [DEFAULT_OUTPUT]: !input[DEFAULT_INPUT] };
  }
}
