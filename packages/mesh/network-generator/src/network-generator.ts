//
// Copyright 2021 DXOS.org
//

import assert from 'assert';
import crypto from 'crypto';
import eos from 'end-of-stream';
import { EventEmitter } from 'events';
import graphGenerators from 'ngraph.generators';
import createGraph from 'ngraph.graph';
import { PassThrough, Stream } from 'stream';
import {NetworkOptions, IdGenerator, Network} from './network'

export const topologies = ['ladder', 'complete', 'completeBipartite', 'balancedBinTree', 'path', 'circularLadder', 'grid', 'grid3', 'noLinks', 'cliqueCircle', 'wattsStrogatz'];

export class NetworkGenerator extends EventEmitter {
  constructor (options: NetworkOptions = {}) {
    super();

    const self = this; // eslint-disable-line
    const generator = graphGenerators.factory(() => {
      const idGenerator = new IdGenerator();

      const network = new Network(options);

      return {
        network,
        addNode (id: any) {
          network.addPeer(idGenerator.get(id)).catch(err => self.emit('error', err));
        },
        addLink (from: Buffer, to: Buffer) {
          network.addConnection(idGenerator.get(from), idGenerator.get(to)).catch(err => self.emit('error', err));
        },
        getNodesCount () {
          return network.graph.getNodesCount();
        }
      };
    });

    topologies.forEach(topology => {
      this[topology] = async (...args: any) => {
        const { network } = generator[topology](...args);
        await Promise.all(network.peers);
        await Promise.all(network.connectionsOpening);
        return network;
      };
    });
  }
}
