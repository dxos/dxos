//
// Copyright 2026 DXOS.org
//

import { Event } from '@dxos/async';
import { log } from '@dxos/log';

import { type BeaconMessage, type BeaconTransport } from '#types';

const CHANNEL_NAME = 'dxos.iroh-beacon';

/**
 * Validates that the incoming data has the shape of a BeaconMessage.
 */
const isBeaconMessage = (data: unknown): data is BeaconMessage => {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const record = data as Record<string, unknown>;
  return (
    record.type === 'beacon' &&
    typeof record.peerId === 'string' &&
    typeof record.identityKey === 'string' &&
    typeof record.counter === 'number' &&
    typeof record.timestamp === 'number' &&
    typeof record.transport === 'string'
  );
};

/**
 * BeaconTransport backed by BroadcastChannel (same-origin cross-tab messaging).
 * Used as the default transport in browser environments.
 * Will be replaced by iroh QUIC transport when WASM bindings are available.
 */
export class BroadcastChannelTransport implements BeaconTransport {
  readonly onMessage = new Event<BeaconMessage>();
  #channel: BroadcastChannel | undefined;

  async open(): Promise<void> {
    if (this.#channel) {
      return;
    }

    this.#channel = new BroadcastChannel(CHANNEL_NAME);
    this.#channel.onmessage = (event: MessageEvent) => {
      try {
        if (isBeaconMessage(event.data)) {
          this.onMessage.emit(event.data);
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
