//
// Copyright 2022 DXOS.org
//

import { Trigger } from '@dxos/async';
import { ClientServiceHost } from '@dxos/client';
import { Config } from '@dxos/config';
import { WebRTCTransportProxyFactory } from '@dxos/network-manager';
import { RpcPort } from '@dxos/rpc';

import { WorkerSession } from './worker-session';

export type CreateSessionParams = {
  appPort: RpcPort
  systemPort: RpcPort
}

/**
 * Runtime for the shared worker.
 * Manages connections from proxies (in tabs).
 * Tabs make requests to the `ClientServiceHost`, and provide a WebRTC gateway.
 */
export class WorkerRuntime {
  private readonly _transportFactory = new WebRTCTransportProxyFactory();
  private readonly _clientServices: ClientServiceHost;
  private readonly _ready = new Trigger();
  private readonly sessions = new Set<WorkerSession>();
  private _sessionForNetworking?: WorkerSession;

  constructor (
    private readonly _config: Config
  ) {
    this._clientServices = new ClientServiceHost({
      config: this._config,
      transportFactory: this._transportFactory
    });
  }

  async start () {
    await this._clientServices.open();
    this._ready.wake();
  }

  async stop () {
    // TODO(dmaretskyi): Terminate active sessions.
    await this._clientServices.close();
  }

  /**
   * Create a new session.
   */
  async createSession ({ appPort, systemPort }: CreateSessionParams) {
    await this._ready.wait();

    const session = new WorkerSession({
      appPort,
      systemPort,
      services: this._clientServices.services
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
  private _reconnectWebrtc () {
    // Check if current session is already closed.
    if (this._sessionForNetworking) {
      if (!this.sessions.has(this._sessionForNetworking)) {
        this._sessionForNetworking = undefined;
      }
    }

    // Select existing session.
    if (!this._sessionForNetworking) {
      const selected = Array.from(this.sessions).find(session => session.bridgeService);
      if (selected) {
        this._sessionForNetworking = selected;
        this._transportFactory.setBridgeService(selected.bridgeService);
      } else {
        this._transportFactory.setBridgeService(undefined);
      }
    }
  }
}
