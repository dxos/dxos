import { createProtoRpcPeer, ProtoRpcPeer, RpcPort } from "@dxos/rpc";
import { clientServiceBundle } from '@dxos/client';
import { schema } from '@dxos/protocols';
import { ClientServices } from "@dxos/client-services";
import { BridgeService } from "@dxos/protocols/proto/dxos/mesh/bridge";
import { IframeServiceBundle, iframeServiceBundle, workerServiceBundle } from "./services";
import { Trigger } from "@dxos/async";
import { Callback } from "@dxos/util";

export type WorkerSessionParams = {
  appPort: RpcPort
  systemPort: RpcPort
  services: ClientServices
}


export class WorkerSession {
  private readonly _clientServices: ClientServices;
  private readonly _appRpc: ProtoRpcPeer<{}>
  private readonly _systemRpc: ProtoRpcPeer<IframeServiceBundle>
  private readonly _startTrigger = new Trigger();
  private _heartbeatTimer?: NodeJS.Timeout;
  public origin?: string

  public bridgeService?: BridgeService

  public onClose = new Callback<() => Promise<void>>()

  constructor(params: WorkerSessionParams) {
    this._clientServices = params.services

    this._appRpc = createProtoRpcPeer({
      requested: {},
      exposed: clientServiceBundle,
      handlers: this._clientServices,
      port: params.appPort,
    });

    this._systemRpc = createProtoRpcPeer({
      requested: iframeServiceBundle,
      exposed: workerServiceBundle,
      handlers: {
        WorkerService: {
          start: async (request) => {
            this.origin = request.origin
            this._startTrigger.wake()
          },
          stop: async () => {
            setTimeout(async () => {
              try {
                await this.close()
              } catch (err) {
                console.error(err)
              }
            })
          }
        }
      },
      port: params.systemPort,
      timeout: 200,
    });

    this.bridgeService = this._systemRpc.rpc.BridgeService
  }

  async open() {
    await Promise.all([
      this._appRpc.open(),
      this._systemRpc.open(),
    ])

    await this._startTrigger.wait() // TODO(dmaretskyi): Timeout.

    this._heartbeatTimer = setInterval(async () => {
      try {
        await this._systemRpc.rpc.IframeService.heartbeat()
      } catch (err) {
        try {
          await this.close()
        } catch (err) {
          console.error(err)
        }
      }
    })
  }

  async close() {
    try {
      await this.onClose.callIfSet();
    } catch (err) {
      console.error(err)
    }

    if(this._heartbeatTimer !== undefined) {
      clearInterval(this._heartbeatTimer)
    }

    await Promise.all([
      this._appRpc.close(),
      this._systemRpc.close(),
    ])
  }
}