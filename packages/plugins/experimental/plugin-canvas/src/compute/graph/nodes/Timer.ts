//
// Copyright 2024 DXOS.org
//

import { type Context } from '@dxos/context';
import { raise } from '@dxos/debug';
import { S } from '@dxos/echo-schema';

import { ComputeNode } from '../compute-node';
import { InvalidStateError } from '../state-machine';

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
