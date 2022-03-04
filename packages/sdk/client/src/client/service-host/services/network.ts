//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { Stream } from '@dxos/codec-protobuf';
import { PublicKey } from '@dxos/crypto';
import { failUndefined, raise } from '@dxos/debug';
import { createProtocolFactory, FullyConnectedTopology, MMSTTopology, NetworkManager, StarTopology, Topology } from '@dxos/network-manager';
import { PluginRpc } from '@dxos/protocol-plugin-rpc';
import { RpcPort } from '@dxos/rpc';
import { ComplexMap } from '@dxos/util';

import { JoinSwarmRequest, LeaveSwarmRequest, NetworkService, SendDataRequest, SwarmEvent } from '../../../proto/gen/dxos/client';
import { CreateServicesOpts } from './interfaces';

export class NetworkServiceProvider implements NetworkService {
  private readonly _connections = new ComplexMap<[topic: PublicKey, peerId: PublicKey], RpcPort>(([a, b]) => a.toHex() + b.toHex())

  constructor (
    private readonly _networkManager: NetworkManager
  ) {}

  joinSwarm (request: JoinSwarmRequest): Stream<SwarmEvent> {
    return new Stream(({ next, close }) => {
      assert(request.topic, 'Topic is required');
      assert(request.peerId, 'Peer Id is required');

      const plugin = new PluginRpc((port, peerIdHex) => {
        const peerId = PublicKey.from(peerIdHex);
        this._connections.set([request.topic!, peerId], port);
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
          this._connections.delete([request.topic!, peerId]);
          next({
            peerDisconnected: {
              peerId
            }
          });
        };
      });
      this._networkManager.joinProtocolSwarm({
        topic: request.topic,
        peerId: request.peerId,
        topology: createTopology(request),
        protocol: createProtocolFactory(
          request.topic,
          request.peerId,
          [plugin]
        ),
        label: 'custom'
      });
    });
  }

  async leaveSwarm (request: LeaveSwarmRequest) {
    await this._networkManager.leaveProtocolSwarm(request.topic ?? failUndefined());
  }

  async sendData (request: SendDataRequest) {
    assert(request.topic, 'Topic is required');
    assert(request.destinationPeerId, 'Peer Id is required');
    assert(request.data, 'Data is required');

    const connection = this._connections.get([request.topic, request.destinationPeerId]) ?? raise(new Error('Connection not found'));
    await connection.send(request.data);
  }
}

export const createNetworkService = ({ echo }: CreateServicesOpts): NetworkService => {
  return new NetworkServiceProvider(echo.networkManager);
};

function createTopology (spec: JoinSwarmRequest): Topology {
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
