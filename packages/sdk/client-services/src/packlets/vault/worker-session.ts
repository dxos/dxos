//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { asyncTimeout, Trigger } from '@dxos/async';
import { iframeServiceBundle, IframeServiceBundle, workerServiceBundle } from '@dxos/client';
import { log, logInfo } from '@dxos/log';
import { BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { createProtoRpcPeer, ProtoRpcPeer, RpcPort } from '@dxos/rpc';
import { Callback } from '@dxos/util';

import { ClientServicesHost } from '../services';
import { ClientRpcServer, ClientRpcServerParams } from '../services/client-rpc-server';

export type WorkerSessionParams = {
  serviceHost: ClientServicesHost;
  systemPort: RpcPort;
  appPort: RpcPort;
  shellPort: RpcPort;
  readySignal: Trigger<Error | undefined>;
  options?: {
    heartbeatInterval: number;
  };
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
  private readonly _options: NonNullable<WorkerSessionParams['options']>;
  private _heartbeatTimer?: NodeJS.Timeout;

  public readonly onClose = new Callback<() => Promise<void>>();

  @logInfo
  public origin?: string;

  public bridgeService?: BridgeService;

  constructor({
    serviceHost,
    systemPort,
    appPort,
    shellPort,
    readySignal,
    options = {
      heartbeatInterval: 1_000
    }
  }: WorkerSessionParams) {
    assert(options);
    assert(serviceHost);
    this._options = options;
    this._serviceHost = serviceHost;

    const middleware: Pick<ClientRpcServerParams, 'handleCall' | 'handleStream'> = {
      handleCall: async (method, params, handler) => {
        const error = await readySignal.wait({ timeout: 3_000 });
        if (error) {
          throw error;
        }

        return handler(method, params);
      },
      handleStream: async (method, params, handler) => {
        const error = await readySignal.wait({ timeout: 3_000 });
        if (error) {
          throw error;
        }

        return handler(method, params);
      }
    };

    this._clientRpc = new ClientRpcServer({
      serviceRegistry: this._serviceHost.serviceRegistry,
      port: appPort,
      ...middleware
    });
    this._shellClientRpc = new ClientRpcServer({
      serviceRegistry: this._serviceHost.serviceRegistry,
      port: shellPort,
      ...middleware
    });

    this._iframeRpc = createProtoRpcPeer({
      requested: iframeServiceBundle,
      exposed: workerServiceBundle,
      handlers: {
        WorkerService: {
          start: async (request) => {
            this.origin = request.origin;
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
          }
        }
      },
      port: systemPort,
      timeout: 1000 // With low timeout heartbeat may fail if the tab's thread is saturated.
    });

    this.bridgeService = this._iframeRpc.rpc.BridgeService;
  }

  async open() {
    log.info('opening..');
    await Promise.all([this._clientRpc.open(), this._iframeRpc.open(), this._maybeOpenShell()]);

    await this._startTrigger.wait({ timeout: 3_000 });

    // Detect if bridge is present.
    // TODO(burdon): Add heartbeat to client's System service.
    //  How do we detect if the client's tab closed?
    this._heartbeatTimer = setInterval(async () => {
      try {
        await this._iframeRpc.rpc.IframeService.heartbeat();
      } catch (err) {
        log.warn('Heartbeat failed', { err });
        try {
          await this.close();
        } catch (err: any) {
          log.catch(err);
        }
      }
    }, this._options.heartbeatInterval);
  }

  async close() {
    log.info('closing..');
    try {
      await this.onClose.callIfSet();
    } catch (err: any) {
      log.catch(err);
    }

    if (this._heartbeatTimer !== undefined) {
      clearInterval(this._heartbeatTimer);
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
}
