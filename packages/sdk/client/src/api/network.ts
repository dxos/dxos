import { PublicKey } from "@dxos/crypto";
import { RpcPort } from "@dxos/rpc";
import { ClientServiceProvider } from "..";

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
  leave() {
    throw new Error("Method not implemented.");
  }
}

export class NetworkApi {
  constructor(
    private readonly _serviceProvider: ClientServiceProvider,
  ) {}

  joinSwam(options: JoinSwarmOptions): JoinedSwarm {
    return new JoinedSwarm();
  }

  async dial(topic: PublicKey): Promise<Connection> {
    throw new Error("Method not implemented.");
  }
}