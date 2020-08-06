//
// Copyright 2020 DxOS.
//

import { EventEmitter } from 'events';

import { ProtocolNetworkGenerator } from '@dxos/protocol-network-generator';

import { Environment } from './environment';
import { Peer } from './peer';
import assert from 'assert';

export class EnvironmentFactory extends EventEmitter {
  constructor () {
    super();

    this._envs = new Set();
    this._generator = new ProtocolNetworkGenerator((...args) => this._createPeer(...args));
    this._generator.on('error', err => {
      this.emit('error', err);
    });
  }

  async create (provider) {
    assert(provider, 'a provider is required');

    await provider.beforeNetworkCreated();

    const topic = provider.topic;

    // create the local network
    const network = await this._generator[provider.networkOptions.type]({
      topic,
      parameters: provider.networkOptions.parameters,
      peer: {
        createPeer: (...args) => provider.createPeer(...args),
        invitePeer: (...args) => provider.invitePeer(...args)
      }
    });
    this.emit('network-created', network);

    await provider.afterNetworkCreated(network);
    provider._network = network;

    const env = new Environment(topic, provider);
    this.emit('environment-created', env);

    this._envs.add(env);

    // wait for next macrotask
    await new Promise(resolve => setTimeout(resolve, 0));

    return env;
  }

  async _createPeer (topic, peerId, peerOptions) {
    try {
      const { client, createStream } = await peerOptions.createPeer(topic, peerId);

      const peer = new Peer({
        topic,
        peerId,
        client,
        createStream,
        invitePeer: peerOptions.invitePeer
      });

      this.emit('peer-created', topic, peer);
      return peer;
    } catch (err) {
      this.emit('error', err);
    }
  }
}
