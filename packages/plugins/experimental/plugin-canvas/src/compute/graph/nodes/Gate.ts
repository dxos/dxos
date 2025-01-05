//
// Copyright 2025 DXOS.org
//

import { S } from '@dxos/echo-schema';

import { ComputeNode, DEFAULT_INPUT, DEFAULT_OUTPUT } from '../compute-node';

// TODO(burdon): Array or subtype with named properties?
const LogicGateInput = S.mutable(S.Struct({ a: S.Boolean, b: S.Boolean }));
type LogicGateInput = S.Schema.Type<typeof LogicGateInput>;

/**
 * Logical NOT gate.
 */
export class NotGate extends ComputeNode<{ [DEFAULT_INPUT]: boolean }, { [DEFAULT_OUTPUT]: boolean }> {
  override readonly type = 'not';

  constructor() {
    super(S.Struct({ [DEFAULT_INPUT]: S.Boolean }), S.Struct({ [DEFAULT_OUTPUT]: S.Boolean }));
  }

  override async invoke(input: { [DEFAULT_INPUT]: boolean }) {
    return { [DEFAULT_OUTPUT]: !input[DEFAULT_INPUT] };
  }
}

/**
 * Logical OR gate.
 */
export class OrGate extends ComputeNode<LogicGateInput, { [DEFAULT_OUTPUT]: boolean }> {
  override readonly type = 'or';

  constructor() {
    super(LogicGateInput, S.Struct({ [DEFAULT_OUTPUT]: S.Boolean }));
  }

  override async invoke(input: LogicGateInput) {
    return { [DEFAULT_OUTPUT]: input.a || input.b };
  }
}

/**
 * Logical AND gate.
 */
export class AndGate extends ComputeNode<LogicGateInput, { [DEFAULT_OUTPUT]: boolean }> {
  override readonly type = 'and';

  constructor() {
    super(LogicGateInput, S.Struct({ [DEFAULT_OUTPUT]: S.Boolean }));
  }

  override async invoke(input: LogicGateInput) {
    return { [DEFAULT_OUTPUT]: input.a && input.b };
  }
}
