//
// Copyright 2023 DXOS.org
//

import { DeferredTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { CancelledError } from '@dxos/errors';
import { PublicKey } from '@dxos/keys';
import { invariant, log } from '@dxos/log';
import { ComplexMap } from '@dxos/util';

export const MAX_CONCURRENT_INITIATING_CONNECTIONS = 3;

export type ConnectionLimiterOptions = {
  maxConcurrentInitConnections?: number;
};

/**
 * Limits the amount of concurrent connections with 'CONNECTING' state.
 */
export class ConnectionLimiter {
  private readonly _ctx = new Context();
  private readonly _maxConcurrentInitConnections;
  /**
   * Queue of promises to resolve when initiating connections amount is below the limit.
   */
  private readonly _waitingPromises = new ComplexMap<PublicKey, { resolve: () => void; reject: (err: Error) => void }>(
    PublicKey.hash,
  );

  resolveWaitingPromises = new DeferredTask(this._ctx, async () => {
    Array.from(this._waitingPromises.values())
      .slice(0, this._maxConcurrentInitConnections)
      .forEach(({ resolve }) => {
        resolve();
      });
  });

  constructor({ maxConcurrentInitConnections = MAX_CONCURRENT_INITIATING_CONNECTIONS }: ConnectionLimiterOptions = {}) {
    log.info('construct', { maxConcurrentInitConnections })

    this._maxConcurrentInitConnections = maxConcurrentInitConnections;
  }

  /**
   * @returns Promise that resolves in queue when connections amount with 'CONNECTING' state is below the limit.
   */
  async connecting(sessionId: PublicKey): Promise<void> {
    invariant(!this._waitingPromises.has(sessionId), 'Peer is already waiting for connection');
    log.info('waiting', { sessionId })
    await new Promise<void>((resolve, reject) => {
      this._waitingPromises.set(sessionId, {
        resolve,
        reject,
      });
      this.resolveWaitingPromises.schedule();
    });
    log.info('allow', { sessionId })
  }

  /**
   * Rejects promise returned by `connecting` method.
   */
  doneConnecting(sessionId: PublicKey) {
    log.info('done', { sessionId })
    if (!this._waitingPromises.has(sessionId)) {
      return;
    }
    this._waitingPromises.get(sessionId)!.reject(new CancelledError());
    this._waitingPromises.delete(sessionId);
    this.resolveWaitingPromises.schedule();
  }
}
