//
// Copyright 2022 DXOS.org
//

import { Trigger } from '@dxos/async';
import { type Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { MemorySignalManager, MemorySignalManagerContext, WebsocketSignalManager } from '@dxos/messaging';
import { SimplePeerTransportProxyFactory } from '@dxos/network-manager';
import { type RpcPort } from '@dxos/rpc';
import { type MaybePromise } from '@dxos/util';

import { WorkerSession } from './worker-session';
import { ClientServicesHost } from '../services';

// NOTE: Keep as RpcPorts to avoid dependency on @dxos/rpc-tunnel so we don't depend on browser-specific apis.
export type CreateSessionParams = {
  appPort: RpcPort;
  systemPort: RpcPort;
  shellPort?: RpcPort;
};

/**
 * Runtime for the shared worker.
 * Manages connections from proxies (in tabs).
 * Tabs make requests to the `ClientServicesHost`, and provide a WebRTC gateway.
 */
export class WorkerRuntime {
  private readonly _transportFactory = new SimplePeerTransportProxyFactory();
  private readonly _ready = new Trigger<Error | undefined>();
  private readonly _sessions = new Set<WorkerSession>();
  private readonly _clientServices!: ClientServicesHost;
  private _sessionForNetworking?: WorkerSession; // TODO(burdon): Expose to client QueryStatusResponse.
  private _config!: Config;
  private _releaseLock!: () => void;
  private _lockPromise!: Promise<void>;

  constructor(private readonly _lockKey: string, private readonly _configProvider: () => MaybePromise<Config>) {
    this._clientServices = new ClientServicesHost({
      callbacks: {
        onReset: async () => {
          // Close the shared worker, lock will be released automatically.
          self.close();
        },
      },
    });
  }

  get host() {
    return this._clientServices;
  }

  async start() {
    log('starting...');
    try {
      this._lockPromise = new Promise((resolve) => (this._releaseLock = resolve));
      const lockAcquired = new Trigger();
      void navigator.locks.request(this._lockKey, (lock) => {
        lockAcquired.wake();
        return this._lockPromise;
      });
      await lockAcquired.wait();

      this._config = await this._configProvider();
      const signals = this._config.get('runtime.services.signaling');
      this._clientServices.initialize({
        config: this._config,
        signalManager: signals
          ? new WebsocketSignalManager(signals)
          : new MemorySignalManager(new MemorySignalManagerContext()), // TODO(dmaretskyi): Inject this context.
        transportFactory: this._transportFactory,
      });

      await this._clientServices.open(new Context());
      this._ready.wake(undefined);
      log('started');
    } catch (err: any) {
      this._ready.wake(err);
      log.error('starting', err);
    }
  }

  async stop() {
    // Release the lock to notify remote clients that the worker is terminating.
    this._releaseLock();
    await this._clientServices.close();
  }

  /**
   * Create a new session.
   */
  async createSession({ appPort, systemPort, shellPort }: CreateSessionParams) {
    const session = new WorkerSession({
      serviceHost: this._clientServices,
      appPort,
      systemPort,
      shellPort,
      readySignal: this._ready,
    });

    // When tab is closed.
    session.onClose.set(async () => {
      this._sessions.delete(session);
      this._reconnectWebrtc();
    });

    await session.open();
    this._sessions.add(session);

    this._reconnectWebrtc();
  }

  /**
   * Selects one of the existing session fro WebRTC networking.
   */
  private _reconnectWebrtc() {
    log('reconnecting webrtc...');
    // Check if current session is already closed.
    if (this._sessionForNetworking) {
      if (!this._sessions.has(this._sessionForNetworking)) {
        this._sessionForNetworking = undefined;
      }
    }

    // Select existing session.
    if (!this._sessionForNetworking) {
      const selected = Array.from(this._sessions).find((session) => session.bridgeService);
      if (selected) {
        this._sessionForNetworking = selected;
        this._transportFactory.setBridgeService(selected.bridgeService);
      } else {
        this._transportFactory.setBridgeService(undefined);
      }
    }
  }
}
