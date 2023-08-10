//
// Copyright 2023 DXOS.org
//

import { DeferredTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { invariant } from '@dxos/log';
import { ComplexMap } from '@dxos/util';

export const MAX_CONCURRENT_INITIATING_CONNECTIONS = 3;

export interface ConnectionLimiter {
  /**
   * @returns Promise that resolves when initiating connections amount is below the limit.
   */
  connecting(sessionId: PublicKey): Promise<void>;

  doneConnecting(sessionId: PublicKey): void;
}

export type ConnectionLimiterOptions = {
  maxConcurrentInitConnections?: number;
};

/**
 * Limits the amount of concurrent initiating connections.
 */
export class ConnectionLimiterImpl implements ConnectionLimiter {
  private readonly _ctx = new Context();
  private readonly _maxConcurrentInitConnections;
  /**
   * Queue of promises to resolve when initiating connections amount is below the limit.
   */
  private readonly _waitingPromises = new ComplexMap<PublicKey, { resolve: () => void; reject: () => void }>(
    PublicKey.hash,
  );

  resolveWaitingPromises = new DeferredTask(this._ctx, async () => {
    if (this._waitingPromises.size < this._maxConcurrentInitConnections) {
      Array.from(this._waitingPromises.values())
        .slice(0, this._maxConcurrentInitConnections - this._waitingPromises.size)
        .forEach(({ resolve }) => {
          resolve();
        });
    }
  });

  constructor({ maxConcurrentInitConnections = MAX_CONCURRENT_INITIATING_CONNECTIONS }: ConnectionLimiterOptions = {}) {
    this._maxConcurrentInitConnections = maxConcurrentInitConnections;
  }

  /**
   * @returns Promise that resolves when connections amount with 'CONNECTING' state is below the limit.
   */
  async connecting(sessionId: PublicKey): Promise<void> {
    invariant(!this._waitingPromises.has(sessionId), 'Peer is already waiting for connection');
    return new Promise((resolve, reject) => {
      this._waitingPromises.set(sessionId, {
        resolve,
        reject: () => {
          reject(new Error('Finished waiting for connection'));
          this._waitingPromises.delete(sessionId);
        },
      });
      this.resolveWaitingPromises.schedule();
    });
  }

  /**
   * Rejects promise returned by `connecting` method.
   */
  doneConnecting(sessionId: PublicKey) {
    invariant(this._waitingPromises.has(sessionId), 'Peer is not waiting for connection');
    this._waitingPromises.get(sessionId)!.reject();
    this.resolveWaitingPromises.schedule();
  }
}
