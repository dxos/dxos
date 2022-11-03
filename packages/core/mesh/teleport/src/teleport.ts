import { schema } from "@dxos/protocols";
import { PublicKey } from "@dxos/protocols/dist/src/proto/gen/dxos/keys";
import { ControlService } from "@dxos/protocols/dist/src/proto/gen/dxos/mesh/teleport/control";
import { createProtoRpcPeer, ProtoRpcPeer } from "@dxos/rpc";
import { CreateChannelOpts, Muxer, RpcPort } from "./muxing";

export class Teleport {
  private readonly _muxer = new Muxer();
  private readonly _control = new ControlExtension();

  get stream(): NodeJS.ReadWriteStream {
    return this._muxer.stream;
  }

  async open() {
    this._setExtension('dxos.mesh.teleport.control', this._control);
  }

  async close(err?: Error) {
    // TODO(dmaretskyi): Try soft close.

    this._muxer.destroy(err);
  }

  addExtension(name: string, extension: TeleportExtension) {

  }

  private _setExtension(name: string, extension: TeleportExtension) {

  }
}

export type ExtensionContext = {
  remotePeerId: PublicKey
  localPeerId: PublicKey,
  createStream(tag: string, opts?: CreateChannelOpts): NodeJS.ReadWriteStream
  createPort(tag: string, opts?: CreateChannelOpts): RpcPort
  close(err?: Error): void
}

export interface TeleportExtension {
  onOpen(context: ExtensionContext): Promise<void>;
  onClose(err?: Error): Promise<void>;
}

export class ControlExtension implements TeleportExtension {
  private _context!: ExtensionContext;
  private _rpc!: ProtoRpcPeer<{ Control: ControlService }>;

  constructor() {
  }

  async onOpen(context: ExtensionContext): Promise<void> {
    this._context = context;
    this._rpc = createProtoRpcPeer({
      requested: {
        Control: schema.getService('dxos.mesh.teleport.control.ControlService'),
      },
      exposed: {
        Control: schema.getService('dxos.mesh.teleport.control.ControlService'),
      },
      handlers: {
        Control: {
          registerExtension: async (request) => {

          },
          heartbeat: async (request) => {
            // Ok.
          }
        },
      },
      port: context.createPort('rpc', {
        contentType: 'application/x-protobuf; messageType="dxos.rpc.Message"'
      })
    })

    await this._rpc.open()
  }

  async onClose(err?: Error): Promise<void> {
    this._rpc.close()
  }
}