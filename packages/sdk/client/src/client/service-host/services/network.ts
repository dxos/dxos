//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { Stream } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/crypto';
import { failUndefined, raise } from '@dxos/debug';
import { createProtocolFactory, FullyConnectedTopology, MMSTTopology, NetworkManager, ProtocolProvider, StarTopology, Topology } from '@dxos/network-manager';
import { PluginRpc } from '@dxos/protocol-plugin-rpc';
import { RpcPort } from '@dxos/rpc';
import { ComplexMap } from '@dxos/util';

import { JoinSwarmRequest, LeaveSwarmRequest, NetworkService, SendDataRequest, SwarmEvent } from '../../../proto/gen/dxos/client';
import { CreateServicesOpts } from './interfaces';

export class NetworkServiceProvider implements NetworkService {
  private readonly _swarms = new ComplexMap<PublicKey, Swarm>(topic => topic.toHex());

  constructor(
    private readonly _networkManager: NetworkManager
  ) { }

  joinSwarm(request: JoinSwarmRequest): Stream<SwarmEvent> {
    assert(request.topic);
    assert(request.peerId);
    assert(!this._swarms.has(request.topic));

    const swarm = new Swarm(request);
    this._swarms.set(request.topic, swarm);
    swarm.open();
    assert(swarm.eventStream);
    assert(swarm.protocolProvider);

    this._networkManager.joinProtocolSwarm({
      topic: request.topic,
      peerId: request.peerId,
      topology: swarm.topology,
      protocol: swarm.protocolProvider,
      label: 'custom'
    });

    return swarm.eventStream;
  }

  async leaveSwarm(request: LeaveSwarmRequest) {
    await this._networkManager.leaveProtocolSwarm(request.topic ?? failUndefined());
  }

  async sendData(request: SendDataRequest) {
    assert(request.topic, 'Topic is required');
    assert(request.destinationPeerId, 'Peer Id is required');
    assert(request.data, 'Data is required');

    const swarm = this._swarms.get(request.topic) ?? raise(new Error('Connection not found'));
    await swarm.sendData(request);
  }
}

export const createNetworkService = ({ echo }: CreateServicesOpts): NetworkService => {
  return new NetworkServiceProvider(echo.networkManager);
};

function createTopology(spec: JoinSwarmRequest): Topology {
  if (spec.fullyConnected) {
    return new FullyConnectedTopology();
  } else if (spec.star) {
    return new StarTopology(spec.star.centralPeerId ?? failUndefined());
  } else if (spec.mmst) {
    return new MMSTTopology();
  } else { // Default
    return new FullyConnectedTopology();
  }
}

class Swarm {
  private readonly _connections = new ComplexMap<PublicKey, RpcPort>(peerId => peerId.toHex());

  public readonly topology: Topology;

  public eventStream: Stream<SwarmEvent> | null = null;
  public protocolProvider: ProtocolProvider | null = null;

  constructor(
    private readonly _options: JoinSwarmRequest,
  ) {
    this.topology = createTopology(this._options);
  }

  open() {
    this.eventStream = new Stream(({ next, close }) => {
      assert(this._options.topic, 'Topic is required');
      assert(this._options.peerId, 'Peer Id is required');

      const plugin = new PluginRpc((port, peerIdHex) => {
        const peerId = PublicKey.from(peerIdHex);
        this._connections.set(peerId, port);
        next({
          peerConnected: {
            peerId
          }
        });
        const unsub = port.subscribe(msg => {
          next({
            data: {
              peerId,
              data: msg
            }
          });
        });

        return () => {
          unsub?.();
          this._connections.delete(peerId);
          next({
            peerDisconnected: {
              peerId
            }
          });
        };
      });
      this.protocolProvider = createProtocolFactory(
        this._options.topic,
        this._options.peerId,
        [plugin]
      )
    });
  }

  async sendData(request: SendDataRequest) {
    assert(request.topic, 'Topic is required');
    assert(request.destinationPeerId, 'Peer Id is required');
    assert(request.data, 'Data is required');

    const connection = this._connections.get(request.destinationPeerId) ?? raise(new Error('Connection not found'));
    await connection.send(request.data);
  }
}