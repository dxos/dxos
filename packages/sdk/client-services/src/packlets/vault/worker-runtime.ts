//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Trigger } from '@dxos/async';
import { Config } from '@dxos/config';
import { WebsocketSignalManager } from '@dxos/messaging';
import { NetworkManager, WebRTCTransportProxyFactory } from '@dxos/network-manager';
import { RpcPort } from '@dxos/rpc';
import { MaybePromise } from '@dxos/util';

import { ClientServicesHost } from '../services';
import { WorkerSession } from './worker-session';

export type CreateSessionParams = {
  appPort: RpcPort;
  systemPort: RpcPort;
};

/**
 * Runtime for the shared worker.
 * Manages connections from proxies (in tabs).
 * Tabs make requests to the `ClientServicesHost`, and provide a WebRTC gateway.
 */
export class WorkerRuntime {
  private readonly _transportFactory = new WebRTCTransportProxyFactory();
  private readonly _ready = new Trigger();
  private readonly sessions = new Set<WorkerSession>();
  private _sessionForNetworking?: WorkerSession;
  private _clientServices!: ClientServicesHost;
  private _config!: Config;

  // prettier-ignore
  constructor(
    private readonly _configProvider: () => MaybePromise<Config>
  ) {}

  async start() {
    this._config = await this._configProvider();
    const signalServer = this._config.get('runtime.services.signal.server');
    // TODO(wittjosiah): Networking shouldn't be required.
    assert(signalServer);
    this._clientServices = new ClientServicesHost({
      config: this._config,
      networkManager: new NetworkManager({
        log: true,
        signalManager: new WebsocketSignalManager([signalServer]),
        transportFactory: this._transportFactory
      })
    });

    await this._clientServices.open();
    this._ready.wake();
  }

  async stop() {
    // TODO(dmaretskyi): Terminate active sessions.
    await this._clientServices.close();
  }

  /**
   * Create a new session.
   */
  async createSession({ appPort, systemPort }: CreateSessionParams) {
    await this._ready.wait();

    const session = new WorkerSession({
      clientServices: this._clientServices,
      appPort,
      systemPort
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
