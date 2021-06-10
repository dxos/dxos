//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import { EventEmitter } from 'events';
import pEvent from 'p-event';
import pump from 'pump';

import { Network, NetworkGenerator, topologies } from '@dxos/network-generator';
import { getProtocolFromStream, ProtocolOptions } from '@dxos/protocol';

interface Peer {
  id: Buffer,
  createStream: () => void,
}

/**
 * @param topic Buffer to initialize the stream protocol
 * @param id Random buffer of 32 bytes to represent the id of the peer
 */
type CreatePeerCallback = (topic: Buffer, id: Buffer, options: any) => Promise<Peer>

const isStream = (stream: any) => typeof stream === 'object' && typeof stream.pipe === 'function';

interface GenerateOptions {
  topic?: Buffer,
  waitForFullConnection?: boolean,
  peer?: any,
  protocol?: ProtocolOptions,
  parameters?: any[]
}

export class ProtocolNetworkGenerator extends EventEmitter {
  private _createPeer: CreatePeerCallback

  constructor (createPeer: CreatePeerCallback) {
    super();

    assert(typeof createPeer === 'function', 'createPeer is required and must be a function');
    this._createPeer = (...args) => createPeer(...args);
    topologies.forEach(topology => {
      (this as any)[topology] = async (options: GenerateOptions) => this._generate(topology, options);
    });
  }

  /**
   * Generate a network based on a ngraph.generator topology
   *
   * @param topology Valid ngraph.generator topology
   * @param options.topic Buffer to use on the stream protocol initialization
   * @param [options.waitForFullConnection=true] Wait until all the connections are ready
   * @param options.peer peer options
   * @param options.protocol Protocol options
   * @param options.parameters Arguments for the ngraph generator.
   */
  async _generate (
    topology: string,
    options: GenerateOptions = { waitForFullConnection: true }
  ): Promise<Network> {
    const { topic, waitForFullConnection = true, peer: peerOptions = {}, protocol = {}, parameters = [] } = options;

    assert(Buffer.isBuffer(topic), 'topic is required and must be a buffer');

    const generator = new NetworkGenerator({
      createPeer: async id => {
        const peer = await this._createPeer(topic, id, peerOptions);
        assert(typeof peer === 'object', 'peer must be an object');
        assert(Buffer.isBuffer(peer.id), 'peer.id is required');
        assert(typeof peer.createStream === 'function', 'peer.createStream is required and must be a function');
        return peer;
      },
      createConnection: async (fromPeer, toPeer) => {
        const r1 = fromPeer.createStream?.({ initiator: true, topic, channel: topic, options: protocol });
        // Target peer shouldn't get the topic, this help us to simulate the network like discovery-swarm/hyperswarm
        const r2 = toPeer.createStream?.({ initiator: false, options: protocol });
        assert(isStream(r1), 'createStream function must return a stream');
        assert(isStream(r1), 'createStream function must return a stream');

        const stream = pump(r1, r2, r1);

        if (waitForFullConnection) {
          await pEvent(getProtocolFromStream(r1), 'handshake', {
            rejectionEvents: ['error', 'close']
          });
        }

        return stream;
      }
    });

    generator.error.on(err => this.emit('error', err));

    const network = await (generator as any)[topology](...parameters);

    return network;
  }
}
