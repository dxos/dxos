//
// Copyright 2022 DXOS.org
//

import { WebRTCTransportService } from '@dxos/network-manager';
import { BridgeService } from '@dxos/protocols/proto/dxos/mesh/bridge';
import { createProtoRpcPeer, ProtoRpcPeer, RpcPort } from '@dxos/rpc';

import { iframeServiceBundle, WorkerServiceBundle, workerServiceBundle } from './services';
import { ShellRuntime, ShellRuntimeImpl } from './shell-runtime';

// NOTE: Keep as RpcPorts to avoid dependency on @dxos/rpc-tunnel so we don't depend on browser-specific apis.
export type IFrameProxyRuntimeParams = {
  systemPort: RpcPort;
  workerAppPort: RpcPort;
  windowAppPort: RpcPort;
  shellPort?: RpcPort;
};

/**
 * Manages the client connection to the shared worker.
 */
export class IFrameProxyRuntime {
  private readonly _systemPort: RpcPort;
  private readonly _windowAppPort: RpcPort;
  private readonly _workerAppPort: RpcPort;
  private readonly _shellPort?: RpcPort;
  private readonly _systemRpc: ProtoRpcPeer<WorkerServiceBundle>;
  private readonly _shellRuntime?: ShellRuntimeImpl;
  private readonly _transportService = new WebRTCTransportService();

  constructor({ systemPort, workerAppPort, windowAppPort, shellPort }: IFrameProxyRuntimeParams) {
    this._systemPort = systemPort;
    this._windowAppPort = windowAppPort;
    this._workerAppPort = workerAppPort;
    this._shellPort = shellPort;

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

    if (this._shellPort) {
      this._shellRuntime = new ShellRuntimeImpl(this._shellPort);
    }
  }

  get shell(): ShellRuntime | undefined {
    return this._shellRuntime;
  }

  async open(origin: string) {
    await this._systemRpc.open();
    await this._systemRpc.rpc.WorkerService.start({ origin });
    await this._shellRuntime?.open();
  }

  async close() {
    await this._shellRuntime?.close();
    await this._systemRpc.rpc.WorkerService.stop();
    await this._systemRpc.close();
  }
}
