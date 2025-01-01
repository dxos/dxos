//
// Copyright 2024 DXOS.org
//

import { type Context } from '@dxos/context';
import { raise } from '@dxos/debug';
import { type Query } from '@dxos/echo-db';
import { S } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

import { ComputeNode } from './compute-graph';
import { type AsyncUpdate, InvalidStateError } from './state-machine';

// TODO(burdon): Text input node.
// TODO(burdon): Logging "tap" pass-through node.

/**
 * Switch outputs true when set.
 */
export class Switch extends ComputeNode<void, boolean> {
  override readonly type = 'switch';
  private _state = false;

  constructor() {
    super(S.Void, S.Boolean);
  }

  setState(state: boolean): this {
    this._state = state;
    return this;
  }

  override async invoke() {
    return this._state;
  }
}

/**
 * Beacon displays the current boolean status.
 */
export class Beacon extends ComputeNode<boolean, void> {
  override readonly type = 'beacon';

  constructor() {
    super(S.Boolean, S.Void);
  }

  override async invoke() {
    invariant('Invalid state');
  }
}

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

/**
 * ECHO subscription.
 */
export class Subscription extends ComputeNode<void, readonly any[]> {
  override readonly type = 'subscription';

  // TODO(burdon): Throttling options.
  // TODO(burdon): Pause/resume (base class?)
  constructor(private _query?: Query) {
    super(S.Void, S.Array(S.Any));
  }

  override async open(ctx: Context, cb: AsyncUpdate<readonly any[]>) {
    const subscription = this._query?.subscribe(({ results }) => {
      cb(results);
    });

    ctx.onDispose(() => subscription?.());
  }

  override async invoke() {
    return raise(new InvalidStateError());
  }
}

/**
 * Timer sends a periodic value.
 */
// TODO(burdon): Send custom value.
// TODO(burdon): Pause/resume (base class?)
export class Timer extends ComputeNode<void, number> {
  override readonly type = 'timer';

  constructor(private _interval = 1_000) {
    super(S.Void, S.Number);
  }

  override async open(ctx: Context, cb: AsyncUpdate<number>) {
    const t = setInterval(() => {
      cb(Date.now());
    }, this._interval);

    ctx.onDispose(() => clearInterval(t));
  }

  override async invoke() {
    return raise(new InvalidStateError());
  }
}

export const DefaultInput = S.Struct({ value: S.Any });
export const DefaultOutput = S.Struct({ value: S.Any });

export type DefaultInput = S.Schema.Type<typeof DefaultInput>;
export type DefaultOutput = S.Schema.Type<typeof DefaultOutput>;

export class RemoteFunction<Input, Output> extends ComputeNode<Input, Output> {
  override readonly type = 'function';

  override async invoke(input: Input) {
    return raise(new InvalidStateError());
  }
}

export class TransformerFunction extends ComputeNode<string, string> {
  override readonly type = 'gpt';

  override async invoke(input: string) {
    return raise(new InvalidStateError());
  }
}
