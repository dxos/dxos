//
// Copyright 2024 DXOS.org
//

// DX-1059: this client is already DID-only — it never writes the deprecated `identity_key`
// (proto field 2). The dual-read fallback that still gates removing that field lives on the
// edge side (which relays peers from not-yet-migrated senders); nothing here needs it.

import { Event, scheduleMicroTask } from '@dxos/async';
import { type Context, Resource, cancelWithContext } from '@dxos/context';
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

import {
  type Message,
  type PeerInfo,
  PeerInfoHash,
  type SubscribeMessagesParams,
  type SwarmEvent,
  type UnsubscribeCallback,
} from '../signal-methods';
import { type SignalManager } from './signal-manager';

/**
 * A single message subscription registered on an {@link EdgeSignalManager} (DX-1125). Point-to-point
 * delivery matches `peerKey`; broadcast delivery matches any intersection with `tags`.
 */
type MessageSubscription = {
  peerKey: string;
  tags: Set<string>;
  onMessage: (message: Message) => void;
};

export class EdgeSignalManager extends Resource implements SignalManager {
  /**
   * @deprecated
   */
  public swarmEvent = new Event<SwarmEvent>();
  public swarmState = new Event<SwarmResponse>();

  /**
   * Active message subscriptions. Routing is encapsulated here (DX-1125): each incoming message is
   * dispatched to every subscription it matches, and each subscription owns its own teardown.
   */
  private readonly _subscriptions = new Set<MessageSubscription>();

  /**
   * Swarm key -> { peer: <own state payload>, joinedPeers: <state of swarm> }.
   */
  // TODO(mykola): This class should not contain swarm state joinedPeers. Temporary before network-manager API changes to accept list of peers.
  private readonly _swarmPeers = new ComplexMap<
    PublicKey,
    { lastState?: Uint8Array; joinedPeers: ComplexSet<PeerInfo> }
  >(PublicKey.hash);

  /**
   * OR-subscription tag refcounts for broadcast messages (DX-1125). One count per distinct tag across
   * all subscribers, so one consumer's unsubscribe releases only its own registration rather than
   * clobbering another consumer's identical subscription. The effective tag set (the keys) is shared
   * across all joined swarms; the edge fans out any broadcast whose tags intersect it. Re-sent on
   * reconnect and whenever a swarm is (re-)joined.
   */
  private readonly _subscribedTags = new Map<string, number>();

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
  async join(ctx: Context, { topic, peer }: { topic: PublicKey; peer: PeerInfo }): Promise<void> {
    if (!this._matchSelfPeerInfo(peer)) {
      // NOTE: Could only join swarm with the same peer info as the edge connection.
      log.warn('ignoring peer info on join request', {
        peer,
        expected: {
          peerKey: this._edgeConnection.peerKey,
          identityDid: this._edgeConnection.identityDid,
        },
      });

      // DX-1059: advertise only the identity DID; the client no longer sends the hex `identityKey`
      // (edge derives the connection's identity from auth, not from this message body).
      peer.identityDid = this._edgeConnection.identityDid;
      peer.peerKey = this._edgeConnection.peerKey;
    }

    this._swarmPeers.set(topic, { lastState: peer.state, joinedPeers: new ComplexSet<PeerInfo>(PeerInfoHash) });
    await this._edgeConnection.send(
      ctx,
      protocol.createMessage(SwarmRequestSchema, {
        serviceId: EdgeService.SWARM,
        source: createMessageSource(topic, peer),
        payload: { action: SwarmRequestAction.JOIN, swarmKeys: [topic.toHex()] },
      }),
    );

    // Re-establish any broadcast subscription on the newly-joined swarm (DX-1125).
    if (this._subscribedTags.size > 0) {
      await this._sendSubscription(ctx);
    }
  }

  async leave(ctx: Context, { topic, peer }: { topic: PublicKey; peer: PeerInfo }): Promise<void> {
    this._swarmPeers.delete(topic);
    try {
      await this._edgeConnection.send(
        ctx,
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

  async query(ctx: Context, { topic }: { topic: PublicKey }): Promise<SwarmResponse> {
    const response = cancelWithContext(
      this._ctx,
      this.swarmState.waitFor((state) => state.swarmKey === topic.toHex()),
    );

    await this._edgeConnection.send(
      ctx,
      protocol.createMessage(SwarmRequestSchema, {
        serviceId: EdgeService.SWARM,
        source: createMessageSource(topic, {
          peerKey: this._edgeConnection.peerKey,
          identityDid: this._edgeConnection.identityDid,
        }),
        payload: { action: SwarmRequestAction.INFO, swarmKeys: [topic.toHex()] },
      }),
    );

    return response;
  }

  async sendMessage(ctx: Context, message: Message): Promise<void> {
    const { author, recipient, tags, payload } = message;
    // Exactly one of point-to-point (`recipient`) or broadcast (`tags`) delivery (DX-1125). A broadcast
    // carries its target swarm in `author.swarmKey` and is published with no `target`; the edge fans it
    // out to every peer whose subscription tags intersect.
    invariant((recipient == null) !== !tags?.length, 'Exactly one of `recipient` or `tags` must be set');

    if (!this._matchSelfPeerInfo(author)) {
      // NOTE: Could only join swarm with the same peer info as the edge connection.
      log.warn('ignoring author on send request', {
        author,
        expected: { peerKey: this._edgeConnection.peerKey, identityDid: this._edgeConnection.identityDid },
      });
    }

    await this._edgeConnection.send(
      ctx,
      protocol.createMessage(bufWkt.AnySchema, {
        serviceId: EdgeService.SIGNAL,
        source: author,
        target: recipient != null ? [recipient] : undefined,
        tags,
        payload: { typeUrl: payload.type_url, value: payload.value },
      }),
    );
  }

  async subscribeMessages({ peer, tags = [], onMessage }: SubscribeMessagesParams): Promise<UnsubscribeCallback> {
    const subscription: MessageSubscription = { peerKey: peer.peerKey, tags: new Set(tags), onMessage };
    this._subscriptions.add(subscription);

    // Point-to-point delivery needs no edge registration (the edge relays targeted messages to this
    // peer's socket). Only tag broadcasts require an OR-subscription registered on the swarm (DX-1125),
    // refcounted so one subscriber's teardown does not clobber another's identical tags.
    let changed = false;
    for (const tag of subscription.tags) {
      const count = this._subscribedTags.get(tag) ?? 0;
      this._subscribedTags.set(tag, count + 1);
      if (count === 0) {
        changed = true;
      }
    }
    if (changed) {
      await this._sendSubscription(this._ctx);
    }

    return async () => {
      this._subscriptions.delete(subscription);
      // Release only this subscription's tag registrations; a tag stays live while another holds it.
      let released = false;
      for (const tag of subscription.tags) {
        const count = this._subscribedTags.get(tag);
        if (count === undefined) {
          continue;
        }
        if (count > 1) {
          this._subscribedTags.set(tag, count - 1);
        } else {
          this._subscribedTags.delete(tag);
          released = true;
        }
      }
      if (released) {
        await this._sendSubscription(this._ctx);
      }
    };
  }

  /**
   * Send the current broadcast tag subscription to every joined swarm (DX-1125). An empty tag set
   * clears the subscription on the edge.
   */
  private async _sendSubscription(ctx: Context): Promise<void> {
    const swarmKeys = Array.from(this._swarmPeers.keys()).map((topic) => topic.toHex());
    if (swarmKeys.length === 0) {
      return;
    }
    await this._edgeConnection.send(
      ctx,
      protocol.createMessage(SwarmRequestSchema, {
        serviceId: EdgeService.SWARM,
        source: {
          peerKey: this._edgeConnection.peerKey,
          identityDid: this._edgeConnection.identityDid,
        },
        payload: {
          action: SwarmRequestAction.SUBSCRIBE,
          swarmKeys,
          subscribeTags: Array.from(this._subscribedTags.keys()),
        },
      }),
    );
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

    // Broadcasts (DX-1125) carry tags and no target; point-to-point messages carry exactly one target.
    if ((message.tags?.length ?? 0) > 0 && (message.target?.length ?? 0) === 0) {
      this._deliver({
        author: message.source,
        tags: message.tags ?? [],
        payload: { type_url: payload.typeUrl, value: payload.value },
      });
      return;
    }

    invariant(message.target, 'target is missing');
    invariant(message.target.length === 1, 'target should have exactly one item');

    this._deliver({
      author: message.source,
      recipient: message.target[0],
      payload: {
        type_url: payload.typeUrl,
        value: payload.value,
      },
    });
  }

  /**
   * Route an incoming message to matching subscriptions (DX-1125): point-to-point by recipient
   * `peerKey`, broadcasts by tag intersection.
   */
  private _deliver(message: Message): void {
    for (const subscription of this._subscriptions) {
      if (message.recipient != null) {
        if (subscription.peerKey === message.recipient.peerKey) {
          subscription.onMessage(message);
        }
      } else if (message.tags?.some((tag) => subscription.tags.has(tag))) {
        subscription.onMessage(message);
      }
    }
  }

  private _matchSelfPeerInfo(peer: PeerInfo): boolean {
    return Boolean(
      peer && (peer.peerKey === this._edgeConnection.peerKey || peer.identityDid === this._edgeConnection.identityDid),
    );
  }

  private async _rejoinAllSwarms(): Promise<void> {
    log('rejoin swarms', { swarms: Array.from(this._swarmPeers.keys()) });
    for (const [topic, { lastState }] of this._swarmPeers.entries()) {
      await this.join(this._ctx, {
        topic,
        peer: {
          peerKey: this._edgeConnection.peerKey,
          identityDid: this._edgeConnection.identityDid,
          state: lastState,
        },
      });
    }
    // Re-establish the broadcast subscription across the rejoined swarms (DX-1125).
    if (this._subscribedTags.size > 0) {
      await this._sendSubscription(this._ctx);
    }
  }
}

const createMessageSource = (topic: PublicKey, peerInfo: PeerInfo): buf.MessageInitShape<typeof PeerSchema> => {
  return {
    swarmKey: topic.toHex(),
    ...peerInfo,
  };
};
