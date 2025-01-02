//
// Copyright 2024 DXOS.org
//

import { type Context } from '@dxos/context';
import { raise } from '@dxos/debug';
import { S } from '@dxos/echo-schema';

import { DEFAULT_INPUT, DEFAULT_OUTPUT } from '../../../shapes';
import { ComputeNode } from '../compute-node';
import { InvalidStateError } from '../state-machine';

// TODO(burdon): Logging "tap" pass-through node.

/**
 * Timer sends a periodic value.
 */
export class Timer extends ComputeNode<void, number> {
  override readonly type = 'timer';

  private _interval?: NodeJS.Timeout;

  constructor(private _period = 1_000) {
    super(S.Void, S.Number);
  }

  start() {
    this._interval = setInterval(
      () => {
        void this.update(Date.now());
      },
      Math.max(this._period, 1_000),
    );
  }

  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = undefined;
    }
  }

  override async onInitialize(ctx: Context) {
    ctx.onDispose(() => this.stop());
  }

  override async invoke() {
    return raise(new InvalidStateError());
  }
}

export const DefaultInput = S.Struct({ input: S.Any });
export const DefaultOutput = S.Struct({ result: S.Any });

export type DefaultInput = S.Schema.Type<typeof DefaultInput>;
export type DefaultOutput = S.Schema.Type<typeof DefaultOutput>;

export class RemoteFunction<Input, Output> extends ComputeNode<Input, Output> {
  override readonly type = 'function';

  get name() {
    return 'Function';
  }

  // TODO(burdon): Should be replaced by actual function (e.g., transformer).
  override async invoke(input: Input) {
    const value = (input as any)[DEFAULT_INPUT];
    const output = {
      [DEFAULT_OUTPUT]: value,
    };

    return output as any as Output;
  }
}
