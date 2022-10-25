//
// Copyright 2022 DXOS.org
//

import { WebRTCTransportService } from '@dxos/network-manager';
import { BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { createProtoRpcPeer, ProtoRpcPeer, RpcPort } from '@dxos/rpc';

import {
  iframeServiceBundle,
  WorkerServiceBundle,
  workerServiceBundle
} from './services';

export type IframeRuntimeParams = {
  systemPort: RpcPort;
  appOrigin: string;
};

/**
 * Manages the client connection to the shared worker.
 */
export class IframeRuntime {
  private readonly _systemRpc: ProtoRpcPeer<WorkerServiceBundle>;
  private readonly _transportService = new WebRTCTransportService();
  private readonly _appOrigin: string;

  constructor({ systemPort, appOrigin }: IframeRuntimeParams) {
    this._appOrigin = appOrigin;
    this._systemRpc = createProtoRpcPeer({
      requested: workerServiceBundle,
      exposed: iframeServiceBundle,
      handlers: {
        BridgeService: this._transportService as BridgeService,
        IframeService: {
          async heartbeat() {
            // Ok.
          }
        }
      },
      port: systemPort,
      timeout: 200
    });
  }

  async open() {
    await this._systemRpc.open();
    await this._systemRpc.rpc.WorkerService.start({
      origin: this._appOrigin
    });
  }

  async close() {
    await this._systemRpc.rpc.WorkerService.stop();
    await this._systemRpc.close();
  }
}
