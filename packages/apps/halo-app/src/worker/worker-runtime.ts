import { Trigger } from "@dxos/async";
import { Config } from "@dxos/config";
import { WebRTCTransportProxyFactory } from "@dxos/network-manager";
import { RpcPort } from "@dxos/rpc";
import { ClientServiceHost } from '@dxos/client';
import { WorkerSession } from "./worker-session";

export type NewSessionParams = {
  appPort: RpcPort
  systemPort: RpcPort
}

/**
 * Runtime for the shared worker.
 */
export class WorkerRuntime {
  private readonly _transportFactory = new WebRTCTransportProxyFactory();
  private readonly _clientServices: ClientServiceHost;
  private readonly _ready = new Trigger();
  private readonly sessions = new Set<WorkerSession>();

  constructor(
    private readonly _config: Config,
  ) {
    this._clientServices = new ClientServiceHost({
      config: this._config,
      transportFactory: this._transportFactory,
    });
  }

  async start() {
    await this._clientServices.open();
    this._ready.wake();
  }

  async newSession({ appPort, systemPort }: NewSessionParams) {
    await this._ready.wait();

    const session = new WorkerSession({
      appPort,
      systemPort,
      services: this._clientServices.services,
    });
    await session.open()
    this.sessions.add(session);
    this._transportFactory.setBridgeService(session.bridgeService);
  }
}