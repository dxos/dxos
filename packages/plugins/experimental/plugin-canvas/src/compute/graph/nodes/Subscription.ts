//
// Copyright 2024 DXOS.org
//

import { type Context } from '@dxos/context';
import { raise } from '@dxos/debug';
import { type Query } from '@dxos/echo-db';
import { S } from '@dxos/echo-schema';

import { ComputeNode } from '../compute-node';
import { InvalidStateError } from '../state-machine';

/**
 * ECHO subscription.
 */
export class Subscription extends ComputeNode<void, readonly any[]> {
  override readonly type = 'subscription';

  // TODO(burdon): Throttling options.
  constructor(private _query?: Query) {
    super(S.Void, S.Array(S.Any));
  }

  override async onInitialize(ctx: Context) {
    const subscription = this._query?.subscribe(({ results }) => {
      this.setOutput(results);
    });

    ctx.onDispose(() => subscription?.());
  }

  override async invoke() {
    return raise(new InvalidStateError());
  }
}
