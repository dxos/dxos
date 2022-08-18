//
// Copyright 2021 DXOS.org
//

import crypto from 'crypto';
import eos from 'end-of-stream';
import { EventEmitter } from 'events';
import { EventedType } from 'ngraph.events';
import createGraph, { Graph } from 'ngraph.graph';
import assert from 'node:assert';
import { PassThrough, Stream } from 'stream';

interface CreateStreamOptions {
  initiator?: boolean,
  topic?: Buffer,
  channel?: Buffer,
  options?: any
}
export interface Peer {
  id: Buffer,
  createStream?: (options: CreateStreamOptions) => Stream
}

interface Connection {
  fromPeer: Peer,
  toPeer: Peer,
  stream: Stream
}

/**
 * @param id Random buffer of 32 bytes to represent the id of the peer
 */
type CreatePeerCallback = (id: Buffer) => Promise<Peer>

/**
 *
 * @param fromPeer Peer initiator of the connection
 * @param toPeer Peer target
 */
type CreateConnectionCallback = (fromPeer: Peer, toPeer: Peer) => Promise<Stream | undefined>

/**
 * Class helper to generate random buffer ids based on a number.
 */
export class IdGenerator {
  private _ids = new Map();

  get (id: any) {
    if (this._ids.has(id)) {
      return this._ids.get(id);
    }

    const newId = crypto.randomBytes(32);
    this._ids.set(id, newId);
    return newId;
  }
}

export interface NetworkOptions {
  createPeer?: CreatePeerCallback,
  createConnection?: CreateConnectionCallback
}

export class Network extends EventEmitter {
  private _createPeer: CreatePeerCallback;
  private _createConnection: CreateConnectionCallback;
  private _connectionsOpening: Map<any, any>;
  private _graph: Graph<any, any> & EventedType;

  constructor (options: NetworkOptions = {}) {
    super();

    const { createPeer = id => ({ id }), createConnection = () => new PassThrough() } = options;

    this._createPeer = async (...args) => createPeer(...args);
    this._createConnection = async (...args) => createConnection(...args);
    this._graph = createGraph();
    this._graph.on('changed', (changes: any) => {
      changes.forEach(async ({ changeType, node, link }: any) => {
        if (changeType === 'update') {
          return;
        }
        const type = changeType === 'add' ? 'added' : 'deleted';
        const ev = `${node ? 'peer' : 'connection'}-${type}`;
        this.emit(ev, node ? await node.data : await link.data);
      });
    });
    this._connectionsOpening = new Map();
  }

  get graph () {
    return this._graph;
  }

  get peers () {
    const peers: Peer[] = [];
    this._graph.forEachNode((node: any) => {
      peers.push(node.data);
    });
    return peers;
  }

  get connections () {
    const connections: Connection[] = [];
    this._graph.forEachLink((link: any) => {
      const fromPeer = this._graph.getNode(link.fromId)?.data;
      const toPeer = this._graph.getNode(link.toId)?.data;
      connections.push({ fromPeer, toPeer, stream: link.data });
    });
    return connections;
  }

  get connectionsOpening (): Promise<any>[] {
    return Array.from(this._connectionsOpening.values());
  }

  /**
   * Add a new peer supplied by the caller to the network
   */
  // TOOD(dboreham): better method name?
  insertPeer (peer: Peer) {
    assert(peer);
    assert(Buffer.isBuffer(peer.id));
    this._graph.addNode(peer.id.toString('hex'), peer);
  }

  /**
   * Add a new peer to the network
   */
  async addPeer (id: Buffer): Promise<Peer> {
    assert(Buffer.isBuffer(id));

    const peer = this._createPeer(id).then((peer) => {
      if (!Buffer.isBuffer(peer.id)) {
        throw new Error('createPeer expect to return an object with an "id" buffer prop');
      }

      node.data = peer;
      return peer;
    }).catch(err => {
      this._graph.removeNode(id.toString('hex'));
      throw err;
    });

    const node = this._graph.addNode(id.toString('hex'), peer.catch(() => {}));

    return peer;
  }

  /**
   * Add a new connection to the network
   */
  async addConnection (from: Buffer, to: Buffer, conn?: Connection): Promise<Connection> {
    assert(Buffer.isBuffer(from));
    assert(Buffer.isBuffer(to));

    const fromHex = from.toString('hex');
    const toHex = to.toString('hex');
    const id = `${fromHex}-${toHex}-${crypto.randomBytes(6).toString('hex')}`;

    const connection = this._addConnection(from, to, conn).finally(() => {
      this._connectionsOpening.delete(id);
    });
    this._connectionsOpening.set(id, connection);
    return connection;
  }

  /**
   * Delete a peer
   */
  deletePeer (id: Buffer) {
    assert(Buffer.isBuffer(id));

    const idHex = id.toString('hex');

    if (!this._graph.hasNode(idHex)) {
      throw new Error(`Peer ${idHex} not found`);
    }

    const promises: Promise<any>[] = [];
    this._graph.forEachLinkedNode(idHex, (_: any, link: any) => {
      promises.push(this._destroyLink(link));
    }, false);
    this._graph.removeNode(idHex);
    return Promise.all(promises);
  }

  /**
   * Delete a connection
   */
  deleteConnection (from: Buffer, to: Buffer) {
    const fromHex = from.toString('hex');
    const toHex = to.toString('hex');

    const promises: Promise<any>[] = [];
    this._graph.forEachLinkedNode(fromHex, (_: any, link: any) => {
      if (link.fromId === fromHex && link.toId === toHex) {
        promises.push(this._destroyLink(link));
      }
    }, false);

    return Promise.all(promises);
  }

  /**
   * Destroy all the peers and connections related
   */
  async destroy () {
    return Promise.all(this.peers.map(peer => this.deletePeer(peer.id)));
  }

  async _addConnection (from: Buffer, to: Buffer, conn?: Connection) {
    const fromHex = from.toString('hex');
    const toHex = to.toString('hex');

    const fromPeer = await this._getPeerOrCreate(from);
    const toPeer = await this._getPeerOrCreate(to);

    const connection = (async () => conn || await this._createConnection(fromPeer, toPeer) || new PassThrough())()
      .then(stream => {
        if (!(typeof stream === 'object' && typeof (stream as any).pipe === 'function')) {
          throw new Error('createConnection expect to return a stream');
        }

        eos(stream as any, () => {
          this._graph.removeLink(link);
        });

        link.data = stream;
        return stream as Stream;
      }).catch((err) => {
        this._graph.removeLink(link);
        throw err;
      });

    const link = this._graph.addLink(fromHex, toHex, connection.catch(() => {}));

    const stream = await connection;

    return { fromPeer, toPeer, stream };
  }

  async _getPeerOrCreate (id: Buffer) {
    if (!this._graph.hasNode(id.toString('hex'))) {
      return this.addPeer(id);
    }

    const err = new Error('peer not found');
    const node = this._graph.getNode(id.toString('hex'));
    if (!node) {
      throw err;
    }

    const peer = await node.data;
    if (!peer) {
      throw err;
    }

    return peer;
  }

  async _destroyLink (link: any) {
    if (!link.data.destroyed) {
      const p = new Promise<void>(resolve => eos(link.data, () => {
        resolve();
      }));
      link.data.destroy();
      return p;
    }
  }
}
