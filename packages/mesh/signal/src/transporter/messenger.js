//
// Copyright 2021 DXOS.org
//

import eos from 'end-of-stream';
import { EventEmitter } from 'events';
import crypto from 'hypercore-crypto';
import { NanoresourcePromise } from 'nanoresource-promise/emitter';
import Protocol from 'simple-hypercore-protocol';
import varint from 'varint';

import { Broadcast } from '@dxos/broadcast';

const BROADCAST_CHANNEL = 0;
const DIRECT_CHANNEL = 1;

const packetCodec = {
  encode: (obj) => {
    const length = Buffer.byteLength(obj.topic, 'utf8');
    const buf = Buffer.allocUnsafe(varint.encodingLength(length) + length + obj.data.length);
    varint.encode(length, buf);
    buf.write(obj.topic, varint.encode.bytes, length, 'utf8');
    obj.data.copy(buf, varint.encode.bytes + length);
    return buf;
  },
  decode: (buf) => {
    const length = varint.decode(buf);
    const topic = buf.slice(varint.decode.bytes, varint.decode.bytes + length);
    const data = buf.slice(varint.decode.bytes + length);
    return { topic: topic.toString(), data };
  }
};

class Peer extends EventEmitter {
  constructor ({ initiator, socket, topic, keyPair }) {
    super();

    this._initiator = initiator;
    this._socket = socket;
    this._initializeProtocol(topic, keyPair);
  }

  get destroyed () {
    return this._socket.destroyed;
  }

  get initiator () {
    return this._initiator;
  }

  get publicKey () {
    return this._protocol.publicKey;
  }

  get remotePublicKey () {
    return this._protocol.remotePublicKey;
  }

  get sessionKey () {
    return this._protocol.handshakeHash ? crypto.discoveryKey(this._protocol.handshakeHash) : null;
  }

  // The broadcast use an `id` prop.
  get id () {
    return this.remotePublicKey;
  }

  broadcast (buf) {
    if (this._socket.destroyed) {
      return;
    }
    this._protocol.extension(BROADCAST_CHANNEL, 0, buf);
  }

  send (buf) {
    if (this._socket.destroyed) {
      return;
    }
    this._protocol.extension(DIRECT_CHANNEL, 0, buf);
  }

  destroy () {
    if (this._socket.destroyed) {
      return;
    }
    return this._socket.destroy();
  }

  _initializeProtocol (topic, keyPair) {
    const socket = this._socket;

    this._protocol = new Protocol(this._initiator, {
      keyPair,
      send (data) {
        socket.write(data);
      },
      onclose () {
        if (socket.destroyed) {
          return;
        }
        socket.destroy();
      },
      onhandshake: () => this.emit('handshake'),
      onextension: (ch, id, data) => this.emit('message', ch, data)
    });

    socket.on('data', (data) => this._protocol.recv(data));

    eos(socket, () => this._protocol.destroy());
  }
}

class Messenger extends NanoresourcePromise {
  constructor (topic, keyPair) {
    super();

    this._topic = topic;
    this._keyPair = keyPair;
    this._maxAge = 30 * 1000;
    this._broadcast = new Broadcast(this._middleware(), {
      id: this.publicKey,
      maxAge: this._maxAge,
      maxSize: Number.MAX_SAFE_INTEGER
    });
    this._peers = new Set();
  }

  get publicKey () {
    return this._keyPair.publicKey;
  }

  get peers () {
    return Array.from(this._peers.values());
  }

  addPeer (socket, info) {
    const peer = new Peer({
      initiator: info.client,
      socket,
      topic: this._topic,
      keyPair: this._keyPair
    });

    peer.on('handshake', () => {
      if (socket.destroyed) {
        return;
      }
      if (info.deduplicate(peer.remotePublicKey, peer.publicKey)) {
        return;
      }
      this._peers.add(peer);
      this._broadcast.updatePeers(this.peers);
      this.emit('peer-added', { initiator: peer.initiator, sessionKey: peer.sessionKey, peerId: peer.id });
    });

    const onBroadcast = (ch, message) => this.emit('peer-message', ch, message);
    peer.on('message', onBroadcast);

    eos(socket, () => {
      this._peers.delete(peer);
      this._broadcast.updatePeers(this.peers);
      peer.off('message', onBroadcast);
      this.emit('peer-deleted', { initiator: peer.initiator, sessionKey: peer.sessionKey, peerId: peer.id });
    });

    return peer;
  }

  broadcast (message, options) {
    return this._broadcast.publish(packetCodec.encode(message), options);
  }

  send (id, message) {
    const peer = this.peers.find(p => p.remotePublicKey.toString('hex') === id);

    if (!peer) {
      return false;
    }

    return peer.send(packetCodec.encode(message));
  }

  async _open () {
    await this._broadcast.open();

    this._pruneCacheInterval = setInterval(() => {
      this._broadcast.pruneCache();
    }, this._maxAge);
  }

  async _close () {
    await this._broadcast.close();
    clearInterval(this._pruneCacheInterval);
  }

  _middleware () {
    return {
      // Send must be async.
      send: async (packet, node) => node.broadcast(packet),
      subscribe: (onData) => {
        const onMessage = (ch, message) => {
          try {
            if (ch === BROADCAST_CHANNEL) {
              const response = onData(message);
              if (response && response.data) {
                this.emit('message', packetCodec.decode(response.data));
              }
            } else {
              this.emit('message', packetCodec.decode(message));
            }
          } catch (err) {}
        };

        this.on('peer-message', onMessage);
        return () => {
          this.off('peer-message', onMessage);
        };
      }
    };
  }
}

exports.Messenger = Messenger;
