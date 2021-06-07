//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import crypto from 'crypto';
import debug from 'debug';
import { NanoresourcePromise } from 'nanoresource-promise/emitter';
import LRU from 'tiny-lru';

import { schema } from './proto/gen';

debug.formatters.h = v => v.toString('hex').slice(0, 6);
const log = debug('broadcast');

/**
 * @typedef {Object} Middleware
 * @property {Function} send Defines how to send the packet builded by the broadcast.
 * @property {Function} subscribe Defines how to subscribe to incoming packets and update the internal list of peers.
 */

/**
 * @typedef {Object} Packet
 * @property {Buffer} seqno Id message.
 * @property {Buffer} origin Represents the author's ID of the message. To identify a message in the network you should check for the: `seqno + origin`.
 * @property {Buffer} from Represents the current sender's ID of the message.
 * @property {Buffer} data Represents an opaque blob of data, it can contain any data that the publisher wants to send.
 */

/**
 * Abstract module to send broadcast messages.
 *
 * @extends {EventEmitter}
 */
export class Broadcast extends NanoresourcePromise {
  public _id: any;
  public _send: any;
  public _subscribe: any;
  public _seenSeqs: any;
  public _peers: any;
  public _codec: any;
  public _lookup: any;
  public open: any;
  public emit: any;
  public close: any;
  public _unsubscribe: any;
  public opened: any;
  public closed: any;
  public closing: any;
  public opening: any;
  public id: any;
  public maxAge: any;
  public maxSize: any;
  public seqno: any;

  /**
   * @constructor
   * @param {Middleware} middleware
   * @param {Object} options
   * @param {Buffer} options.id Defines an id for the current peer.
   * @param {number} [options.maxAge=10000] Defines the max live time for the cache messages.
   * @param {number} [options.maxSize=1000] Defines the max size for the cache messages.
   */
  constructor (middleware: any, options: any = {}) {
    assert(middleware);
    assert(middleware.send);
    assert(middleware.subscribe);

    super();

    const { id = crypto.randomBytes(32), maxAge = 10 * 1000, maxSize = 1000 } = options;

    this._id = id;

    this._send = (...args: any) => middleware.send(...args);
    this._subscribe = (...args: any) => middleware.subscribe(...args);

    this._seenSeqs = LRU(maxSize, maxAge);
    this._peers = [];
    this._codec = schema.getCodecForType('dxos.broadcast.Packet');

    /** @deprecated */
    if (middleware.lookup) {
      this._lookup = () => middleware.lookup();
    }
  }

  /**
   * Broadcast a flooding message to the peers neighboors.
   *
   * @param {Buffer} data
   * @param {Object} options
   * @param {Buffer} [options.seqno=crypto.randomBytes(32)]
   * @returns {Promise<Packet>}
   */
  publish (data: any, options: any = {}) {
    const { seqno = crypto.randomBytes(32) } = options;

    assert(Buffer.isBuffer(data));
    assert(Buffer.isBuffer(seqno));

    const packet = { seqno, origin: this._id, data };
    return this._publish(packet);
  }

  /**
   * Update internal list of peers.
   *
   * @param {Array<Peer>} peers
   */
  updatePeers (peers: any) {
    this._peers = peers;
  }

  /**
   * Update internal cache options
   *
   * @param {{ maxAge: number, maxSize: number }} opts
   */
  updateCache (opts: any = {}) {
    if (opts.maxAge) {
      this._seenSeqs.ttl = opts.maxAge;
    }

    if (opts.maxSize) {
      this._seenSeqs.max = opts.maxSize;
    }
  }

  /**
   * Prune the internal cache items in timeout
   */
  pruneCache () {
    const time = Date.now();
    for (const item of Object.values(this._seenSeqs.items) as any) {
      if (this._seenSeqs.ttl > 0 && item.expiry <= time) {
        this._seenSeqs.delete(item.key);
      }
    }
  }

  /**
   * @deprecated
   */
  run () {
    this.open().catch((err: any) => {
      process.nextTick(() => this.emit('error', err));
    });
  }

  /**
   * @deprecated
   */
  stop () {
    this.close().catch((err: any) => {
      process.nextTick(() => this.emit('error', err));
    });
  }

  _open () {
    this._unsubscribe = this._subscribe(this._onPacket.bind(this), this.updatePeers.bind(this)) || (() => {});

    log('running %h', this._id);
  }

  _close () {
    this._unsubscribe();
    this._seenSeqs.clear();

    log('stop %h', this._id);
  }

  /**
   * Publish and/or Forward a packet message to each peer neighboor.
   *
   * @param {Packet} packet
   * @param {Object} options
   * @returns {Promise<Packet>}
   */
  async _publish (packet: any, options = {}) {
    await this._isOpen();

    /** @deprecated */
    this._lookup && this.updatePeers(await this._lookup());

    const peers = this._peers.filter((peer: any) => (!packet.origin.equals(peer.id) && (!packet.from || !packet.from.equals(peer.id))));
    if (peers.length === 0) {
      return;
    }

    // Update the package to set the current sender..
    packet = Object.assign({}, packet, {
      from: this._id
    });

    const packetEncoded = this._codec.encode(packet);

    await Promise.all(peers.map((peer: any) => {
      log('publish %h -> %h', this._id, peer.id, packet);

      return this._send(packetEncoded, peer, options).then(() => {
        this.emit('send', packetEncoded, peer);
      }).catch((err: any) => {
        this.emit('send-error', err);
      });
    }));

    return packet;
  }

  /**
   * Process incoming encoded packets.
   *
   * @param {Buffer} packetEncoded
   * @returns {(Packet|undefined)} Returns the packet if the decoding was successful.
   */
  _onPacket (packetEncoded: any) {
    if (!this.opened || this.closed || this.closing) {
      return;
    }

    try {
      const packet = this._codec.decode(packetEncoded);
      if (!packet || !packet.seqno || !packet.origin || !packet.from) {
        return;
      }

      // Ignore packets produced by me and forwarded by others
      if (packet.origin.equals(this._id)) {
        return;
      }

      const packetId = packet.origin.toString('hex') + ':' + packet.seqno.toString('hex');

      // Check if I already see this packet.
      if (this._seenSeqs.get(packetId)) {
        return;
      }
      this._seenSeqs.set(packetId, 1);

      log('received %h -> %h', this._id, packet.from, packet);

      this._publish(packet).catch(() => {});

      this.emit('packet', packet);
      return packet;
    } catch (err) {
      this.emit('subscribe-error', err);
    }
  }

  _isOpen () {
    if (this.opening) {
      return this.open();
    }
    if (!this.opened || this.closed || this.closing) {
      throw new Error('broadcast closed');
    }
  }
}
