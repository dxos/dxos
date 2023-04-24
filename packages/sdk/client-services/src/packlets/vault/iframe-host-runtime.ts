//
// Copyright 2023 DXOS.org
//

import { Trigger } from '@dxos/async';
import { Config } from '@dxos/config';
import { log, logInfo } from '@dxos/log';
import { MemorySignalManager, MemorySignalManagerContext, WebsocketSignalManager } from '@dxos/messaging';
import { createWebRTCTransportFactory, NetworkManager, TransportFactory } from '@dxos/network-manager';
import { RpcPort } from '@dxos/rpc';
import { getAsyncValue, MaybePromise, Provider } from '@dxos/util';

import { LocalClientServices } from '../services';
import { ClientRpcServer, ClientRpcServerParams } from '../services/client-rpc-server';
import { ShellRuntime, ShellRuntimeImpl } from './shell-runtime';

const LOCK_KEY = 'DXOS_RESOURCE_LOCK';

export type IFrameHostRuntimeParams = {
  config: Config | Provider<MaybePromise<Config>>;
  origin: string;
  appPort: RpcPort;
  shellPort?: RpcPort;
};

/**
 * Runs the client services in the main thread.
 *
 * Holds a lock over the client services such that only one instance can run at a time.
 * This should only be used when SharedWorker is not available.
 */
export class IFrameHostRuntime {
  private readonly _configProvider: IFrameHostRuntimeParams['config'];
  private readonly _ready = new Trigger<Error | undefined>();

  private readonly _appPort: RpcPort;
  private readonly _shellPort?: RpcPort;
  private _config!: Config;
  private _transportFactory!: TransportFactory;

  // TODO(dmaretskyi):  Replace with host and figure out how to return services provider here.
  private _clientServices!: LocalClientServices;
  private _clientRpc!: ClientRpcServer;
  private _shellRuntime?: ShellRuntimeImpl;

  @logInfo
  public origin: string;

  constructor({ config, origin, appPort, shellPort }: IFrameHostRuntimeParams) {
    this._configProvider = config;
    this.origin = origin;
    this._appPort = appPort;
    this._shellPort = shellPort;

    if (this._shellPort) {
      this._shellRuntime = new ShellRuntimeImpl(this._shellPort);
    }
  }

  get services() {
    return this._clientServices;
  }

  get shell(): ShellRuntime | undefined {
    return this._shellRuntime;
  }

  async start() {
    log('starting...');
    try {
      this._config = await getAsyncValue(this._configProvider);
      this._transportFactory = createWebRTCTransportFactory({
        iceServers: this._config.get('runtime.services.ice')
      });
      const signals = this._config.get('runtime.services.signaling');
      this._clientServices = new LocalClientServices({
        lockKey: LOCK_KEY,
        config: this._config,
        networkManager: new NetworkManager({
          log: true,
          signalManager: signals
            ? new WebsocketSignalManager(signals)
            : new MemorySignalManager(new MemorySignalManagerContext()), // TODO(dmaretskyi): Inject this context.
          transportFactory: this._transportFactory
        })
      });

      const middleware: Pick<ClientRpcServerParams, 'handleCall' | 'handleStream'> = {
        handleCall: async (method, params, handler) => {
          const error = await this._ready.wait({ timeout: 3_000 });
          if (error) {
            throw error;
          }

          return handler(method, params);
        },
        handleStream: async (method, params, handler) => {
          const error = await this._ready.wait({ timeout: 3_000 });
          if (error) {
            throw error;
          }

          return handler(method, params);
        }
      };

      this._clientRpc = new ClientRpcServer({
        serviceRegistry: this._clientServices.host.serviceRegistry,
        port: this._appPort,
        ...middleware
      });

      await Promise.all([this._clientServices.open(), this._clientRpc.open(), this._shellRuntime?.open()]);
      this._ready.wake(undefined);
      log('started');
    } catch (err: any) {
      this._ready.wake(err);
      log.catch(err);
    }
  }

  async stop() {
    log('stopping...');
    await this._clientRpc.close();
    await this._clientServices.close();
    await this._shellRuntime?.close();
    log('stopped');
  }
}
