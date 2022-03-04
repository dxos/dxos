import { Event } from "@dxos/async";
import { PublicKey } from "@dxos/crypto";
import { RpcPort } from "@dxos/rpc";
import { ComplexMap } from "@dxos/util";
import { ClientServiceProvider } from "..";
import assert from "assert";

export interface JoinSwarmOptions {
  topic: PublicKey,
  peerId?: PublicKey,
  topology: {
    type: 'mmst'
  } | {
    type: 'fully-connected'
  } | {
    type: 'star'
    centralPeer: PublicKey
  },
  onConnection: (connection: Connection) => void | (() => void )
}

export interface Connection {
  port: RpcPort
  ownPeerId: PublicKey
  remotePeerId: PublicKey
}

export class JoinedSwarm {
  constructor(
    private readonly _onLeave: () => void
  ) {}

  leave() {
    this._onLeave();
  }
}

export class NetworkProxy {
  constructor(
    private readonly _serviceProvider: ClientServiceProvider,
  ) {}

  joinSwam(options: JoinSwarmOptions): JoinedSwarm {
    const ownPeerId = options.peerId ?? PublicKey.random();
    const stream = this._serviceProvider.services.NetworkService.joinSwarm({
      topic: options.topic,
      peerId: ownPeerId,
      fullyConnected: options.topology.type === 'fully-connected' ? true : undefined,
      mmst: options.topology.type === 'mmst' ? true : undefined,
      star: options.topology.type === 'star' ? { centralPeerId: options.topology.centralPeer } : undefined,
    });
    const ports = new ComplexMap<PublicKey, Event<Uint8Array>>(x => x.toHex());
    const cleanupMap = new ComplexMap<PublicKey, () => void>(x => x.toHex());
    stream.subscribe(
      msg => {
        if(msg.peerConnected) {
          assert(msg.peerConnected.peerId, 'Peer Id is required');
          const received = new Event<Uint8Array>()
          ports.set(msg.peerConnected.peerId!, received)
          const port: RpcPort = {
            send: data => {
              void this._serviceProvider.services.NetworkService.sendData({
                data: data,
                topic: options.topic,
                destinationPeerId: msg.peerConnected!.peerId!,
              });
            },
            subscribe: (cb) => received.on(cb),
          }
          const cleanup = options.onConnection({
            ownPeerId,
            remotePeerId: msg.peerConnected.peerId!,
            port,
          });
          cleanupMap.set(msg.peerConnected.peerId!, () => cleanup?.());
        } else if(msg.peerDisconnected) {
          assert(msg.peerDisconnected.peerId, 'Peer Id is required');
          cleanupMap.get(msg.peerDisconnected.peerId!)?.();
          ports.delete(msg.peerDisconnected.peerId!);
          cleanupMap.delete(msg.peerDisconnected.peerId!);
        } else if(msg.data) {
          assert(msg.data.peerId, 'Peer Id is required');
          assert(msg.data.data, 'data is required');
          ports.get(msg.data.peerId!)?.emit(msg.data.data);
        }
      },
      err => {
        for(const peerId of ports.keys()) {
          cleanupMap.get(peerId)?.();
          ports.delete(peerId!);
          cleanupMap.delete(peerId);
        }

        // TODO(dmaretskyi): Proper error handling.
        console.error(err)
      }
    )
    return new JoinedSwarm(() => {
      stream.close();
      void this._serviceProvider.services.NetworkService.leaveSwarm({ topic: options.topic });
    });
  }

  async dial(topic: PublicKey): Promise<Connection> {
    return new Promise((resolve) => {
      this.joinSwam({
        topic,
        topology: {
          type: 'star',
          centralPeer: topic,
        },
        onConnection: (connection) => {
          resolve(connection);
        }
      })
    })
  }
}