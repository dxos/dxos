//
// Copyright 2022 DXOS.org
//

import { Trigger } from '@dxos/async';
import {
  iframeServiceBundle,
  type ShellRuntime,
  workerServiceBundle,
  type WorkerServiceBundle,
} from '@dxos/client-protocol';
import { type Config } from '@dxos/config';
import { log } from '@dxos/log';
import { SimplePeerTransportService } from '@dxos/network-manager';
import { RemoteServiceConnectionError } from '@dxos/protocols';
import { type BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { createProtoRpcPeer, type ProtoRpcPeer, type RpcPort } from '@dxos/rpc';
import { getAsyncValue, type MaybePromise, type Provider } from '@dxos/util';

import { ShellRuntimeImpl } from './shell-runtime';

// NOTE: Keep as RpcPorts to avoid dependency on @dxos/rpc-tunnel so we don't depend on browser-specific apis.
export type IFrameProxyRuntimeParams = {
  config: Config | Provider<MaybePromise<Config>>;
  systemPort: RpcPort;
  shellPort?: RpcPort;
};

/**
 * Manages the client connection to the shared worker.
 */
export class IFrameProxyRuntime {
  private readonly _id = String(Math.floor(Math.random() * 1000000));
  private readonly _configProvider: IFrameProxyRuntimeParams['config'];
  private readonly _systemPort: RpcPort;
  private readonly _shellPort?: RpcPort;
  private _release = new Trigger();
  private _config!: Config;
  private _transportService!: BridgeService;
  private _systemRpc!: ProtoRpcPeer<WorkerServiceBundle>;
  private _shellRuntime?: ShellRuntimeImpl;

  constructor({ config, systemPort, shellPort }: IFrameProxyRuntimeParams) {
    this._configProvider = config;
    this._systemPort = systemPort;
    this._shellPort = shellPort;

    if (this._shellPort) {
      this._shellRuntime = new ShellRuntimeImpl(this._shellPort);
    }
  }

  get shell(): ShellRuntime | undefined {
    return this._shellRuntime;
  }

  async open(origin: string) {
    this._config = await getAsyncValue(this._configProvider);

    this._transportService = new SimplePeerTransportService({
      iceServers: this._config.get('runtime.services.ice'),
    });

    this._systemRpc = createProtoRpcPeer({
      requested: workerServiceBundle,
      exposed: iframeServiceBundle,
      handlers: {
        BridgeService: this._transportService,
      },
      port: this._systemPort,
      timeout: 200,
    });

    let lockKey: string | undefined;
    if (typeof navigator !== 'undefined') {
      lockKey = this._lockKey(origin);
      this._release = new Trigger();
      const ready = new Trigger();
      void navigator.locks.request(lockKey, async () => {
        ready.wake();
        await this._release.wait();
      });
      await ready.wait();
    }

    try {
      await this._systemRpc.open();
      await this._systemRpc.rpc.WorkerService.start({ origin, lockKey });
    } catch (err) {
      log.catch(err);
      throw new RemoteServiceConnectionError('Failed to connect to worker');
    }
    await this._shellRuntime?.open();
  }

  async close() {
    this._release.wake();
    await this._shellRuntime?.close();
    await this._systemRpc.rpc.WorkerService.stop();
    await this._systemRpc.close();
  }

  private _lockKey(origin: string) {
    return `${origin}-${this._id}`;
  }
}
