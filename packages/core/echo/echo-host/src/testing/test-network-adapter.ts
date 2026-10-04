//
// Copyright 2024 DXOS.org
//

import { type Message, NetworkAdapter, type PeerId } from '@automerge/automerge-repo';

import { Trigger, sleep } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

export type TestConnectionStateProvider = () => 'on' | 'off';

export type TestTransportOptions = {
  /**
   * Each message leaves only after the previous one's round trip, as the mesh replicator's
   * `sendSyncMessage` RPC does, so the link carries one message per `serialRoundTripMs`.
   */
  serialRoundTripMs?: number;
};

export class TestAdapter extends NetworkAdapter {
  static createPair(
    connectionStateProvider: TestConnectionStateProvider = () => 'on',
    onMessage?: (message: Message) => void,
    transport: TestTransportOptions = {},
  ): TestAdapter[] {
    const createSend = (receiver: () => TestAdapter) => {
      const deliver = (message: Message) => {
        const target = receiver();
        if (connectionStateProvider() === 'on' && target.peerId) {
          target.receive(message);
        }
      };
      let previousRoundTrip = Promise.resolve();
      return (message: Message) => {
        onMessage?.(message);
        if (connectionStateProvider() !== 'on') {
          return;
        }
        const roundTripMs = transport.serialRoundTripMs;
        if (roundTripMs === undefined) {
          void sleep(10).then(() => deliver(message));
          return;
        }
        previousRoundTrip = previousRoundTrip.then(async () => {
          await sleep(roundTripMs / 2);
          deliver(message);
          await sleep(roundTripMs / 2);
        });
      };
    };
    const adapter1: TestAdapter = new TestAdapter({ send: createSend(() => adapter2) });
    const adapter2: TestAdapter = new TestAdapter({ send: createSend(() => adapter1) });

    return [adapter1, adapter2];
  }

  public onConnect = new Trigger();

  constructor(private readonly _params: { send: (message: Message) => void }) {
    super();
  }

  override isReady(): boolean {
    return true;
  }

  override whenReady(): Promise<void> {
    return Promise.resolve();
  }

  override connect(peerId: PeerId): void {
    this.peerId = peerId;
    this.onConnect.wake();
  }

  peerCandidate(peerId: PeerId): void {
    invariant(peerId, 'PeerId is required');
    this.emit('peer-candidate', { peerId, peerMetadata: {} });
  }

  peerDisconnected(peerId: PeerId): void {
    invariant(peerId, 'PeerId is required');
    this.emit('peer-disconnected', { peerId });
  }

  override send(message: Message): void {
    log('send', { from: message.senderId, to: message.targetId, type: message.type });
    this._params.send(message);
  }

  override disconnect(): void {
    this.peerId = undefined;
  }

  receive(message: Message): void {
    invariant(this.peerId, 'Peer id is not set');
    this.emit('message', message);
  }
}
