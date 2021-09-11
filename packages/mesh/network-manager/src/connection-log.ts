import { Event } from "@dxos/async";
import { PublicKey } from "@dxos/crypto";
import { raise } from "@dxos/debug";
import { ComplexMap } from "@dxos/util";
import { ConnectionState, Swarm } from ".";

export interface SwarmInfo {
  id: PublicKey
  topic: PublicKey
  label?: string
  isActive: boolean
  connections: ConnectionInfo[]
}

export interface ConnectionInfo {
  state: ConnectionState
  remotePeerId: PublicKey
  transport: string
  protocolExtensions: string[]
  events: ConnectionEvent[]
}

export type ConnectionEvent = {
    type: 'CONNECTION_STATE_CHANGED',
    newState: ConnectionState,
  } | {
    type: 'PROTOCOL_ERROR',
    error: string
  } | {
    type: 'PROTOCOL_EXTENSIONS_INITIALIZED'
  } | {
    type: 'PROTOCOL_EXTENSIONS_HANDSHAKE'
  } | {
    type: 'PROTOCOL_HANDSHAKE'
  }


export class ConnectionLog {
  /**
   * SwarmId => info
   */
  private readonly _swarms = new ComplexMap<PublicKey, SwarmInfo>(x => x.toHex());

  readonly update = new Event();

  getSwarmInfo(swarmId: PublicKey) {
    return this._swarms.get(swarmId) ?? raise(new Error(`Swarm not found ${swarmId}`))
  }

  get swarms(): SwarmInfo[] {
    return Array.from(this._swarms.values());
  }

  swarmJoined(swarm: Swarm) {
    const info: SwarmInfo = {
      id: swarm.id,
      topic: swarm.topic,
      isActive: true,
      label: swarm.label,
      connections: [],
    }

    this._swarms.set(swarm.id, info);
    this.update.emit();

    swarm.connectionAdded.on(connection => {
      const connectionInfo: ConnectionInfo = {
        state: ConnectionState.INITIAL,
        remotePeerId: connection.remoteId,
        transport: Object.getPrototypeOf(connection.transport).constructor.name,
        protocolExtensions: connection.protocol.extensionNames,
        events: []
      }
      info.connections.push(connectionInfo);
      this.update.emit();

      connection.stateChanged.on(state => {
        connectionInfo.state = state;
        connectionInfo.events.push({
          type: 'CONNECTION_STATE_CHANGED',
          newState: state,
        });
        this.update.emit();
      });


      connection.protocol.error.on(error => {
        connectionInfo.events.push({
          type: 'PROTOCOL_ERROR',
          error: error.stack ?? error.message,
        });
        this.update.emit();
      })
      connection.protocol.extensionsInitialized.on(() => {
        connectionInfo.events.push({
          type: 'PROTOCOL_EXTENSIONS_INITIALIZED',
        });
        this.update.emit();
      })
      connection.protocol.extensionsHandshake.on(() => {
        connectionInfo.events.push({
          type: 'PROTOCOL_EXTENSIONS_HANDSHAKE',
        });
        this.update.emit();
      })
      connection.protocol.handshake.on(() => {
        connectionInfo.events.push({
          type: 'PROTOCOL_HANDSHAKE',
        });
        this.update.emit();
      })
    });
  }

  swarmLeft(swarm: Swarm) {
    this.getSwarmInfo(swarm.id).isActive = false;
    this.update.emit();
  }
}
