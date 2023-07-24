//
// Copyright 2022 DXOS.org
//

import invariant from 'tiny-invariant';

import { asyncTimeout, Trigger } from '@dxos/async';
import {
  iframeServiceBundle,
  IframeServiceBundle,
  PROXY_CONNECTION_TIMEOUT,
  workerServiceBundle,
} from '@dxos/client-protocol';
import { log, logInfo } from '@dxos/log';
import { BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { createProtoRpcPeer, ProtoRpcPeer, RpcPort } from '@dxos/rpc';
import { Callback, MaybePromise } from '@dxos/util';

import { ClientServicesHost } from '../services';
import { ClientRpcServer, ClientRpcServerParams } from '../services/client-rpc-server';

export type WorkerSessionParams = {
  serviceHost: ClientServicesHost;
  systemPort: RpcPort;
  appPort: RpcPort;
  shellPort: RpcPort;
  readySignal: Trigger<Error | undefined>;
};

/**
 * Represents a tab connection within the worker.
 */
export class WorkerSession {
  private readonly _clientRpc: ClientRpcServer;
  private readonly _shellClientRpc: ClientRpcServer;
  private readonly _iframeRpc: ProtoRpcPeer<IframeServiceBundle>;
  private readonly _startTrigger = new Trigger();
  private readonly _serviceHost: ClientServicesHost;

  public readonly onClose = new Callback<() => Promise<void>>();

  @logInfo
  public origin?: string;

  @logInfo
  public lockKey?: string;

  public bridgeService?: BridgeService;

  constructor({ serviceHost, systemPort, appPort, shellPort, readySignal }: WorkerSessionParams) {
    invariant(serviceHost);
    this._serviceHost = serviceHost;

    const middleware: Pick<ClientRpcServerParams, 'handleCall' | 'handleStream'> = {
      handleCall: async (method, params, handler) => {
        const error = await readySignal.wait({ timeout: PROXY_CONNECTION_TIMEOUT });
        if (error) {
          throw error;
        }

        return handler(method, params);
      },
      handleStream: async (method, params, handler) => {
        const error = await readySignal.wait({ timeout: PROXY_CONNECTION_TIMEOUT });
        if (error) {
          throw error;
        }

        return handler(method, params);
      },
    };

    this._clientRpc = new ClientRpcServer({
      serviceRegistry: this._serviceHost.serviceRegistry,
      port: appPort,
      ...middleware,
    });
    this._shellClientRpc = new ClientRpcServer({
      serviceRegistry: this._serviceHost.serviceRegistry,
      port: shellPort,
      ...middleware,
    });

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
      timeout: 1000, // With low timeout heartbeat may fail if the tab's thread is saturated.
    });

    this.bridgeService = this._iframeRpc.rpc.BridgeService;
  }

  async open() {
    log.info('opening..');
    await Promise.all([this._clientRpc.open(), this._iframeRpc.open(), this._maybeOpenShell()]);

    await this._startTrigger.wait({ timeout: PROXY_CONNECTION_TIMEOUT });
    if (this.lockKey) {
      void this._afterLockReleases(this.lockKey, () => this.close());
    }
  }

  async close() {
    log.info('closing..');
    try {
      await this.onClose.callIfSet();
    } catch (err: any) {
      log.catch(err);
    }

    await Promise.all([this._clientRpc.close(), this._iframeRpc.close()]);
  }

  private async _maybeOpenShell() {
    try {
      await asyncTimeout(this._shellClientRpc.open(), 1_000);
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
