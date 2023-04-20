//
// Copyright 2022 DXOS.org
//

import { Config, iframeServiceBundle, workerServiceBundle, WorkerServiceBundle } from '@dxos/client';
import { RemoteServiceConnectionError } from '@dxos/errors';
import { log } from '@dxos/log';
import { WebRTCTransportService } from '@dxos/network-manager';
import { BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { createProtoRpcPeer, ProtoRpcPeer, RpcPort } from '@dxos/rpc';
import { getAsyncValue, MaybePromise, Provider } from '@dxos/util';

import { ShellRuntime, ShellRuntimeImpl } from './shell-runtime';

// NOTE: Keep as RpcPorts to avoid dependency on @dxos/rpc-tunnel so we don't depend on browser-specific apis.
export type IFrameProxyRuntimeParams = {
  config: Config | Provider<MaybePromise<Config>>;
  systemPort: RpcPort;
  workerAppPort: RpcPort;
  windowAppPort: RpcPort;
  shellPort?: RpcPort;
};

/**
 * Manages the client connection to the shared worker.
 */
export class IFrameProxyRuntime {
  private readonly _configProvider: IFrameProxyRuntimeParams['config'];
  private readonly _systemPort: RpcPort;
  private readonly _windowAppPort: RpcPort;
  private readonly _workerAppPort: RpcPort;
  private readonly _shellPort?: RpcPort;
  private _config!: Config;
  private _transportService!: BridgeService;
  private _systemRpc!: ProtoRpcPeer<WorkerServiceBundle>;
  private _shellRuntime?: ShellRuntimeImpl;

  constructor({ config, systemPort, workerAppPort, windowAppPort, shellPort }: IFrameProxyRuntimeParams) {
    this._configProvider = config;
    this._systemPort = systemPort;
    this._windowAppPort = windowAppPort;
    this._workerAppPort = workerAppPort;
    this._shellPort = shellPort;

    this._workerAppPort.subscribe((msg) => this._windowAppPort.send(msg));
    this._windowAppPort.subscribe((msg) => this._workerAppPort.send(msg));

    if (this._shellPort) {
      this._shellRuntime = new ShellRuntimeImpl(this._shellPort);
    }
  }

  get shell(): ShellRuntime | undefined {
    return this._shellRuntime;
  }

  async open(origin: string) {
    this._config = await getAsyncValue(this._configProvider);

    this._transportService = new WebRTCTransportService({
      iceServers: this._config.get('runtime.services.ice')
    });

    this._systemRpc = createProtoRpcPeer({
      requested: workerServiceBundle,
      exposed: iframeServiceBundle,
      handlers: {
        BridgeService: this._transportService,
        IframeService: {
          async heartbeat() {
            // Ok.
          }
        }
      },
      port: this._systemPort,
      timeout: 200
    });

    try {
      await this._systemRpc.open();
      await this._systemRpc.rpc.WorkerService.start({ origin });
    } catch (err) {
      log.catch(err);
      throw new RemoteServiceConnectionError('Failed to connect to worker');
    }
    await this._shellRuntime?.open();
  }

  async close() {
    await this._shellRuntime?.close();
    await this._systemRpc.rpc.WorkerService.stop();
    await this._systemRpc.close();
  }
}
