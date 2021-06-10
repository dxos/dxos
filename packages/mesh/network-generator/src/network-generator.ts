//
// Copyright 2021 DXOS.org
//

import graphGenerators from 'ngraph.generators';

import { Event } from '@dxos/async';

import { IdGenerator, Network, NetworkOptions } from './network';

export const topologies = ['ladder', 'complete', 'completeBipartite', 'balancedBinTree', 'path', 'circularLadder', 'grid', 'grid3', 'noLinks', 'cliqueCircle', 'wattsStrogatz'];

export class NetworkGenerator {
  readonly error = new Event<Error>();

  constructor (options: NetworkOptions = {}) {
    const self = this; // eslint-disable-line
    const generator = graphGenerators.factory(() => {
      const idGenerator = new IdGenerator();

      const network = new Network(options);

      return {
        network,
        addNode (id: any) {
          network.addPeer(idGenerator.get(id)).catch(err => self.error.emit(err));
        },
        addLink (from: Buffer, to: Buffer) {
          network.addConnection(idGenerator.get(from), idGenerator.get(to)).catch(err => self.error.emit(err));
        },
        getNodesCount () {
          return network.graph.getNodesCount();
        }
      };
    });

    topologies.forEach(topology => {
      (this as any)[topology] = async (...args: any) => {
        const { network } = generator[topology](...args);
        await Promise.all(network.peers);
        await Promise.all(network.connectionsOpening);
        return network;
      };
    });
  }
}
