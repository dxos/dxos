//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';
import { EventEmitter } from 'node:events';

import { NetworkGenerator } from '@dxos/network-generator';

import { Broadcast, Middleware } from './broadcast.js';

const packetId = (packet: any) => packet.seq.toString('hex') + packet.origin.toString('hex');

class Peer extends EventEmitter {
  public id: any;
  public _peers: any;
  public _messages: any;
  public _broadcast: Broadcast;

  constructor (id: any, opts = {}) {
    super();
    this.id = id;

    this._peers = new Map();
    this._messages = new Map();

    const middleware: Middleware = {
      send: async (packet: any, node: any, options: any) => {
        node.send(packet);
      },
      subscribe: (onData: any, updatePeers: any) => {
        this.on('message', onData);

        const onPeerAdded = () => updatePeers(Array.from(this._peers.values()));
        this.on('peer-added', onPeerAdded);

        return () => {
          this.off('message', onData);
          this.off('peer-added', onPeerAdded);
        };
      }
    };

    this._broadcast = new Broadcast(middleware, {
      id: this.id,
      ...opts
    });

    this._broadcast.packet.on(packet => {
      this._messages.set(packetId(packet), Buffer.from(packet.data!).toString('utf8'));
      this.emit('packet', packet);
    });

    this._broadcast.open();
  }

  get messages () {
    return this._messages;
  }

  get seenMessagesSize () {
    return (this._broadcast as any)._seenSeqs.size;
  }

  send (message: any) {
    this.emit('message', message);
  }

  connect (peer: any) {
    this._peers.set(peer.id.toString('hex'), peer);
    this.emit('peer-added', peer);
  }

  publish (message: any, options: any) {
    return this._broadcast.publish(message, options);
  }

  prune () {
    return this._broadcast.pruneCache();
  }

  close () {
    this._broadcast.close();
  }
}

const publishAndSync = async (peers: any, message: any, opts?: any) => {
  const [peerOrigin, ...peersTarget] = peers;
  const sync = Promise.all(peersTarget.map((peer: any) => new Promise<void>(resolve => peer.once('packet', () => resolve()))));
  const packet = await peerOrigin.publish(message, opts);
  await sync;
  expect(peersTarget.reduce((prev: any, curr: any) => prev && curr.messages.has(packetId(packet)), true)).to.be.true;
  return packet;
};

it('balancedBinTree: broadcast a message.', async function () {
  const generator = new NetworkGenerator({
    createPeer: async (id) => new Peer(id),
    createConnection: (peerFrom: any, peerTo: any) => {
      peerFrom.connect(peerTo);
      peerTo.connect(peerFrom);

      // TODO(marik-d): Fix network generator types.
      return null as any;
    }
  });

  const network = await generator.balancedBinTree(2);
  await publishAndSync(network.peers, Buffer.from('message1'));

  const packet = await publishAndSync(network.peers, Buffer.from('message1'), { seq: Buffer.from('custom-seqno') });
  expect(packet.seq.toString()).to.equal('custom-seqno');

  network.peers.forEach((peer: any) => peer.close());
});

it('complete: broadcast a message.', async function () {
  const generator = new NetworkGenerator({
    createPeer: async (id) => new Peer(id, { maxAge: 1000, maxSize: 2 }),
    createConnection: (peerFrom: any, peerTo: any) => {
      peerFrom.connect(peerTo);
      peerTo.connect(peerFrom);

      // TODO(marik-d): Fix network generator types.
      return null as any;
    }
  });

  const network = await generator.complete(10);

  let time = Date.now();

  await publishAndSync(network.peers, Buffer.from('message1'));
  await publishAndSync(network.peers, Buffer.from('message1'));
  await publishAndSync(network.peers, Buffer.from('message1'));

  // The cache should have always the limit of 100.
  expect(network.peers.slice(1).reduce((prev: any, next: any) => prev && next.seenMessagesSize === 2, true)).to.be.true;

  time = Date.now() - time;
  if (time < 2000) {
    await new Promise(resolve => setTimeout(resolve, 2000 - time));
  }

  network.peers.forEach((peer: any) => peer.prune());
  expect(network.peers.reduce((prev: any, next: any) => prev && next.seenMessagesSize === 0, true)).to.be.true;

  network.peers.forEach((peer: any) => peer.close());
});
