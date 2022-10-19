import { WebRTCTransportService } from "@dxos/network-manager";
import { schema } from "@dxos/protocols";
import { createProtoRpcPeer, ProtoRpcPeer, RpcPort } from "@dxos/rpc"
import { BridgeService } from "@dxos/protocols/proto/dxos/mesh/bridge";

export type IframeRuntimeParams = {
  systemPort: RpcPort
}

export class IframeRuntime {
  private readonly _systemRpc: ProtoRpcPeer<{}>
  private readonly _transportService = new WebRTCTransportService();

  constructor(params: IframeRuntimeParams) {
    this._systemRpc = createProtoRpcPeer({
      requested: {},
      exposed: {
        BridgeService: schema.getService('dxos.mesh.bridge.BridgeService')
      },
      handlers: {
        BridgeService: this._transportService as BridgeService
      },
      port: params.systemPort
    });
  }

  async open() {
    await this._systemRpc.open()
  }

  async close() {
    await this._systemRpc.close()
  }
}