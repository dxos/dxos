//
// Copyright 2020 DxOS.
//

import { EventEmitter } from 'events';
import { PassThrough } from 'stream';
import assert from 'assert';
import crypto from 'crypto';

import createGraph from 'ngraph.graph';
import graphGenerators from 'ngraph.generators';
import eos from 'end-of-stream';

/**
 * @typedef {Object} Peer
 * @property {Buffer} id Required peer id.
 */

/**
 * @typedef {Object} Connection
 * @property {Peer} fromPeer
 * @property {Peer} toPeer
 * @property {Stream} stream
 */

/**
 *
 * @callback CreatePeerCallback
 * @param {Buffer} id Random buffer of 32 bytes to represent the id of the peer
 * @returns {Promise<Peer>}
 */

/**
 *
 * @callback CreateConnectionCallback
 * @param {Peer} fromPeer Peer initiator of the connection
 * @param {Peer} toPeer Peer target
 * @returns {Promise<(Stream|undefined)>}
 */

export const topologies = ['ladder', 'complete', 'completeBipartite', 'balancedBinTree', 'path', 'circularLadder', 'grid', 'grid3', 'noLinks', 'cliqueCircle', 'wattsStrogatz'];

/**
 * Class helper to generate random buffer ids based on a number.
 */
class IdGenerator {
  constructor () {
    this._ids = new Map();
  }

  get (id) {
    if (this._ids.has(id)) {
      return this._ids.get(id);
    }

    const newId = crypto.randomBytes(32);
    this._ids.set(id, newId);
    return newId;
  }
}

/**
 * Network.
 *
 */
export class Network extends EventEmitter {
  /**
   * @constructor
   * @param {Object} options
   * @param {CreatePeerCallback} options.createPeer
   * @param {CreateConnectionCallback} options.createConnection
   */
  constructor (options = {}) {
    super();

    const { createPeer = id => ({ id }), createConnection = () => new PassThrough() } = options;

    this._createPeer = async (...args) => createPeer(...args);
    this._createConnection = async (...args) => createConnection(...args);
    this._graph = createGraph();
    this._graph.on('changed', (changes) => {
      changes.forEach(async ({ changeType, node, link }) => {
        if (changeType === 'update') return;
        const type = changeType === 'add' ? 'added' : 'deleted';
        const ev = `${node ? 'peer' : 'connection'}-${type}`;
        this.emit(ev, node ? await node.data : await link.data);
      });
    });
    this._connectionsOpening = new Map();
  }

  /**
   * @type {Ngraph}
   */
  get graph () {
    return this._graph;
  }

  /**
   * @type {Peer[]}
   */
  get peers () {
    const peers = [];
    this._graph.forEachNode(node => {
      peers.push(node.data);
    });
    return peers;
  }

  /**
   * @type {Connection[]}
   */
  get connections () {
    const connections = [];
    this._graph.forEachLink(link => {
      const fromPeer = this._graph.getNode(link.fromId).data;
      const toPeer = this._graph.getNode(link.toId).data;
      connections.push({ fromPeer, toPeer, stream: link.data });
    });
    return connections;
  }

  /**
   * @type {Promise[]}
   */
  get connectionsOpening () {
    return Array.from(this._connectionsOpening.values());
  }

  /**
   * Add a new peer supplied by the caller to the network
   *
   * @param {Peer} peer
   */
  // TOOD(dboreham): better method name?
  insertPeer (peer) {
    assert(peer);
    assert(Buffer.isBuffer(peer.id));
    this._graph.addNode(peer.id.toString('hex'), peer);
  }

  /**
   * Add a new peer to the network
   *
   * @param {Buffer} id
   * @returns {Promise<Peer>}
   */
  async addPeer (id) {
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
   *
   * @param {Buffer} from
   * @param {Buffer} to
   * @returns {Promise<Connection>}
   */
  async addConnection (from, to, conn) {
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
   *
   * @param {Buffer} id
   * @returns {Promise}
   */
  deletePeer (id) {
    assert(Buffer.isBuffer(id));

    const idHex = id.toString('hex');

    if (!this._graph.hasNode(idHex)) {
      throw new Error(`Peer ${idHex} not found`);
    }

    const promises = [];
    this._graph.forEachLinkedNode(idHex, (_, link) => {
      promises.push(this._destroyLink(link));
    });
    this._graph.removeNode(idHex);
    return Promise.all(promises);
  }

  /**
   * Delete a connection
   *
   * @param {Buffer} from
   * @param {Buffer} to
   * @returns {Promise}
   */
  deleteConnection (from, to) {
    const fromHex = from.toString('hex');
    const toHex = to.toString('hex');

    const promises = [];
    this._graph.forEachLinkedNode(fromHex, (_, link) => {
      if (link.fromId === fromHex && link.toId === toHex) {
        promises.push(this._destroyLink(link));
      }
    });

    return Promise.all(promises);
  }

  /**
   * Destroy all the peers and connections related
   *
   * @returns {Promise}
   */
  async destroy () {
    const promises = [];
    this.peers.forEach(peer => {
      promises.push(this.deletePeer(peer.id));
    });

    return Promise.all(promises);
  }

  async _addConnection (from, to, conn) {
    const fromHex = from.toString('hex');
    const toHex = to.toString('hex');

    const fromPeer = await this._getPeerOrCreate(from);
    const toPeer = await this._getPeerOrCreate(to);

    const connection = (async () => (conn || this._createConnection(fromPeer, toPeer) || new PassThrough()))()
      .then(stream => {
        if (!(typeof stream === 'object' && typeof stream.pipe === 'function')) {
          throw new Error('createConnection expect to return a stream');
        }

        eos(stream, () => {
          this._graph.removeLink(link);
        });

        link.data = stream;
        return stream;
      }).catch((err) => {
        this._graph.removeLink(link);
        throw err;
      });

    const link = this._graph.addLink(fromHex, toHex, connection.catch(() => {}));

    const stream = await connection;

    return { fromPeer, toPeer, stream };
  }

  async _getPeerOrCreate (id) {
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

  async _destroyLink (link) {
    if (!link.data.destroyed) {
      const p = new Promise(resolve => eos(link.data, () => {
        resolve();
      }));
      link.data.destroy();
      return p;
    }
  }
}

/**
 * Network generator.
 *
 */
export class NetworkGenerator extends EventEmitter {
  /**
   * @constructor
   * @param {Object} options
   * @param {CreatePeerCallback} options.createPeer
   * @param {CreateConnectionCallback} options.createConnection
   */
  constructor (options = {}) {
    super();

    const self = this;
    const generator = graphGenerators.factory(() => {
      const idGenerator = new IdGenerator();

      const network = new Network(options);

      return {
        network,
        addNode (id) {
          network.addPeer(idGenerator.get(id)).catch(err => self.emit('error', err));
        },
        addLink (from, to) {
          network.addConnection(idGenerator.get(from), idGenerator.get(to)).catch(err => self.emit('error', err));
        },
        getNodesCount () {
          return network.graph.getNodesCount();
        }
      };
    });

    topologies.forEach(topology => {
      this[topology] = async (...args) => {
        const { network } = generator[topology](...args);
        await Promise.all(network.peers);
        await Promise.all(network.connectionsOpening);
        return network;
      };
    });
  }
}
