//
// Copyright 2021 DXOS.org
//

import { EventEmitter } from 'events';
import assert from 'node:assert';

/**
 * @typedef Peer
 * @prop {Buffer} id
 * @prop {Buffer} topic
 * @prop {Buffer} owner
 * @prop {NanomessageRPC} [rpc]
 */
interface Peer {
  id: Buffer,
  topic: Buffer,
  owner: Buffer,
  rpc: any[]
}

export class PeerMap extends EventEmitter {
  private readonly _owner: Buffer;
  private readonly _peersByTopic: Map<string, Map<string, Peer>>;

  constructor (owner: Buffer) {
    super();

    this._owner = owner;
    this._peersByTopic = new Map();
  }

  get peers () : Peer[] {
    const result = [];
    for (const peers of this._peersByTopic.values()) {
      for (const peer of peers.values()) {
        result.push(peer);
      }
    }
    return result;
  }

  get topics (): Array<Buffer> {
    return Array.from(this._peersByTopic.keys()).map(topic => Buffer.from(topic, 'hex'));
  }

  /**
   * Add a new peer
   */
  add (opts: {
    id?: Buffer,
    topic?: Buffer,
    owner?: Buffer,
    rpc?: any,
  } = {}): Peer {
    const { id, topic, owner = this._owner, rpc } = opts;

    assert(id && Buffer.isBuffer(id));
    assert(topic && Buffer.isBuffer(topic));

    const idStr = id.toString('hex');
    const topicStr = topic.toString('hex');

    let peers;
    if (this._peersByTopic.has(topicStr)) {
      peers = this._peersByTopic.get(topicStr);
    } else {
      peers = new Map();
      this._peersByTopic.set(topicStr, peers);
    }

    const peer = {
      id,
      topic,
      owner,
      rpc
    };

    peers?.set(idStr, peer);
    if (this._owner.equals(owner)) {
      this.emit('peer-added', peer);
    }

    return peer;
  }

  /**
   * Delete a peer by topic and id
   */
  delete (topic: Buffer, id: Buffer): boolean {
    const peer = this._delete(topic, id);

    if (peer) {
      if (this._owner.equals(peer.owner)) {
        this.emit('peer-deleted', peer);
      }

      return true;
    }

    return false;
  }

  getPeersByTopic (topic: Buffer): Peer[] {
    const topicStr = topic.toString('hex');
    if (!this._peersByTopic.has(topicStr)) {
      return [];
    }
    const peers = this._peersByTopic.get(topicStr);
    return Array.from(peers?.values() ?? []);
  }

  deletePeersByOwner (owner: Buffer) {
    for (const peer of this.peers) {
      if (!peer.owner.equals(owner)) {
        continue;
      }
      this._delete(peer.topic, peer.id);
    }
  }

  /**
   * @param {NanomessageRPC} rpc
   */
  deletePeersByRPC (rpc: any) {
    for (const peer of this.peers) {
      if (peer.rpc !== rpc) {
        continue;
      }
      this._delete(peer.topic, peer.id);
    }
  }

  updatePeersByOwner (owner: Buffer, peers: Array<{ id: Buffer, topic: Buffer }>) {
    this.deletePeersByOwner(owner);
    peers.forEach(peer => this.add({
      id: peer.id,
      topic: peer.topic,
      owner
    }));
  }

  encode (peer: Peer) {
    return { id: peer.id.toString('hex'), topic: peer.topic.toString('hex'), owner: peer.owner.toString('hex') };
  }

  decode (peer: {id: string, topic: string, owner: string}) {
    return { id: Buffer.from(peer.id, 'hex'), topic: Buffer.from(peer.topic, 'hex'), owner: Buffer.from(peer.owner, 'hex') };
  }

  _delete (topic: Buffer, id: Buffer): Peer | null {
    const topicStr = topic.toString('hex');
    const idStr = id.toString('hex');

    if (this._peersByTopic.has(topicStr)) {
      const peers = this._peersByTopic.get(topicStr);
      if (!peers) {
        return null;
      }
      const peer = peers.get(idStr);
      if (peer) {
        peers.delete(idStr);

        if (peers.size === 0) {
          this._peersByTopic.delete(topicStr);
        }

        return peer;
      }
    }

    return null;
  }
}
