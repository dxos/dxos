//
// Copyright 2024 DXOS.org
//

import { type Message, NetworkAdapter, type PeerId } from '@automerge/automerge-repo';

import { Trigger, sleep } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

export type TestConnectionStateProvider = () => 'on' | 'off';

export class TestAdapter extends NetworkAdapter {
  static createPair(
    connectionStateProvider: TestConnectionStateProvider = () => 'on',
    onMessage?: (message: Message) => void,
  ): TestAdapter[] {
    const adapter1: TestAdapter = new TestAdapter({
      send: (message: Message) => {
        onMessage?.(message);
        if (connectionStateProvider() === 'on') {
          void sleep(10).then(() => adapter2.receive(message));
        }
      },
    });
    const adapter2: TestAdapter = new TestAdapter({
      send: (message: Message) => {
        onMessage?.(message);
        if (connectionStateProvider() === 'on') {
          void sleep(10).then(() => adapter1.receive(message));
        }
      },
    });

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
