import { createProtoRpcPeer, ProtoRpcPeer, RpcPort } from "@dxos/rpc";
import { clientServiceBundle } from '@dxos/client';
import { schema } from '@dxos/protocols';
import { ClientServices } from "@dxos/client-services";
import { BridgeService } from "@dxos/protocols/proto/dxos/mesh/bridge";

export type WorkerSessionParams = {
  appPort: RpcPort
  systemPort: RpcPort
  services: ClientServices
}


export class WorkerSession {
  private readonly _clientServices: ClientServices;
  private readonly _appRpc: ProtoRpcPeer<{}>
  private readonly _systemRpc: ProtoRpcPeer<{
    BridgeService: BridgeService
  }>

  public bridgeService?: BridgeService

  constructor(params: WorkerSessionParams) {
    this._clientServices = params.services

    this._appRpc = createProtoRpcPeer({
      requested: {},
      exposed: clientServiceBundle,
      handlers: this._clientServices,
      port: params.appPort,
    });

    this._systemRpc = createProtoRpcPeer({
      requested: {
        BridgeService: schema.getService('dxos.mesh.bridge.BridgeService')
      },
      exposed: {},
      handlers: {},
      port: params.systemPort
    });

    this.bridgeService = this._systemRpc.rpc.BridgeService
  }

  async open() {
    await Promise.all([
      this._appRpc.open(),
      this._systemRpc.open(),
    ])
  }

  async close() {
    await Promise.all([
      this._appRpc.close(),
      this._systemRpc.close(),
    ])
  }
}