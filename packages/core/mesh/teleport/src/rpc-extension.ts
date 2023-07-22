//
// Copyright 2022 DXOS.org
//

import invariant from 'tiny-invariant';

import { createProtoRpcPeer, ProtoRpcPeer, ProtoRpcPeerOptions } from '@dxos/rpc';

import { ExtensionContext, TeleportExtension } from './teleport';

export abstract class RpcExtension<Client, Server> implements TeleportExtension {
  // TODO(dmaretskyi): Type optionally.
  private _extensionContext!: ExtensionContext;
  private _rpc?: ProtoRpcPeer<Client>;

  private _isClosed = false;

  constructor(private readonly _rpcParams: Omit<ProtoRpcPeerOptions<Client, Server>, 'port' | 'handlers'>) {}

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
    invariant(this._rpc);
    return this._rpc.rpc;
  }

  protected abstract getHandlers(): Promise<Server>;

  async onOpen(context: ExtensionContext): Promise<void> {
    this._extensionContext = context;

    const handlers = await this.getHandlers();

    if (this._isClosed) {
      return;
    }

    const port = context.createPort('rpc', {
      contentType: 'application/x-protobuf; messageType="dxos.rpc.Message"',
    });
    this._rpc = createProtoRpcPeer({
      ...this._rpcParams,
      handlers,
      port,
    });

    await this._rpc.open();
  }

  async onClose(err?: Error | undefined): Promise<void> {
    this._isClosed = true;
    await this._rpc?.close();
  }

  close() {
    this._extensionContext.close();
  }
}
