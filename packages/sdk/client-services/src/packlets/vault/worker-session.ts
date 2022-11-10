//
// Copyright 2022 DXOS.org
//

import { Trigger } from '@dxos/async';
import { log } from '@dxos/log';
import { BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { createProtoRpcPeer, ProtoRpcPeer, RpcPort } from '@dxos/rpc';
import { Callback } from '@dxos/util';

import { ClientServicesHost } from '../services';
import { IframeServiceBundle, iframeServiceBundle, workerServiceBundle } from './services';

export type WorkerSessionParams = {
  clientServices: ClientServicesHost;
  systemPort: RpcPort;
  appPort: RpcPort;
  options?: {
    heartbeatInterval: number;
  };
};

/**
 * Represents a tab connection within the worker.
 */
export class WorkerSession {
  private readonly _clientRpc: ProtoRpcPeer<{}>;
  private readonly _systemRpc: ProtoRpcPeer<IframeServiceBundle>;
  private readonly _startTrigger = new Trigger();
  private readonly _options: NonNullable<WorkerSessionParams['options']>;
  private _heartbeatTimer?: NodeJS.Timeout;

  public readonly onClose = new Callback<() => Promise<void>>();

  public origin?: string;
  public bridgeService?: BridgeService;

  constructor({
    clientServices,
    systemPort,
    appPort,
    options = {
      heartbeatInterval: 1000
    }
  }: WorkerSessionParams) {
    this._options = options;

    this._clientRpc = createProtoRpcPeer({
      exposed: clientServices.descriptors,
      handlers: clientServices.services,
      port: appPort
    });

    this._systemRpc = createProtoRpcPeer({
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
      timeout: 200
    });

    this.bridgeService = this._systemRpc.rpc.BridgeService;
  }

  async open() {
    await Promise.all([this._clientRpc.open(), this._systemRpc.open()]);

    await this._startTrigger.wait(); // TODO(dmaretskyi): Timeout.

    this._heartbeatTimer = setInterval(async () => {
      try {
        await this._systemRpc.rpc.IframeService.heartbeat();
      } catch (err) {
        try {
          await this.close();
        } catch (err: any) {
          log.catch(err);
        }
      }
    }, this._options.heartbeatInterval);
  }

  async close() {
    try {
      await this.onClose.callIfSet();
    } catch (err: any) {
      log.catch(err);
    }

    if (this._heartbeatTimer !== undefined) {
      clearInterval(this._heartbeatTimer);
    }

    await Promise.all([this._clientRpc.close(), this._systemRpc.close()]);
  }
}
