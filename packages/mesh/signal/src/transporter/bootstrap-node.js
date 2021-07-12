//
// Copyright 2020 DxOS.
//

const crypto = require('crypto');

const dht = require('@hyperswarm/dht');
const publicIp = require('public-ip');
const internalIp = require('internal-ip');
const pEvent = require('p-event');

class BootstrapNode {
  constructor (options = {}) {
    const { port = 4000 } = options;

    this._id = null;
    this._broker = null;
    this._port = port;
    this._stop = false;
    this._address = null;
  }

  async getAddress () {
    if (this._address) return this._address;

    if (!this._dht) throw new Error('dht not found');

    const address = this._dht.socket.address();

    address.address = await this._getBootstrapIp();

    this._address = address;
    return this._address;
  }

  async start (broker) {
    this._broker = broker;

    this._id = crypto.createHash('sha256')
      .update(this._broker.nodeID + 'bootstrap')
      .digest();

    this._dht = dht({ ephemeral: true, adaptive: true, id: this._id });

    // runs the bootstrap UDP node in a specific port
    this._dht.listen(this._port);

    await pEvent(this._dht, 'ready');

    this._dht.on('announce', (target, peer) => {
      this._broker.logger.debug('BOOTSTRAP_NODE: received announce', target, peer);
    });

    this._dht.on('unannounce', (target, peer) => {
      this._broker.logger.debug('BOOTSTRAP_NODE: received unannounce', target, peer);
    });

    this._dht.on('lookup', (target, peer) => {
      this._broker.logger.debug('BOOTSTRAP_NODE: received lookup', target, peer);
    });

    this._dht.once('close', async () => {
      if (this._stop) {
        return;
      }

      this._broker.logger.warn('BOOTSTRAP_NODE: closed, reconnecting...');
      try {
        await this._createBootstrapNode();
      } catch (err) {
        this._broker.logger.error('BOOTSTRAP_NODE: error during reconnection', err);
      }
    });

    const address = await this.getAddress();
    this._broker.logger.info('BOOTSTRAP_NODE: running on', {
      id: this._dht.id.toString('hex'),
      ...address
    });
  }

  stop () {
    if (this._stop || this._dht.destroyed) return;

    this._stop = true;
    if (this._dht) {
      this._dht.destroy();
      return pEvent(this._dht, 'close');
    }
  }

  _getBootstrapIp () {
    if (!this._dht) throw new Error('dht not found');

    return publicIp.v4().catch(() => {
      this._broker.logger.error('BOOTSTRAP_NODE: error trying to get external ip');
      return internalIp.v4();
    }).catch(err => {
      this._broker.logger.error('BOOTSTRAP_NODE: error trying to get interal ip');
      throw err;
    });
  }
}

module.exports = { BootstrapNode };
