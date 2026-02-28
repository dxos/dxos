//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { type GenService, type GenServiceMethods } from '@dxos/protocols/buf';
import { type Rpc } from '@dxos/protocols';
import {
  type BufProtoRpcPeer,
  type BufProtoRpcPeerOptions,
  createBufProtoRpcPeer,
} from '@dxos/rpc';

import { type ExtensionContext, type TeleportExtension } from './teleport';

/**
 * Base class for teleport extensions using buf-generated service definitions.
 * Replaces `RpcExtension` which uses protobuf.js-based `createProtoRpcPeer`.
 */
export abstract class BufRpcExtension<
  Client extends Record<string, GenService<GenServiceMethods>>,
  Server extends Record<string, GenService<GenServiceMethods>>,
> implements TeleportExtension
{
  private _extensionContext!: ExtensionContext;
  private _rpc?: BufProtoRpcPeer<Client>;
  private _isClosed = false;

  constructor(
    private readonly _rpcProps: Omit<BufProtoRpcPeerOptions<Client, Server>, 'port' | 'handlers'>,
  ) {}

  get initiator() {
    return this._extensionContext?.initiator;
  }

  get localPeerId() {
    return this._extensionContext?.localPeerId;
  }

  get remotePeerId() {
    return this._extensionContext?.remotePeerId;
  }

  get rpc(): { [K in keyof Client]: Rpc.BufRpcClient<Client[K]> } {
    invariant(this._rpc);
    return this._rpc.rpc;
  }

  protected abstract getHandlers(): Promise<Rpc.BufServiceHandlers<Server>>;

  async onOpen(context: ExtensionContext): Promise<void> {
    this._extensionContext = context;

    const handlers = await this.getHandlers();

    if (this._isClosed) {
      return;
    }

    const port = await context.createPort('rpc', {
      contentType: 'application/x-protobuf; messageType="dxos.rpc.Message"',
    });
    this._rpc = createBufProtoRpcPeer({
      ...this._rpcProps,
      handlers,
      port,
    });

    await this._rpc.open();
  }

  async onClose(err?: Error | undefined): Promise<void> {
    this._isClosed = true;
    await this._rpc?.close();
  }

  async onAbort(err?: Error | undefined): Promise<void> {
    this._isClosed = true;
    await this._rpc?.abort();
  }

  close(): void {
    this._extensionContext?.close();
  }
}
