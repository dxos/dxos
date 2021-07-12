//
// Copyright 2020 DxOS.
//

const { EventEmitter } = require('events');
const assert = require('assert');

/**
 * @typedef Peer
 * @prop {Buffer} id
 * @prop {Buffer} topic
 * @prop {Buffer} owner
 * @prop {NanomessageRPC} [rpc]
 */

class PeerMap extends EventEmitter {
  constructor (owner) {
    super();

    /** @type {Buffer} */
    this._owner = owner;
    /** @type {Map<string, Map<string, Peer>>} */
    this._peersByTopic = new Map();
  }

  /**
   * @type {Array<Peer>}
   */
  get peers () {
    const result = [];
    for (const peers of this._peersByTopic.values()) {
      for (const peer of peers.values()) {
        result.push(peer);
      }
    }
    return result;
  }

  /**
   * @type {Array<Buffer>}
   */
  get topics () {
    return Array.from(this._peersByTopic.keys()).map(topic => Buffer.from(topic, 'hex'));
  }

  /**
   * Add a new peer
   *
   * @param {Object} [opts={}]
   * @param {Buffer} opts.id
   * @param {Buffer} opts.topic
   * @param {Buffer} [opts.owner=this._owner]
   * @param {NanomessageRPC} [opts.rpc]
   * @returns Peer
   */
  add (opts = {}) {
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

    peers.set(idStr, peer);
    if (this._owner.equals(owner)) {
      this.emit('peer-added', peer);
    }

    return peer;
  }

  /**
   * Delete a peer by topic and id
   *
   * @param {Buffer} topic
   * @param {Buffer} id
   * @returns {boolean}
   */
  delete (topic, id) {
    const peer = this._delete(topic, id);

    if (peer) {
      if (this._owner.equals(peer.owner)) {
        this.emit('peer-deleted', peer);
      }

      return true;
    }

    return false;
  }

  /**
   * @param {Buffer} topic
   * @returns {Array<Peer>}
   */
  getPeersByTopic (topic) {
    const topicStr = topic.toString('hex');
    if (!this._peersByTopic.has(topicStr)) return [];
    const peers = this._peersByTopic.get(topicStr);
    return Array.from(peers.values());
  }

  /**
   * @param {Buffer} owner
   */
  deletePeersByOwner (owner) {
    for (const peer of this.peers) {
      if (!peer.owner.equals(owner)) continue;
      this._delete(peer.topic, peer.id);
    }
  }

  /**
   * @param {NanomessageRPC} rpc
   */
  deletePeersByRPC (rpc) {
    for (const peer of this.peers) {
      if (peer.rpc !== rpc) continue;
      this._delete(peer.topic, peer.id);
    }
  }

  /**
   * @param {Buffer} owner
   * @param {Array<{ id: Buffer, topic: Buffer }>} peers
   */
  updatePeersByOwner (owner, peers) {
    this.deletePeersByOwner(owner);
    peers.forEach(peer => this.add({
      id: peer.id,
      topic: peer.topic,
      owner
    }));
  }

  encode (peer) {
    return { id: peer.id.toString('hex'), topic: peer.topic.toString('hex'), owner: peer.owner.toString('hex') };
  }

  decode (peer) {
    return { id: Buffer.from(peer.id, 'hex'), topic: Buffer.from(peer.topic, 'hex'), owner: Buffer.from(peer.owner, 'hex') };
  }

  _delete (topic, id) {
    const topicStr = topic.toString('hex');
    const idStr = id.toString('hex');

    if (this._peersByTopic.has(topicStr)) {
      const peers = this._peersByTopic.get(topicStr);
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

module.exports = { PeerMap };
