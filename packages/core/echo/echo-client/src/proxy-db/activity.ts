//
// Copyright 2026 DXOS.org
//

import type * as EffectContext from 'effect/Context';
import * as Atom from 'effect/unstable/reactivity/Atom';

import { type CleanupFn } from '@dxos/async';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { RpcClosedError, subscribeStream } from '@dxos/protocols';
import { type QueryService } from '@dxos/protocols/rpc';

export type ActivityRange = {
  /** Unix ms, inclusive. */
  from?: number;
  /** Unix ms, exclusive. */
  to?: number;
};

export type ActivityRow = QueryService.ActivityRow;

/**
 * A live view of a space's activity ledger: how many changes landed in each UTC hour. The host
 * re-sends the rows after every index pass that touches the space, so the tab holds only the
 * rows it draws and never an object.
 */
export class ActivityQuery {
  #atom: Atom.Atom<readonly ActivityRow[]> | undefined = undefined;

  constructor(
    private readonly _params: {
      spaceId: SpaceId;
      range: ActivityRange;
      runtime: EffectContext.Context<never>;
      service: QueryService.Client;
    },
  ) {}

  subscribe(callback: (rows: readonly ActivityRow[]) => void): CleanupFn {
    const { spaceId, range, runtime, service } = this._params;
    return subscribeStream(runtime, service['QueryService.activity']({ spaceId, from: range.from, to: range.to }), {
      onData: (response) => callback(response.rows),
      onError: (error) => {
        if (error != null && !(error instanceof RpcClosedError)) {
          log.catch(error);
        }
      },
    });
  }

  get atom(): Atom.Atom<readonly ActivityRow[]> {
    this.#atom ??= Atom.make((get): readonly ActivityRow[] => {
      get.addFinalizer(this.subscribe((rows) => get.setSelf(rows)));
      return [];
    });
    return this.#atom;
  }
}
