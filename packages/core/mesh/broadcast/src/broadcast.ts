//
// Copyright 2021 DXOS.org
//

import debug from 'debug';
import assert from 'node:assert';
import LRU, { Lru } from 'tiny-lru';

import { Event } from '@dxos/async';
import { randomBytes } from '@dxos/crypto';
import { schema } from '@dxos/protocols';
import { Packet } from '@dxos/protocols/proto/dxos/mesh/broadcast';

debug.formatters.h = v => v.toString('hex').slice(0, 6);
const log = debug('broadcast');

export type SendFn<P> = (message: Uint8Array, peer: P, options: unknown) => Promise<void>;

type Unsubscribe = () => void;

export type SubscribeFn<P> = (
  onPacket: (packetEncoded: Uint8Array) => Packet | undefined,
  updatePeers: (peers: P[]) => void,
) => Unsubscribe | void;

export type LookupFn<P> = () => Promise<P[]>;

export interface Middleware<P extends Peer = Peer> {
  readonly send: SendFn<P>
  readonly subscribe: SubscribeFn<P>
  /**
   * @deprecated
   */
   readonly lookup?: LookupFn<P>
}

export interface CacheOptions {
  /**
   * Defines the max live time for the cache messages.
   *
   * Default: 10000.
   */
   maxAge?: number
   /**
    * Defines the max size for the cache messages.
    *
    * Default: 1000.
    */
   maxSize?: number
}

export interface Options extends CacheOptions {
  /**
   * Defines an id for the current peer.
   */
  id?: Buffer
}

export interface PublishOptions {
  seqno?: Buffer
}

export interface Peer {
  id: Buffer
}

type FixedLru = Lru<any> & { ttl: number, max: number, items: any[]} // The original type did not have all of the fields defined.

/**
 * Abstract module to send broadcast messages.
 */
export class Broadcast<P extends Peer = Peer> {
  private readonly _id: Buffer;
  private readonly _codec = schema.getCodecForType('dxos.mesh.broadcast.Packet');

  private readonly _send: SendFn<P>;
  private readonly _subscribe: SubscribeFn<P>;
  private readonly _lookup: LookupFn<P> | undefined;
  private readonly _seenSeqs: FixedLru;

  private _isOpen = false;
  private _peers: P[] = [];
  private _unsubscribe: Unsubscribe | undefined;

  readonly send = new Event<[packetEncoded: Uint8Array, peer: P]>();
  readonly sendError = new Event<Error>();
  readonly packet = new Event<Packet>();
  readonly subscribeError = new Event<Error>();

  constructor (middleware: Middleware<P>, options: Options = {}) {
    assert(middleware);
    assert(middleware.send);
    assert(middleware.subscribe);

    const { id = randomBytes(32), maxAge = 10 * 1000, maxSize = 1000 } = options;

    this._id = id;

    this._send = middleware.send;
    this._subscribe = middleware.subscribe;

    this._seenSeqs = LRU(maxSize, maxAge) as any;

    if (middleware.lookup) {
      this._lookup = () => middleware.lookup!();
    }
  }

  /**
   * Broadcast a flooding message to the peers neighbors.
   */
  async publish (data: Uint8Array, options: PublishOptions = {}): Promise<Packet | undefined> {
    const { seqno = randomBytes(32) } = options;

    assert(Buffer.isBuffer(data));
    assert(Buffer.isBuffer(seqno));

    return this._publish({
      seqno,
      origin: this._id,
      data
    });
  }

  /**
   * Update internal list of peers.
   */
  updatePeers (peers: P[]) {
    assert(peers.every(peer => Buffer.isBuffer(peer.id)), 'Peer ID is expected to be a buffer.');
    this._peers = peers;
  }

  /**
   * Update internal cache options
   */
  updateCache (opts: CacheOptions = {}) {
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
    for (const item of Object.values(this._seenSeqs.items)) {
      if (this._seenSeqs.ttl > 0 && item.expiry <= time) {
        this._seenSeqs.delete(item.key);
      }
    }
  }

  open () {
    if (this._isOpen) {
      return;
    }
    this._isOpen = true;

    this._unsubscribe = this._subscribe(this._onPacket.bind(this), this.updatePeers.bind(this)) || (() => {});

    log('running %h', this._id);
  }

  close () {
    if (!this._isOpen) {
      return;
    }
    this._isOpen = false;

    this._unsubscribe?.();
    this._seenSeqs.clear();

    log('stop %h', this._id);
  }

  /**
   * Publish and/or Forward a packet message to each peer neighbor.
   *
   * @param {Packet} packet
   * @param {Object} options
   */
  private async _publish (packet: Packet, options = {}): Promise<Packet | undefined> {
    /** @deprecated */
    this._lookup && this.updatePeers(await this._lookup());

    const peers = this._peers.filter(peer => !Buffer.from(packet.origin!).equals(peer.id) && (!packet.from || !Buffer.from(packet.from).equals(peer.id)));
    if (peers.length === 0) {
      return;
    }

    // Update the package to set the current sender..
    packet = Object.assign({}, packet, {
      from: this._id
    });

    const packetEncoded = this._codec.encode(packet);

    await Promise.all(peers.map((peer) => {
      log('publish %h -> %h', this._id, peer.id, packet);

      return this._send(packetEncoded, peer, options).then(() => {
        this.send.emit([packetEncoded, peer]);
      }).catch(err => {
        this.sendError.emit(err);
      });
    }));

    return packet;
  }

  /**
   * Process incoming encoded packets.
   *
   * @returns Returns the packet if the decoding was successful.
   */
  private _onPacket (packetEncoded: Uint8Array): Packet | undefined {
    if (!this._isOpen) {
      return;
    }

    try {
      const packet = this._codec.decode(packetEncoded);
      if (!packet || !packet.seqno || !packet.origin || !packet.from) {
        return;
      }

      // Ignore packets produced by me and forwarded by others.
      if (Buffer.from(packet.origin).equals(this._id)) {
        return;
      }

      const packetId = Buffer.from(packet.origin).toString('hex') + ':' + Buffer.from(packet.seqno).toString('hex');

      // Check if I already see this packet.
      if (this._seenSeqs.get(packetId)) {
        return;
      }
      this._seenSeqs.set(packetId, 1);

      log('received %h -> %h', this._id, packet.from, packet);

      this._publish(packet).catch(() => {});

      this.packet.emit(packet);
      return packet;
    } catch (err: any) {
      this.subscribeError.emit(err);
    }
  }
}
