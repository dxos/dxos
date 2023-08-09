//
// Copyright 2023 DXOS.org
//

import { DeferredTask } from '@dxos/async';
import { Context } from '@dxos/context';

import { NetworkManager } from '../network-manager';
import { ConnectionState } from './connection';

export const MAX_INITIATING_CONNECTIONS = 15;

export interface ConnectionLimiter {
  /**
   * @returns Promise that resolves when initiating connections amount is below the limit.
   */
  wait(): Promise<void>;
}

export class ConnectionLimiterImpl implements ConnectionLimiter {
  private readonly _ctx = new Context();

  /**
   * Queue of promises to resolve when initiating connections amount is below the limit.
   */
  private readonly _waitingPromises: { resolve: () => void }[] = [];

  private _initiatingConnections = 0;

  private readonly _updateInitiatingConnections = new DeferredTask(this._ctx, async () => {
    this._initiatingConnections = Array.from(this._networkManager._swarms.values())
      .map((swarm) => swarm.connections)
      .flat()
      .filter((connection) => connection.state === ConnectionState.CONNECTING).length;

    if (this._initiatingConnections < MAX_INITIATING_CONNECTIONS) {
      this._waitingPromises
        .splice(0, MAX_INITIATING_CONNECTIONS - this._initiatingConnections)
        .forEach((p) => p.resolve());
    }
  });

  constructor(private readonly _networkManager: NetworkManager) {
    this._updateInitiatingConnections.schedule();
    let swarmCtx = new Context();
    this._networkManager.topicsUpdated.on(this._ctx, () => {
      void swarmCtx?.dispose();
      this._updateInitiatingConnections.schedule();
      swarmCtx = this._subscribeSwarms(this._ctx);
    });
  }

  private _subscribeSwarms = (ctx: Context) => {
    const swarmCtx = ctx.derive();
    Array.from(this._networkManager._swarms.values()).forEach((swarm) => {
      swarm.connectionAdded.on(swarmCtx, () => this._updateInitiatingConnections.schedule());
      swarm.disconnected.on(swarmCtx, () => this._updateInitiatingConnections.schedule());
      swarm.connections.forEach((connection) => {
        connection.stateChanged.on(swarmCtx, () => this._updateInitiatingConnections.schedule());
      });
    });
    return swarmCtx;
  };

  async wait(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this._ctx.disposed) {
        reject(new Error('Context is disposed'));
      }
      this._waitingPromises.push({ resolve: resolve as () => void });
      this._updateInitiatingConnections.schedule();
    });
  }

  destroy() {
    void this._ctx.dispose();
  }
}
