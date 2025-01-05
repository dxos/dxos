//
// Copyright 2024 DXOS.org
//

import { type Context } from '@dxos/context';
import { raise } from '@dxos/debug';
import { S } from '@dxos/echo-schema';

import { ComputeNode, DEFAULT_OUTPUT, NoInput } from '../compute-node';
import { InvalidStateError } from '../state-machine';

/**
 * Timer sends a periodic value.
 */
export class Timer extends ComputeNode<NoInput, { [DEFAULT_OUTPUT]: number }> {
  override readonly type = 'timer';

  private _interval?: NodeJS.Timeout;

  // TODO(dmaretskyi): Move to inputs.
  constructor(private _period = 1_000) {
    super(NoInput, S.Struct({ [DEFAULT_OUTPUT]: S.Number }));
  }

  start() {
    this._interval = setInterval(
      () => {
        this.setOutput({ [DEFAULT_OUTPUT]: Date.now() });
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
