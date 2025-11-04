//
// Copyright 2021 DXOS.org
//

import { Event } from '@dxos/async';
import { raise } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';
import { type ConnectionInfo, type SwarmInfo } from '@dxos/protocols/proto/dxos/devtools/swarm';
import { type MuxerStats } from '@dxos/teleport';
import { ComplexMap } from '@dxos/util';

import { ConnectionState, type Swarm } from './swarm';
import { type WireProtocol } from './wire-protocol';

const CONNECTION_GC_THRESHOLD = 1000 * 60 * 15;

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
  private readonly _swarms = new ComplexMap<PublicKey, SwarmInfo>(PublicKey.hash);

  readonly update = new Event();

  getSwarmInfo(swarmId: PublicKey): SwarmInfo {
    return this._swarms.get(swarmId) ?? raise(new Error(`Swarm not found: ${swarmId}`));
  }

  get swarms(): SwarmInfo[] {
    return Array.from(this._swarms.values());
  }

  joinedSwarm(swarm: Swarm): void {
    const info: SwarmInfo = {
      id: PublicKey.from(swarm._instanceId),
      topic: swarm.topic,
      isActive: true,
      label: swarm.label,
      connections: [],
    };

    this._swarms.set(PublicKey.from(swarm._instanceId), info);
    this.update.emit();

    swarm.connectionAdded.on((connection) => {
      const connectionInfo: ConnectionInfo = {
        state: ConnectionState.CREATED,
        closeReason: connection.closeReason,
        remotePeerId: PublicKey.from(connection.remoteInfo.peerKey),
        sessionId: connection.sessionId,
        transport: connection.transport && Object.getPrototypeOf(connection.transport).constructor.name,
        protocolExtensions: [], // TODO(dmaretskyi): Fix.
        events: [],
        lastUpdate: new Date(),
      };
      info.connections!.push(connectionInfo);
      this.update.emit();

      connection.stateChanged.on(async (state) => {
        connectionInfo.state = state;
        connectionInfo.closeReason = connection.closeReason;
        connectionInfo.lastUpdate = new Date();
        connectionInfo.events!.push({
          type: EventType.CONNECTION_STATE_CHANGED,
          newState: state,
        });

        if (state === ConnectionState.CONNECTED) {
          const details = await connection.transport?.getDetails();
          connectionInfo.transportDetails = details;
        }

        this.update.emit();
      });

      (connection.protocol as WireProtocol & { stats: Event<MuxerStats> })?.stats?.on((stats) => {
        connectionInfo.readBufferSize = stats.readBufferSize;
        connectionInfo.writeBufferSize = stats.writeBufferSize;
        connectionInfo.streams = stats.channels;
        connectionInfo.lastUpdate = new Date();
        this.update.emit();
      });

      connection.transportStats?.on((stats) => {
        connectionInfo.transportBytesSent = stats.bytesSent;
        connectionInfo.transportBytesReceived = stats.bytesReceived;
        connectionInfo.transportPacketsSent = stats.packetsSent;
        connectionInfo.transportPacketsReceived = stats.packetsReceived;
      });

      gcSwarm(info);

      // connection.protocol.protocol?.error.on((error) => {
      //   connectionInfo.events!.push({
      //     type: EventType.PROTOCOL_ERROR,
      //     error: error.stack ?? error.message
      //   });
      //   this.update.emit();
      // });
      // connection.protocol.protocol?.extensionsInitialized.on(() => {
      //   connectionInfo.events!.push({
      //     type: EventType.PROTOCOL_EXTENSIONS_INITIALIZED
      //   });
      //   this.update.emit();
      // });
      // connection.protocol.protocol?.extensionsHandshake.on(() => {
      //   connectionInfo.events!.push({
      //     type: EventType.PROTOCOL_EXTENSIONS_HANDSHAKE
      //   });
      //   this.update.emit();
      // });
      // connection.protocol.protocol?.handshake.on(() => {
      //   connectionInfo.events!.push({
      //     type: EventType.PROTOCOL_HANDSHAKE
      //   });
      //   this.update.emit();
      // });
    });
  }

  leftSwarm(swarm: Swarm): void {
    this.getSwarmInfo(PublicKey.from(swarm._instanceId)).isActive = false;
    this.update.emit();
  }
}

const gcSwarm = (swarm: SwarmInfo) => {
  swarm.connections = swarm.connections?.filter((connection) =>
    connection.lastUpdate ? Date.now() - connection.lastUpdate.getTime() < CONNECTION_GC_THRESHOLD : true,
  );
};
