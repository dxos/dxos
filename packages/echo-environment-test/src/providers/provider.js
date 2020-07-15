//
// Copyright 2020 DxOS.
//

import { EventEmitter } from 'events';

import { createStorage, STORAGE_RAM } from '@dxos/random-access-multi-storage';
import { randomBytes } from '@dxos/crypto';

export const networkTypes = {
  LADDER: 'ladder',
  COMPLETE: 'complete',
  COMPLETE_BIPARTITE: 'completeBipartite',
  BALANCED_BIN_TREE: 'balancedBinTree',
  PATH: 'path',
  CIRCULAR_LADDER: 'circularLadder',
  GRID: 'grid',
  GRID3: 'grid3',
  NO_LINKS: 'noLinks',
  WATTS_STROGATZ: 'wattsStrogatz'
};

export class Provider extends EventEmitter {
  constructor (options = {}) {
    super();

    const { storageType = STORAGE_RAM, network = { type: networkTypes.NO_LINKS, parameters: [1] } } = options;

    this._storageType = storageType;
    this._networkOptions = network;
    this._topic = randomBytes(32);
    // after network created will be initialized
    this._network = null;
  }

  get topic () {
    return this._topic;
  }

  get networkOptions () {
    return this._networkOptions;
  }

  get network () {
    return this._network;
  }

  createStorage (path) {
    return createStorage(`.temp/${Buffer.isBuffer(path) ? path.toString('hex') : path}`, this._storageType);
  }

  /**
   * @async
   */
  beforeNetworkCreated () {}

  /**
   * @async
   */
  createPeer (topic, peerId) {
    return { id: peerId };
  }

  /**
   * @async
   */
  afterNetworkCreated () {}

  /**
   * @async
   * @param {object} options
   * @param {Peer} options.peerOne
   * @param {Peer} options.peerTwo
   */
  invitePeer () {}

  /**
   * @async
   */
  destroy () {}
}
