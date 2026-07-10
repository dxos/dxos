//
// Copyright 2022 DXOS.org
//

import { Trigger, asyncTimeout } from '@dxos/async';
import {
  ClientRpcServer,
  type IframeServiceBundle,
  PROXY_CONNECTION_TIMEOUT,
  iframeServiceBundle,
  workerServiceBundle,
} from '@dxos/client-protocol';
import { invariant } from '@dxos/invariant';
import { log, logInfo } from '@dxos/log';
import { type BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { type ProtoRpcPeer, type RpcPort, createProtoRpcPeer } from '@dxos/rpc';
import { Callback, type MaybePromise } from '@dxos/util';

import { type ClientServicesHost } from '../services';

export type WorkerSessionProps = {
  serviceHost: ClientServicesHost;
  systemPort: RpcPort;
  appPort: MessagePort;
  // TODO(wittjosiah): Remove shellPort.
  shellPort?: MessagePort;
  readySignal: Trigger<Error | undefined>;
};

/**
 * Represents a tab connection within the worker.
 */
export class WorkerSession {
  private readonly _clientRpc: ClientRpcServer;
  private readonly _shellClientRpc?: ClientRpcServer;
  private readonly _iframeRpc: ProtoRpcPeer<IframeServiceBundle>;
  private readonly _startTrigger = new Trigger();
  private readonly _serviceHost: ClientServicesHost;

  public readonly onClose = new Callback<() => Promise<void>>();

  @logInfo
  public origin?: string;

  @logInfo
  public lockKey?: string;

  public bridgeService?: BridgeService;

  constructor({ serviceHost, systemPort, appPort, shellPort, readySignal }: WorkerSessionProps) {
    invariant(serviceHost);
    this._serviceHost = serviceHost;

    // Hold requests until the worker runtime is ready; propagate startup errors to callers.
    const onRequest = async () => {
      const error = await readySignal.wait({ timeout: PROXY_CONNECTION_TIMEOUT });
      if (error) {
        throw error;
      }
    };

    this._clientRpc = new ClientRpcServer({
      services: () => this._serviceHost.serviceRegistry.services,
      port: appPort,
      onRequest,
    });

    this._shellClientRpc = shellPort
      ? new ClientRpcServer({
          services: () => this._serviceHost.serviceRegistry.services,
          port: shellPort,
          onRequest,
        })
      : undefined;

    this._iframeRpc = createProtoRpcPeer({
      requested: iframeServiceBundle,
      exposed: workerServiceBundle,
      handlers: {
        WorkerService: {
          start: async (request) => {
            this.origin = request.origin;
            this.lockKey = request.lockKey;
            this._startTrigger.wake();
          },

          stop: async () => {
            setTimeout(async () => {
              try {
                await this.close();
              } catch (err: any) {
                log.catch(err);
              }
            });
          },
        },
      },
      port: systemPort,
      timeout: 1_000, // With low timeout heartbeat may fail if the tab's thread is saturated.
    });

    this.bridgeService = this._iframeRpc.rpc.BridgeService;
  }

  async open(): Promise<void> {
    log('opening...');
    await Promise.all([this._clientRpc.open(), this._iframeRpc.open(), this._maybeOpenShell()]);

    // Wait until the worker's RPC service has started.
    await this._startTrigger.wait({ timeout: PROXY_CONNECTION_TIMEOUT });

    // TODO(burdon): Comment required.
    if (this.lockKey) {
      void this._afterLockReleases(this.lockKey, () => this.close());
    }

    log('opened');
  }

  async close(): Promise<void> {
    log.debug('closing...');
    try {
      await this.onClose.callIfSet();
    } catch (err: any) {
      log.catch(err);
    }

    await Promise.all([this._clientRpc.close(), this._shellClientRpc?.close(), this._iframeRpc.close()]);
    log.debug('closed');
  }

  private async _maybeOpenShell(): Promise<void> {
    try {
      this._shellClientRpc && (await asyncTimeout(this._shellClientRpc.open(), 1_000));
    } catch {
      log.info('No shell connected.');
    }
  }

  private _afterLockReleases(lockKey: string, callback: () => MaybePromise<void>): Promise<void> {
    return navigator.locks
      .request(lockKey, () => {
        // No-op.
      })
      .then(callback);
  }
}
