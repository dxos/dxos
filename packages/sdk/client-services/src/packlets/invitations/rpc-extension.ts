//
// Copyright 2022 DXOS.org
//

import { createProtoRpcPeer, ProtoRpcPeer, ProtoRpcPeerOptions } from '@dxos/rpc';
import { ExtensionContext, TeleportExtension } from '@dxos/teleport';

export abstract class RpcExtension<Client, Server> implements TeleportExtension {
  private _extensionContext!: ExtensionContext;
  private _rpc!: ProtoRpcPeer<Client>;

  constructor(private readonly _params: Omit<ProtoRpcPeerOptions<Client, Server>, 'port' | 'handlers'>) {}

  get initiator() {
    return this._extensionContext.initiator;
  }

  get localPeerId() {
    return this._extensionContext.localPeerId;
  }

  get remotePeerId() {
    return this._extensionContext.remotePeerId;
  }

  get rpc(): Client {
    return this._rpc.rpc;
  }

  protected abstract getHandlers(): Promise<Server>;

  async onOpen(context: ExtensionContext): Promise<void> {
    this._extensionContext = context;

    const handlers = await this.getHandlers();

    const port = context.createPort('rpc', {
      contentType: 'application/x-protobuf; messageType="dxos.rpc.Message"'
    });
    this._rpc = createProtoRpcPeer({
      ...this._params,
      handlers,
      port
    });

    await this._rpc.open();
  }

  async onClose(err?: Error | undefined): Promise<void> {
    await this._rpc.close();
  }

  close() {
    this._extensionContext.close();
  }
}
