//
// Copyright 2023 DXOS.org
//

import { PublicKey } from '@dxos/keys';
import { createIFrame } from '@dxos/rpc-tunnel';
import { type MaybePromise } from '@dxos/util';

export class IFrameManager {
  private _iframe?: HTMLIFrameElement;
  private readonly _source: URL;
  private readonly _onOpen?: () => MaybePromise<void>;
  private readonly _onMessage?: (event: MessageEvent) => MaybePromise<void>;

  constructor({
    source,
    onOpen,
    onMessage,
  }: {
    source: URL;
    onOpen?: () => MaybePromise<void>;
    onMessage?: (event: MessageEvent) => MaybePromise<void>;
  }) {
    this._source = source;
    this._onOpen = onOpen;
    this._onMessage = onMessage;
    this._messageHandler = this._messageHandler.bind(this);
  }

  get source() {
    return this._source;
  }

  get iframe() {
    return this._iframe;
  }

  async open(): Promise<void> {
    if (this._iframe) {
      return;
    }

    window.addEventListener('message', this._messageHandler);
    const iframeId = `__DXOS_CLIENT_${PublicKey.random().toHex()}__`;
    this._iframe = createIFrame(this._source.toString(), iframeId, { allow: 'clipboard-read; clipboard-write' });

    await this._onOpen?.();
  }

  async close(): Promise<void> {
    window.removeEventListener('message', this._messageHandler);
    this._iframe?.remove();
    this._iframe = undefined;
  }

  private async _messageHandler(event: MessageEvent): Promise<void> {
    void this._onMessage?.(event);
  }
}
