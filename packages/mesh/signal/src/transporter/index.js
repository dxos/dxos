//
// Copyright 2021 DXOS.org
//

import { EventEmitter } from 'events';
import { discoveryKey } from 'hypercore-crypto';
import hyperswarm from 'hyperswarm';
import assert from 'node:assert';
import pEvent from 'p-event';
import Protocol from 'simple-hypercore-protocol';

import { BootstrapNode } from './bootstrap-node';
import { Messenger } from './messenger';

const { Transporters: { Base: BaseTransporter } } = require('moleculer'); // eslint-disable-line @typescript-eslint/no-var-requires

export class ProtocolTransporter extends BaseTransporter {
  static keyPair () {
    return Protocol.keyPair();
  }

  constructor (opts) {
    const { topic, keyPair, hyperswarm = {}, asBootstrap = false, bootstrapPort } = opts;

    assert(Buffer.isBuffer(topic), 'topic is required and must be a buffer of 32 bytes');
    assert(keyPair && Buffer.isBuffer(keyPair.publicKey) && Buffer.isBuffer(keyPair.secretKey), 'keyPair is required and must be an object of { publicKey: Buffer<32>, secretKey: Buffer<32> }');

    super(opts);

    this._topic = topic;
    this._keyPair = keyPair;
    this._discoveryKey = discoveryKey(topic);
    this._hyperswarmOptions = hyperswarm;
    this._messenger = new Messenger(this._topic, this._keyPair);

    this._ee = new EventEmitter();
    this._nanomessage = null;
    this._swarm = null;
    this._bootstrapNode = null;

    if (asBootstrap) {
      this._bootstrapNode = new BootstrapNode({ port: bootstrapPort });
    }

    this.onPeerConnection = this.onPeerConnection.bind(this);
    this._messenger.on('message', message => this._ee.emit(message.topic, message.data));
    this._messenger.on('peer-added', (peer) => this._ee.emit('peer-added', peer));
    this._messenger.on('peer-deleted', (peer) => this._ee.emit('peer-deleted', peer));
  }

  get dht () {
    return this._swarm && this._swarm.network.discovery && this._swarm.network.discovery.dht;
  }

  get onlyLocal () {
    return this._messenger.peers.length === 0;
  }

  get peers () {
    return this._messenger ? this._messenger.peers : [];
  }

  on (event, handler) {
    this._ee.on(event, handler);
  }

  off (event, handler) {
    this._ee.off(event, handler);
  }

  waitForConnected () {
    if (this.connected) {
      return;
    }
    return pEvent(this, 'connected');
  }

  async connect () {
    const opts = {
      ...this._hyperswarmOptions
    };

    if (this._bootstrapNode) {
      await this._bootstrapNode.start(this.broker);

      if (!opts.bootstrap) {
        opts.bootstrap = [];
      }

      const address = await this._bootstrapNode.getAddress();
      opts.bootstrap.push(`${address.address}:${address.port}`);
    }

    if (opts.bootstrap) {
      opts.bootstrap = [...new Set(opts.bootstrap)];
    }

    this.logger.info('Bootstrap nodes', opts.bootstrap ? opts.bootstrap : 'default');

    this._swarm = hyperswarm(opts);
    this._swarm.on('connection', this.onPeerConnection);
    this._swarm.once('close', () => {
      if (this.connected) {
        this.connected = false;
      }

      this._swarm.removeListener('connection', this.onPeerConnection);
      this.logger.warn('ProtocolTransporter disconnected');
    });

    await this._messenger.open();

    return new Promise((resolve, reject) => {
      const onError = (err) => {
        this.logger.error('ProtocolTransporter error', err.message);
        reject(err);
      };

      this._swarm.once('error', onError);

      this._swarm.join(this._discoveryKey, {
        lookup: true,
        announce: true
      }, () => {
        this.logger.info('ProtocolTransporter connected');
        this._swarm.removeListener('error', onError);
        this._ee.emit('connected');
        void this.onConnected().then(resolve);
      });
    });
  }

  async disconnect () {
    if (this._bootstrapNode) {
      await this._bootstrapNode.stop();
    }

    if (this._swarm) {
      await new Promise(resolve => this._swarm.destroy(() => resolve()));
      await this._messenger.close();
    }
  }

  subscribe (cmd, nodeID) {
    const t = this.getTopicName(cmd, nodeID);

    this._ee.on(t, msg => this.receive(cmd, msg));

    return Promise.resolve();
  }

  /**
   * Send data buffer.
   *
   * @param {String} topic
   * @param {Buffer} data
   * @param {Object} meta
   *
   * @returns {Promise}
   */
  send (topic, data, { packet }) {
    if (!this._swarm || this._messenger.closed || this._messenger.closing || this._messenger.peers.length === 0) {
      return Promise.resolve();
    }

    const sended = this._messenger.send(packet.target, { topic, data });
    if (!sended) {
      return this._messenger.broadcast({ topic, data });
    }
  }

  async onPeerConnection (socket, info) {
    try {
      await this._messenger.addPeer(socket, info);
    } catch (err) {
      this.logger.error('Peer error', err);
    }
  }
}
