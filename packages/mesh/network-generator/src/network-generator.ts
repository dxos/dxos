//
// Copyright 2021 DXOS.org
//

import graphGenerators from 'ngraph.generators';

import { Event } from '@dxos/async';

import { IdGenerator, Network, NetworkOptions } from './network';

export const TOPOLOGIES = <const>['ladder', 'complete', 'completeBipartite', 'balancedBinTree', 'path', 'circularLadder', 'grid', 'grid3', 'noLinks', 'cliqueCircle', 'wattsStrogatz'];
export type Topology = typeof TOPOLOGIES[number];

type Generator = (...args: any) => Promise<Network>

export interface NetworkGenerator extends Record<Topology, Generator> {}

export class NetworkGenerator {
  readonly error = new Event<Error>();
  private readonly generator: any;

  constructor (options: NetworkOptions = {}) {
    const self = this; // eslint-disable-line
    this.generator = graphGenerators.factory(() => {
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

    TOPOLOGIES.forEach(topology => {
      this[topology] = async (...args: any) => this.createTopology(topology, ...args);
    });
  }

  async createTopology (topology: Topology, ...args: any): Promise<Network> {
    const { network } = this.generator[topology](...args);
    await Promise.all(network.peers);
    await Promise.all(network.connectionsOpening);
    return network;
  }
}
