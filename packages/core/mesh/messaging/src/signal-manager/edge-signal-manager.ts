//
// Copyright 2024 DXOS.org
//

import { Event, scheduleMicroTask } from '@dxos/async';
import { Resource, cancelWithContext } from '@dxos/context';
import { type EdgeConnection, EdgeIdentityChangedError, protocol } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { EdgeService } from '@dxos/protocols';
import { type buf, bufWkt } from '@dxos/protocols/buf';
import {
  type Message as EdgeMessage,
  type PeerSchema,
  SwarmRequest_Action as SwarmRequestAction,
  SwarmRequestSchema,
  SwarmResponseSchema,
} from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { type SwarmResponse } from '@dxos/protocols/proto/dxos/edge/messenger';
import { ComplexMap, ComplexSet } from '@dxos/util';

import { type Message, type PeerInfo, PeerInfoHash, type SwarmEvent } from '../signal-methods';

import { type SignalManager } from './signal-manager';

export class EdgeSignalManager extends Resource implements SignalManager {
  /**
   * @deprecated
   */
  public swarmEvent = new Event<SwarmEvent>();
  public swarmState = new Event<SwarmResponse>();
  public onMessage = new Event<Message>();

  /**
   * Swarm key -> { peer: <own state payload>, joinedPeers: <state of swarm> }.
   */
  // TODO(mykola): This class should not contain swarm state joinedPeers. Temporary before network-manager API changes to accept list of peers.
  private readonly _swarmPeers = new ComplexMap<
    PublicKey,
    { lastState?: Uint8Array; joinedPeers: ComplexSet<PeerInfo> }
  >(PublicKey.hash);

  private readonly _edgeConnection: EdgeConnection;

  constructor({ edgeConnection }: { edgeConnection: EdgeConnection }) {
    super();
    this._edgeConnection = edgeConnection;
  }

  protected override async _open(): Promise<void> {
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

      peer.identityKey = this._edgeConnection.identityKey;
      peer.peerKey = this._edgeConnection.peerKey;
    }

    this._swarmPeers.set(topic, { lastState: peer.state, joinedPeers: new ComplexSet<PeerInfo>(PeerInfoHash) });
    await this._edgeConnection.send(
      protocol.createMessage(SwarmRequestSchema, {
        serviceId: EdgeService.SWARM,
        source: createMessageSource(topic, peer),
        payload: { action: SwarmRequestAction.JOIN, swarmKeys: [topic.toHex()] },
      }),
    );
  }

  async leave({ topic, peer }: { topic: PublicKey; peer: PeerInfo }): Promise<void> {
    this._swarmPeers.delete(topic);
    try {
      await this._edgeConnection.send(
        protocol.createMessage(SwarmRequestSchema, {
          serviceId: EdgeService.SWARM,
          source: createMessageSource(topic, peer),
          payload: { action: SwarmRequestAction.LEAVE, swarmKeys: [topic.toHex()] },
        }),
      );
    } catch (err) {
      if (err instanceof EdgeIdentityChangedError) {
        // Note: On edge identity change, the connection is closed and EDGE will remove us from the swarm.
        //       So we should just delete the swarm from _swarmPeers.
        return;
      }
      throw err;
    }
  }

  async query({ topic }: { topic: PublicKey }): Promise<SwarmResponse> {
    const response = cancelWithContext(
      this._ctx,
      this.swarmState.waitFor((state) => state.swarmKey === topic.toHex()),
    );

    await this._edgeConnection.send(
      protocol.createMessage(SwarmRequestSchema, {
        serviceId: EdgeService.SWARM,
        source: createMessageSource(topic, {
          peerKey: this._edgeConnection.peerKey,
          identityKey: this._edgeConnection.identityKey,
        }),
        payload: { action: SwarmRequestAction.INFO, swarmKeys: [topic.toHex()] },
      }),
    );

    return response;
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
        serviceId: EdgeService.SIGNAL,
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

  private _onMessage(message: EdgeMessage): void {
    switch (message.serviceId) {
      case EdgeService.SWARM: {
        this._processSwarmResponse(message);
        break;
      }
      case EdgeService.SIGNAL: {
        this._processMessage(message);
      }
    }
  }

  private _processSwarmResponse(message: EdgeMessage): void {
    invariant(protocol.getPayloadType(message) === SwarmResponseSchema.typeName, 'Wrong payload type');
    const payload = protocol.getPayload(message, SwarmResponseSchema);
    this.swarmState.emit(payload);
    const topic = PublicKey.from(payload.swarmKey);
    if (!this._swarmPeers.has(topic)) {
      return;
    }

    const { joinedPeers: oldPeers } = this._swarmPeers.get(topic)!;
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

    this._swarmPeers.get(topic)!.joinedPeers = newPeers;
  }

  private _processMessage(message: EdgeMessage): void {
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

  private _matchSelfPeerInfo(peer: PeerInfo): boolean {
    return (
      peer && (peer.peerKey === this._edgeConnection.peerKey || peer.identityKey === this._edgeConnection.identityKey)
    );
  }

  private async _rejoinAllSwarms(): Promise<void> {
    log('rejoin swarms', { swarms: Array.from(this._swarmPeers.keys()) });
    for (const [topic, { lastState }] of this._swarmPeers.entries()) {
      await this.join({
        topic,
        peer: {
          peerKey: this._edgeConnection.peerKey,
          identityKey: this._edgeConnection.identityKey,
          state: lastState,
        },
      });
    }
  }
}

const createMessageSource = (topic: PublicKey, peerInfo: PeerInfo): buf.MessageInitShape<typeof PeerSchema> => {
  return {
    swarmKey: topic.toHex(),
    ...peerInfo,
  };
};
