//
// Copyright 2025 DXOS.org
//

import { S } from '@dxos/echo-schema';

import { ComputeNode } from '../compute-node';

// TODO(burdon): Array or subtype with named properties?
const LogicGateInput = S.mutable(S.Struct({ a: S.Boolean, b: S.Boolean }));
type LogicGateInput = S.Schema.Type<typeof LogicGateInput>;

/**
 * Logical NOT gate.
 */
export class NotGate extends ComputeNode<boolean, boolean> {
  override readonly type = 'not';

  constructor() {
    super(S.Boolean, S.Boolean);
  }

  override async invoke(input: boolean) {
    return !input;
  }
}

/**
 * Logical OR gate.
 */
export class OrGate extends ComputeNode<LogicGateInput, boolean> {
  override readonly type = 'or';

  constructor() {
    super(LogicGateInput, S.Boolean);
  }

  override async invoke(input: LogicGateInput) {
    return input.a || input.b;
  }
}

/**
 * Logical AND gate.
 */
export class AndGate extends ComputeNode<LogicGateInput, boolean> {
  override readonly type = 'and';

  constructor() {
    super(LogicGateInput, S.Boolean);
  }

  override async invoke(input: LogicGateInput) {
    return input.a && input.b;
  }
}
