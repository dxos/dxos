//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { Stream } from '@dxos/codec-protobuf';
import { keyToBuffer, PublicKey } from '@dxos/crypto';
import { failUndefined, raise } from '@dxos/debug';
import { createProtocolFactory, FullyConnectedTopology, MMSTTopology, NetworkManager, ProtocolProvider, StarTopology, Topology } from '@dxos/network-manager';
import { PluginRpc } from '@dxos/protocol-plugin-rpc';
import { RpcPort } from '@dxos/rpc';
import { ComplexMap } from '@dxos/util';
import { Extension, Protocol } from '@dxos/mesh-protocol';
import { Broadcast, Middleware } from '@dxos/broadcast';
import debug from 'debug'

import { JoinSwarmRequest, LeaveSwarmRequest, NetworkService, SendDataRequest, SwarmEvent } from '../../../proto/gen/dxos/client';
import { CreateServicesOpts } from './interfaces';

const log = debug('dxos:client:network-service');
const DEFAULT_TIMEOUT = 60000;

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

  private _broadcastPlugin: BroadcastPlugin | null = null;

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
      this._broadcastPlugin = new BroadcastPlugin(this._options.peerId, (peerId, data) => {
        next({
          data: { peerId, data }
        })
      });
      this.protocolProvider = createProtocolFactory(
        this._options.topic,
        this._options.peerId,
        [plugin, this._broadcastPlugin]
      );
    });
  }

  async sendData(request: SendDataRequest) {
    assert(request.topic, 'Topic is required');
    assert(request.data, 'Data is required');

    if (request.destinationPeerId) {
      const connection = this._connections.get(request.destinationPeerId) ?? raise(new Error('Connection not found'));
      await connection.send(request.data);
    } else {
      assert(this._broadcastPlugin);
      this._broadcastPlugin.broadcastMessage(request.data);
    }
  }
}

interface BroadcastPeer {
  id: Buffer
  protocol: Protocol
}

export class BroadcastPlugin {
  static EXTENSION_NAME = 'dxos.protocol.broadcast';

  private extensionsCreated = 0;

  private readonly _peers = new Map<string, Protocol>();

  private readonly _onMessage: (protocol: Protocol, message: Uint8Array) => Promise<void>;

  private _commandHandler!: (protocol: Protocol, chunk: { data: Buffer }) => Promise<void>;

  private readonly _broadcast: Broadcast<BroadcastPeer>;

  constructor(
    private readonly _peerId: PublicKey,
    messageHandler: (peerId: PublicKey, data: Uint8Array) => void
  ) {

    this._onMessage = async (protocol, message) => {
      const peerId = PublicKey.fromHex(protocol.getSession()?.peerId);
      try {
        messageHandler(peerId, message);
      } catch (err: any) {
        // Ignore with console error.
        console.error(err.stack);
      }
    };

    const middleware: Middleware<BroadcastPeer> = {
      lookup: async () => {
        log('lookup')
        return Array.from(this._peers.values()).map((peer) => {
          const { peerId } = peer.getSession() ?? {};

          return {
            id: keyToBuffer(peerId),
            protocol: peer
          };
        });
      },
      send: async (packet, peer) => {
        log('send', peer)
        await peer.protocol.getExtension(BroadcastPlugin.EXTENSION_NAME)!.send(packet);
      },
      subscribe: (onPacket) => {
        log('subscribe')
        this._commandHandler = (protocol, chunk) => {
          const packet = onPacket(chunk.data);
          return this._onMessage(protocol, packet?.data ?? chunk.data);
        };
      }
    };

    this._broadcast = new Broadcast(middleware, {
      id: this._peerId.asBuffer()
    });
  }

  get peers() {
    return Array.from(this._peers.keys()).map(id => keyToBuffer(id));
  }

  /**
   * Create protocol extension.
   * @return {Extension}
   */
  createExtension(timeout = DEFAULT_TIMEOUT) {
    this._broadcast.open();
    this.extensionsCreated++;

    return new Extension(BroadcastPlugin.EXTENSION_NAME, { timeout })
      .setInitHandler(async protocol => {
        this._addPeer(protocol);
      })
      .setHandshakeHandler(async protocol => {
        const { peerId } = protocol.getSession() ?? {};

        if (peerId && this._peers.has(peerId)) {
          log(`Peer joined: ${peerId}`)
        }
      })
      .setMessageHandler(this._commandHandler)
      .setCloseHandler(async protocol => {
        this._removePeer(protocol);
        if (--this.extensionsCreated === 0) {
          // The last extension got closed so the plugin can be stopped.
          await this.stop();
        }
      });
  }

  /**
   * Broadcast message to peers.
   */
  async broadcastMessage(message: Uint8Array) {
    log('broadcastMessage')
    await this._broadcast.publish(Buffer.from(message));
  }

  /**
   * Add peer.
   */
  private _addPeer(protocol: Protocol) {
    const { peerId } = protocol.getSession() ?? {};
    if (!peerId || this._peers.has(peerId)) {
      return;
    }

    this._peers.set(peerId, protocol);
  }

  /**
   * Remove peer.
   */
  private _removePeer(protocol: Protocol) {
    assert(protocol);

    const { peerId } = protocol.getSession() ?? {};
    if (!peerId) {
      return;
    }

    this._peers.delete(peerId);
    log('peer:exited', peerId);
  }

  async stop() {
    await this._broadcast.close();
  }
}
