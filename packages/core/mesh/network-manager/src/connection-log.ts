//
// Copyright 2021 DXOS.org
//

import { Event } from '@dxos/async';
import { raise } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { SubscribeToSwarmInfoResponse } from '@dxos/protocols/proto/dxos/devtools';
import { ComplexMap } from '@dxos/util';

import { ConnectionState, Swarm } from './swarm';

export enum EventType {
  CONNECTION_STATE_CHANGED = 'CONNECTION_STATE_CHANGED',
  PROTOCOL_ERROR = 'PROTOCOL_ERROR',
  PROTOCOL_EXTENSIONS_INITIALIZED = 'PROTOCOL_EXTENSIONS_INITIALIZED',
  PROTOCOL_EXTENSIONS_HANDSHAKE = 'PROTOCOL_EXTENSIONS_HANDSHAKE',
  PROTOCOL_HANDSHAKE = 'PROTOCOL_HANDSHAKE',
}

export class ConnectionLog {
  /**
   * SwarmId => info
   */
  private readonly _swarms = new ComplexMap<
    PublicKey,
    SubscribeToSwarmInfoResponse.SwarmInfo
  >((key) => key.toHex());

  readonly update = new Event();

  getSwarmInfo (swarmId: PublicKey) {
    return (
      this._swarms.get(swarmId) ??
      raise(new Error(`Swarm not found: ${swarmId}`))
    );
  }

  get swarms (): SubscribeToSwarmInfoResponse.SwarmInfo[] {
    return Array.from(this._swarms.values());
  }

  swarmJoined (swarm: Swarm) {
    const info: SubscribeToSwarmInfoResponse.SwarmInfo = {
      id: swarm.id,
      topic: swarm.topic,
      isActive: true,
      label: swarm.label,
      connections: []
    };

    this._swarms.set(swarm.id, info);
    this.update.emit();

    swarm.connectionAdded.on((connection) => {
      const connectionInfo: SubscribeToSwarmInfoResponse.SwarmInfo.ConnectionInfo =
        {
          state: ConnectionState.INITIAL,
          remotePeerId: connection.remoteId,
          sessionId: connection.sessionId,
          transport:
            connection.transport &&
            Object.getPrototypeOf(connection.transport).constructor.name,
          protocolExtensions: connection.protocol.extensionNames,
          events: []
        };
      info.connections!.push(connectionInfo);
      this.update.emit();

      connection.stateChanged.on((state) => {
        connectionInfo.state = state;
        connectionInfo.events!.push({
          type: EventType.CONNECTION_STATE_CHANGED,
          newState: state
        });
        this.update.emit();
      });

      connection.protocol.error.on((error) => {
        connectionInfo.events!.push({
          type: EventType.PROTOCOL_ERROR,
          error: error.stack ?? error.message
        });
        this.update.emit();
      });
      connection.protocol.extensionsInitialized.on(() => {
        connectionInfo.events!.push({
          type: EventType.PROTOCOL_EXTENSIONS_INITIALIZED
        });
        this.update.emit();
      });
      connection.protocol.extensionsHandshake.on(() => {
        connectionInfo.events!.push({
          type: EventType.PROTOCOL_EXTENSIONS_HANDSHAKE
        });
        this.update.emit();
      });
      connection.protocol.handshake.on(() => {
        connectionInfo.events!.push({
          type: EventType.PROTOCOL_HANDSHAKE
        });
        this.update.emit();
      });
    });
  }

  swarmLeft (swarm: Swarm) {
    this.getSwarmInfo(swarm.id).isActive = false;
    this.update.emit();
  }
}
