//
// Copyright 2024 DXOS.org
//

import { Trigger, sleep } from '@dxos/async';
import { type Message, NetworkAdapter, type PeerId } from '@dxos/automerge/automerge-repo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

export class TestAdapter extends NetworkAdapter {
  static createPair() {
    const adapter1: TestAdapter = new TestAdapter({
      send: (message: Message) => sleep(10).then(() => adapter2.receive(message)),
    });
    const adapter2: TestAdapter = new TestAdapter({
      send: (message: Message) => sleep(10).then(() => adapter1.receive(message)),
    });

    return [adapter1, adapter2];
  }

  public onConnect = new Trigger();

  constructor(private readonly _params: { send: (message: Message) => void }) {
    super();
  }

  // NOTE: Emitting `ready` event in NetworkAdapter`s constructor causes a race condition
  //       because `Repo` waits for `ready` event (which it never receives) before it starts using the adapter.
  ready() {
    this.emit('ready', { network: this });
  }

  override connect(peerId: PeerId) {
    this.peerId = peerId;
    this.onConnect.wake();
  }

  peerCandidate(peerId: PeerId) {
    invariant(peerId, 'PeerId is required');
    this.emit('peer-candidate', { peerId, peerMetadata: {} });
  }

  peerDisconnected(peerId: PeerId) {
    invariant(peerId, 'PeerId is required');
    this.emit('peer-disconnected', { peerId });
  }

  override send(message: Message) {
    log('send', { from: message.senderId, to: message.targetId, type: message.type });
    this._params.send(message);
  }

  override disconnect() {
    this.peerId = undefined;
  }

  receive(message: Message) {
    invariant(this.peerId, 'Peer id is not set');
    this.emit('message', message);
  }
}
