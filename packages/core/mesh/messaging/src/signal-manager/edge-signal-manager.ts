//
// Copyright 2024 DXOS.org
//

import { AnySchema } from '@bufbuild/protobuf/wkt';

import { Event } from '@dxos/async';
import { Resource } from '@dxos/context';
import { type EdgeConnection, protocol } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  SwarmRequestSchema,
  SwarmRequest_Action as SwarmRequestAction,
  SwarmResponseSchema,
  type Message as EdgeMessage,
} from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { ComplexMap, ComplexSet } from '@dxos/util';

import { type SignalManager } from './signal-manager';
import { type PeerInfo, type Message, type SwarmEvent, PeerInfoHash } from '../signal-methods';

const SWARM_SERVICE_ID = 'swarm';
const SIGNAL_SERVICE_ID = 'signal';

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
    this._ctx.onDispose(this._edgeConnection.addListener((message) => this._onMessage(message)));
  }

  /**
   * Warning: PeerId is inferred from edgeConnection.
   */
  async join({ topic, peer }: { topic: PublicKey; peer: PeerInfo }): Promise<void> {
    if (
      peer &&
      (peer.peerKey !== this._edgeConnection.deviceKey.toHex() ||
        peer.identityKey !== this._edgeConnection.identityKey.toHex())
    ) {
      // NOTE: Could only join swarm with the same peer info as the edge connection.
      log.warn('ignoring peer info on join request', { peer });
    }

    this._swarmPeers.set(topic, new ComplexSet<PeerInfo>(PeerInfoHash));
    await this._edgeConnection.send(
      protocol.createMessage(SwarmRequestSchema, {
        serviceId: SWARM_SERVICE_ID,
        payload: { action: SwarmRequestAction.JOIN, swarmKeys: [topic.toHex()] },
      }),
    );
  }

  async leave({ topic, peer }: { topic: PublicKey; peer: PeerInfo }): Promise<void> {
    this._swarmPeers.delete(topic);
    await this._edgeConnection.send(
      protocol.createMessage(SwarmRequestSchema, {
        serviceId: SWARM_SERVICE_ID,
        payload: { action: SwarmRequestAction.LEAVE, swarmKeys: [topic.toHex()] },
      }),
    );
  }

  async sendMessage(message: Message): Promise<void> {
    await this._edgeConnection.send(
      protocol.createMessage(AnySchema, {
        serviceId: SIGNAL_SERVICE_ID,
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
      case SWARM_SERVICE_ID: {
        this._processSwarmResponse(message);
        break;
      }
      case SIGNAL_SERVICE_ID: {
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
    const timestamp = new Date(Date.parse(message.timestamp));
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
    invariant(protocol.getPayloadType(message) === AnySchema.typeName, 'Wrong payload type');
    const payload = protocol.getPayload(message, AnySchema);
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
}
