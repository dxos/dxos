//
// Copyright 2024 DXOS.org
//

import { Event, scheduleMicroTask } from '@dxos/async';
import { Resource } from '@dxos/context';
import { type EdgeConnection, protocol } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { EdgeService } from '@dxos/protocols';
import { type buf, bufWkt } from '@dxos/protocols/buf';
import {
  SwarmRequestSchema,
  SwarmRequest_Action as SwarmRequestAction,
  SwarmResponseSchema,
  type Message as EdgeMessage,
  type PeerSchema,
} from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { ComplexMap, ComplexSet } from '@dxos/util';

import { type SignalManager } from './signal-manager';
import { type PeerInfo, type Message, type SwarmEvent, PeerInfoHash } from '../signal-methods';

export class EdgeSignalManager extends Resource implements SignalManager {
  public swarmEvent = new Event<SwarmEvent>();
  public onMessage = new Event<Message>();

  /**
   * swarm key -> peerKeys in the swarm
   */
  // TODO(mykola): This class should not contain swarm state. Temporary before network-manager API changes to accept list of peers.
  private readonly _swarmPeers = new ComplexMap<PublicKey, ComplexSet<PeerInfo>>(PublicKey.hash);
  private readonly _edgeConnection: EdgeConnection;

  constructor({ edgeConnection }: { edgeConnection: EdgeConnection }) {
    super();
    this._edgeConnection = edgeConnection;
  }

  protected override async _open() {
    this._ctx.onDispose(this._edgeConnection.onMessage((message) => this._onMessage(message)));
    this._ctx.onDispose(
      this._edgeConnection.onReconnected(() => {
        scheduleMicroTask(this._ctx, () => this._rejoinAllSwarms());
      }),
    );
  }

  /**
   * Warning: PeerInfo is inferred from edgeConnection.
   */
  async join({ topic, peer }: { topic: PublicKey; peer: PeerInfo }): Promise<void> {
    if (!this._matchSelfPeerInfo(peer)) {
      // NOTE: Could only join swarm with the same peer info as the edge connection.
      log.warn('ignoring peer info on join request', {
        peer,
        expected: {
          peerKey: this._edgeConnection.peerKey,
          identityKey: this._edgeConnection.identityKey,
        },
      });
    }

    this._swarmPeers.set(topic, new ComplexSet<PeerInfo>(PeerInfoHash));
    await this._edgeConnection.send(
      protocol.createMessage(SwarmRequestSchema, {
        serviceId: EdgeService.SWARM_SERVICE_ID,
        source: createMessageSource(topic, peer),
        payload: { action: SwarmRequestAction.JOIN, swarmKeys: [topic.toHex()] },
      }),
    );
  }

  async leave({ topic, peer }: { topic: PublicKey; peer: PeerInfo }): Promise<void> {
    this._swarmPeers.delete(topic);
    await this._edgeConnection.send(
      protocol.createMessage(SwarmRequestSchema, {
        serviceId: EdgeService.SWARM_SERVICE_ID,
        source: createMessageSource(topic, peer),
        payload: { action: SwarmRequestAction.LEAVE, swarmKeys: [topic.toHex()] },
      }),
    );
  }

  async sendMessage(message: Message): Promise<void> {
    if (!this._matchSelfPeerInfo(message.author)) {
      // NOTE: Could only join swarm with the same peer info as the edge connection.
      log.warn('ignoring author on send request', {
        author: message.author,
        expected: { peerKey: this._edgeConnection.peerKey, identityKey: this._edgeConnection.identityKey },
      });
    }

    await this._edgeConnection.send(
      protocol.createMessage(bufWkt.AnySchema, {
        serviceId: EdgeService.SIGNAL_SERVICE_ID,
        source: message.author,
        target: [message.recipient],
        payload: { typeUrl: message.payload.type_url, value: message.payload.value },
      }),
    );
  }

  async subscribeMessages(peerInfo: PeerInfo): Promise<void> {
    // No-op.
  }

  async unsubscribeMessages(peerInfo: PeerInfo): Promise<void> {
    // No-op.
  }

  private _onMessage(message: EdgeMessage) {
    switch (message.serviceId) {
      case EdgeService.SWARM_SERVICE_ID: {
        this._processSwarmResponse(message);
        break;
      }
      case EdgeService.SIGNAL_SERVICE_ID: {
        this._processMessage(message);
      }
    }
  }

  private _processSwarmResponse(message: EdgeMessage) {
    invariant(protocol.getPayloadType(message) === SwarmResponseSchema.typeName, 'Wrong payload type');
    const payload = protocol.getPayload(message, SwarmResponseSchema);
    const topic = PublicKey.from(payload.swarmKey);
    if (!this._swarmPeers.has(topic)) {
      log.warn('Received message from wrong topic', { topic });
      return;
    }
    const oldPeers = this._swarmPeers.get(topic)!;
    const timestamp = message.timestamp ? new Date(Date.parse(message.timestamp)) : new Date();
    const newPeers = new ComplexSet<PeerInfo>(PeerInfoHash, payload.peers);

    // Emit new available peers in the swarm.
    for (const peer of newPeers) {
      if (oldPeers.has(peer)) {
        continue;
      }
      this.swarmEvent.emit({
        topic,
        peerAvailable: { peer, since: timestamp },
      });
    }

    // Emit peer that left the swarm.
    for (const peer of oldPeers) {
      if (newPeers.has(peer)) {
        continue;
      }
      this.swarmEvent.emit({
        topic,
        peerLeft: { peer },
      });
    }

    this._swarmPeers.set(topic, newPeers);
  }

  private _processMessage(message: EdgeMessage) {
    invariant(protocol.getPayloadType(message) === bufWkt.AnySchema.typeName, 'Wrong payload type');
    const payload = protocol.getPayload(message, bufWkt.AnySchema);
    invariant(message.source, 'source is missing');
    invariant(message.target, 'target is missing');
    invariant(message.target.length === 1, 'target should have exactly one item');

    this.onMessage.emit({
      author: message.source,
      recipient: message.target[0],
      payload: {
        type_url: payload.typeUrl,
        value: payload.value,
      },
    });
  }

  private _matchSelfPeerInfo(peer: PeerInfo) {
    return (
      peer && (peer.peerKey === this._edgeConnection.peerKey || peer.identityKey === this._edgeConnection.identityKey)
    );
  }

  private async _rejoinAllSwarms() {
    log('rejoin swarms', { swarms: Array.from(this._swarmPeers.keys()) });
    // Clear all swarms. But leave keys in the map.
    for (const topic of this._swarmPeers.keys()) {
      await this.join({
        topic,
        peer: { peerKey: this._edgeConnection.peerKey, identityKey: this._edgeConnection.identityKey },
      });
    }
  }
}

const createMessageSource = (topic: PublicKey, peerInfo: PeerInfo): buf.MessageInitShape<typeof PeerSchema> => {
  return {
    swarmKey: topic.toHex(),
    identityKey: peerInfo.identityKey,
    peerKey: peerInfo.peerKey,
  };
};
