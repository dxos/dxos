//
// Copyright 2022 DXOS.org
//

import { WebRTCTransportService } from '@dxos/network-manager';
import { BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { createProtoRpcPeer, ProtoRpcPeer, RpcPort } from '@dxos/rpc';
import { PortMuxer } from '@dxos/rpc-tunnel';

import { iframeServiceBundle, WorkerServiceBundle, workerServiceBundle } from './services';

export type IframeRuntimeParams = {
  portMuxer: PortMuxer;
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

  constructor({ portMuxer }: IframeRuntimeParams) {
    // TODO(dmaretskyi): Extract port names to config.ts.
    this._systemPort = portMuxer.createWorkerPort({ channel: 'dxos:system' });
    this._workerAppPort = portMuxer.createWorkerPort({ channel: 'dxos:app' });
    this._windowAppPort = portMuxer.createIFramePort({
      channel: 'dxos:app',
      onOrigin: (origin) => this.open(origin)
    });

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
  }

  start() {
    this._workerAppPort.subscribe((msg) => this._windowAppPort.send(msg));
    this._windowAppPort.subscribe((msg) => this._workerAppPort.send(msg));

    window.addEventListener('beforeunload', () => {
      this.close().catch((err) => console.error(err));
    });
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
