//
// Copyright 2022 DXOS.org
//

import { Trigger } from '@dxos/async';
import { type WorkerServiceBundle, iframeServiceBundle, workerServiceBundle } from '@dxos/client-protocol';
import { type Config } from '@dxos/config';
import { log } from '@dxos/log';
import { createIceProvider } from '@dxos/network-manager';
import { RemoteServiceConnectionError } from '@dxos/protocols';
import { type BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { type ProtoRpcPeer, type RpcPort, createProtoRpcPeer } from '@dxos/rpc';
import { type MaybePromise, type Provider, getAsyncProviderValue } from '@dxos/util';

// NOTE: Keep as RpcPorts to avoid dependency on @dxos/rpc-tunnel so we don't depend on browser-specific apis.
export type SharedWorkerConnectionOptions = {
  config: Config | Provider<MaybePromise<Config>>;
  systemPort: RpcPort;
  /**
   * @deprecated Only used with iframes.
   */
  shellPort?: RpcPort;
};

/**
 * Manages the client connection to the shared worker.
 */
// TODO(dmaretskyi): Rename WorkerConnection.
export class SharedWorkerConnection {
  private readonly _id = String(Math.floor(Math.random() * 1000000));
  private readonly _configProvider: SharedWorkerConnectionOptions['config'];
  private readonly _systemPort: RpcPort;
  private _release = new Trigger();
  private _config!: Config;
  private _transportService!: BridgeService;
  private _systemRpc!: ProtoRpcPeer<WorkerServiceBundle>;

  constructor({ config, systemPort }: SharedWorkerConnectionOptions) {
    this._configProvider = config;
    this._systemPort = systemPort;
  }

  async open(params: { origin: string }): Promise<void> {
    log('shared-worker-connection: opening', { id: this._id, origin: params.origin });
    const { RtcTransportService } = await import('@dxos/network-manager');
    log('shared-worker-connection: RtcTransportService imported, resolving config');

    this._config = await getAsyncProviderValue(this._configProvider);
    log('shared-worker-connection: config resolved');

    this._transportService = new RtcTransportService(
      { iceServers: [...(this._config.get('runtime.services.ice') ?? [])] },
      this._config.get('runtime.services.iceProviders') &&
        createIceProvider(this._config.get('runtime.services.iceProviders')!),
    );

    this._systemRpc = createProtoRpcPeer({
      requested: workerServiceBundle,
      exposed: iframeServiceBundle,
      handlers: {
        BridgeService: this._transportService,
      },
      port: this._systemPort,
      // TODO(wittjosiah): Make longer and factor out to constant.
      // TODO(wittjosiah): If this is too long then it breaks the reset flows in Composer.
      timeout: 200,
    });

    // TODO(dmaretskyi): Replace with injected locks interface.
    let lockKey: string | undefined;
    if (typeof navigator !== 'undefined' && typeof navigator.locks !== 'undefined') {
      lockKey = this._lockKey(params.origin);
      this._release = new Trigger();
      const ready = new Trigger();
      log('shared-worker-connection: requesting tab-liveness lock', { lockKey });
      void navigator.locks.request(lockKey, async () => {
        ready.wake();
        await this._release.wait();
      });
      await ready.wait();
      log('shared-worker-connection: tab-liveness lock acquired');
    }

    try {
      log('shared-worker-connection: opening system RPC peer');
      await this._systemRpc.open();
      log('shared-worker-connection: system RPC peer opened, calling WorkerService.start');
      await this._systemRpc.rpc.WorkerService.start({ lockKey, ...params });
      log('shared-worker-connection: WorkerService.start returned');
    } catch (err) {
      log.catch(err);
      throw new RemoteServiceConnectionError({ message: 'Failed to connect to worker' });
    }
  }

  async close(): Promise<void> {
    log('shared-worker-connection: closing', { id: this._id });
    this._release.wake();
    try {
      await this._systemRpc.rpc.WorkerService.stop();
    } catch {
      // If this fails, the worker is probably already gone.
    }
    await this._systemRpc.close();
    log('shared-worker-connection: closed');
  }

  private _lockKey(origin: string): string {
    return `${origin}-${this._id}`;
  }
}
