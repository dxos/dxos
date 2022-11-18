//
// Copyright 2022 DXOS.org
//

import { WebRTCTransportService } from '@dxos/network-manager';
import { BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { createProtoRpcPeer, ProtoRpcPeer, RpcPort } from '@dxos/rpc';

import { iframeServiceBundle, WorkerServiceBundle, workerServiceBundle } from './services';

// NOTE: Keep as RpcPorts to avoid dependency on @dxos/rpc-tunnel so we don't depend on browser-specific apis.
export type IframeRuntimeParams = {
  systemPort: RpcPort;
  workerAppPort: RpcPort;
  windowAppPort: RpcPort;
};

/**
 * Manages the client connection to the shared worker.
 */
export class IFrameRuntime {
  private readonly _systemPort: RpcPort;
  private readonly _windowAppPort: RpcPort;
  private readonly _workerAppPort: RpcPort;
  private readonly _systemRpc: ProtoRpcPeer<WorkerServiceBundle>;
  private readonly _transportService = new WebRTCTransportService();

  constructor({ systemPort, workerAppPort, windowAppPort }: IframeRuntimeParams) {
    this._systemPort = systemPort;
    this._windowAppPort = windowAppPort;
    this._workerAppPort = workerAppPort;

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
      port: this._systemPort,
      timeout: 200
    });

    this._workerAppPort.subscribe((msg) => this._windowAppPort.send(msg));
    this._windowAppPort.subscribe((msg) => this._workerAppPort.send(msg));
  }

  async open(origin: string) {
    await this._systemRpc.open();
    await this._systemRpc.rpc.WorkerService.start({ origin });
  }

  async close() {
    await this._systemRpc.rpc.WorkerService.stop();
    await this._systemRpc.close();
  }
}
