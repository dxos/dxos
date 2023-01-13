//
// Copyright 2023 DXOS.org
//

import { Trigger } from '@dxos/async';
import { Config } from '@dxos/config';
import { logInfo } from '@dxos/log';
import { MemorySignalManager, MemorySignalManagerContext, WebsocketSignalManager } from '@dxos/messaging';
import { createWebRTCTransportFactory, NetworkManager } from '@dxos/network-manager';
import { createProtoRpcPeer, ProtoRpcPeer, RpcPort } from '@dxos/rpc';
import { MaybePromise } from '@dxos/util';

import { clientServiceBundle, ClientServices, ClientServicesHost } from '../services';

export type IFrameCompatibilityRuntimeParams = {
  configProvider: () => MaybePromise<Config>;
  appPort: RpcPort;
};

export class IFrameCompatibilityRuntime {
  private readonly _configProvider: () => MaybePromise<Config>;
  private readonly _transportFactory = createWebRTCTransportFactory();
  private readonly _ready = new Trigger<Error | undefined>();
  private readonly _getServices: () => Promise<ClientServicesHost>;
  private readonly _appPort: RpcPort;
  private _clientServices!: ClientServicesHost;
  private _clientRpc!: ProtoRpcPeer<ClientServices>;
  private _config!: Config;

  @logInfo
  public origin?: string;

  constructor({ configProvider, appPort }: IFrameCompatibilityRuntimeParams) {
    this._configProvider = configProvider;
    this._appPort = appPort;
    this._getServices = async () => {
      const error = await this._ready.wait();
      if (error !== undefined) {
        throw error;
      }
      return this._clientServices;
    };
  }

  async start() {
    try {
      this._config = await this._configProvider();
      const signalServer = this._config.get('runtime.services.signal.server');
      this._clientServices = new ClientServicesHost({
        config: this._config,
        networkManager: new NetworkManager({
          log: true,
          signalManager: signalServer
            ? new WebsocketSignalManager([signalServer])
            : new MemorySignalManager(new MemorySignalManagerContext()), // TODO(dmaretskyi): Inject this context.
          transportFactory: this._transportFactory
        })
      });

      this._clientRpc = createProtoRpcPeer({
        exposed: clientServiceBundle,
        handlers: {
          HaloInvitationsService: async () => (await this._getServices()).services.HaloInvitationsService,
          DevicesService: async () => (await this._getServices()).services.DevicesService,
          SpaceInvitationsService: async () => (await this._getServices()).services.SpaceInvitationsService,
          SpacesService: async () => (await this._getServices()).services.SpacesService,
          NetworkService: async () => (await this._getServices()).services.NetworkService,
          SpaceService: async () => (await this._getServices()).services.SpaceService,
          DataService: async () => (await this._getServices()).services.DataService,
          ProfileService: async () => (await this._getServices()).services.ProfileService,
          SystemService: async () => (await this._getServices()).services.SystemService,
          DevtoolsHost: async () => (await this._getServices()).services.DevtoolsHost,
          TracingService: async () => (await this._getServices()).services.TracingService
        },
        port: this._appPort
      });

      await Promise.all([this._clientServices.open().then(() => this._ready.wake(undefined)), this._clientRpc.open()]);
    } catch (err: any) {
      this._ready.wake(err);
    }
  }

  async stop() {
    await this._clientRpc.close();
    await this._clientServices.close();
  }
}
