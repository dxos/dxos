//
// Copyright 2022 DXOS.org
//

import { Trigger } from '@dxos/async';
import { Config } from '@dxos/config';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { MemorySignalManager, MemorySignalManagerContext, WebsocketSignalManager } from '@dxos/messaging';
import { WebRTCTransportProxyFactory } from '@dxos/network-manager';
import { RpcPort } from '@dxos/rpc';
import { MaybePromise } from '@dxos/util';

import { ClientServicesHost } from '../services';
import { WorkerSession } from './worker-session';

// NOTE: Keep as RpcPorts to avoid dependency on @dxos/rpc-tunnel so we don't depend on browser-specific apis.
export type CreateSessionParams = {
  appPort: RpcPort;
  systemPort: RpcPort;
  shellPort: RpcPort;
};

/**
 * Runtime for the shared worker.
 * Manages connections from proxies (in tabs).
 * Tabs make requests to the `ClientServicesHost`, and provide a WebRTC gateway.
 */
export class WorkerRuntime {
  private readonly _transportFactory = new WebRTCTransportProxyFactory();
  private readonly _ready = new Trigger<Error | undefined>();
  private readonly sessions = new Set<WorkerSession>();
  private _sessionForNetworking?: WorkerSession;
  private _clientServices!: ClientServicesHost;
  private _config!: Config;

  // prettier-ignore
  constructor(
    private readonly _configProvider: () => MaybePromise<Config>
  ) {
    this._clientServices = new ClientServicesHost({ callbacks: { onReset: async () => { self.close(); } } });
  }

  get host() {
    return this._clientServices;
  }

  async start() {
    log('starting...');
    try {
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
    // TODO(dmaretskyi): Terminate active sessions.
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
      this.sessions.delete(session);
      this._reconnectWebrtc();
    });

    await session.open();
    this.sessions.add(session);

    this._reconnectWebrtc();
  }

  /**
   * Selects one of the existing session fro WebRTC networking.
   */
  private _reconnectWebrtc() {
    log('reconnecting webrtc...');
    // Check if current session is already closed.
    if (this._sessionForNetworking) {
      if (!this.sessions.has(this._sessionForNetworking)) {
        this._sessionForNetworking = undefined;
      }
    }

    // Select existing session.
    if (!this._sessionForNetworking) {
      const selected = Array.from(this.sessions).find((session) => session.bridgeService);
      if (selected) {
        this._sessionForNetworking = selected;
        this._transportFactory.setBridgeService(selected.bridgeService);
      } else {
        this._transportFactory.setBridgeService(undefined);
      }
    }
  }
}
