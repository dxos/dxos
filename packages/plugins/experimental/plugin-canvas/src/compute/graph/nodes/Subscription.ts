//
// Copyright 2024 DXOS.org
//

import { type Context } from '@dxos/context';
import { raise } from '@dxos/debug';
import { type Query } from '@dxos/echo-db';
import { S } from '@dxos/echo-schema';

import { ComputeNode, DEFAULT_OUTPUT, NoInput } from '../compute-node';
import { InvalidStateError } from '../state-machine';

/**
 * ECHO subscription.
 */
export class Subscription extends ComputeNode<NoInput, { [DEFAULT_OUTPUT]: any[] }> {
  override readonly type = 'subscription';

  // TODO(burdon): Throttling options.
  // TODO(dmaretskyi): Move query to inputs.
  constructor(private _query?: Query) {
    super(NoInput, S.Struct({ [DEFAULT_OUTPUT]: S.mutable(S.Array(S.Any)) }));
  }

  override async onInitialize(ctx: Context) {
    const subscription = this._query?.subscribe(({ results }) => {
      this.setOutput({ [DEFAULT_OUTPUT]: results });
    });

    ctx.onDispose(() => subscription?.());
  }

  override async invoke() {
    return raise(new InvalidStateError());
  }
}
