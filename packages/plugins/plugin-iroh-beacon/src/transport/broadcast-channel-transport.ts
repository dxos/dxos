//
// Copyright 2026 DXOS.org
//

import { Event } from '@dxos/async';
import { log } from '@dxos/log';

import { type BeaconMessage, type BeaconTransport } from '#types';

const CHANNEL_NAME = 'dxos.iroh-beacon';

/**
 * BeaconTransport backed by BroadcastChannel (same-origin cross-tab messaging).
 * Used as the default transport in browser environments.
 * Will be replaced by iroh QUIC transport when WASM bindings are available.
 */
export class BroadcastChannelTransport implements BeaconTransport {
  readonly onMessage = new Event<BeaconMessage>();
  #channel: BroadcastChannel | undefined;

  async open(): Promise<void> {
    this.#channel = new BroadcastChannel(CHANNEL_NAME);
    this.#channel.onmessage = (event: MessageEvent) => {
      try {
        const message = event.data as BeaconMessage;
        if (message.type === 'beacon') {
          this.onMessage.emit(message);
        }
      } catch (err) {
        log.catch(err as Error);
      }
    };
    log('transport opened', { channel: CHANNEL_NAME });
  }

  async close(): Promise<void> {
    this.#channel?.close();
    this.#channel = undefined;
    log('transport closed');
  }

  broadcast(message: BeaconMessage): void {
    this.#channel?.postMessage(message);
  }
}
