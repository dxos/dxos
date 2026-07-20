//
// Copyright 2022 DXOS.org
//

import { type Event } from '@dxos/async';
import { type Context, type Lifecycle } from '@dxos/context';
import { type Peer, type SwarmResponse } from '@dxos/protocols/proto/dxos/edge/messenger';
import {
  type JoinRequest,
  type LeaveRequest,
  type Message,
  type QueryRequest,
  type SwarmEvent,
} from '@dxos/protocols/proto/dxos/edge/signal';
import { type SignalState } from '@dxos/protocols/proto/dxos/mesh/signal';

export type { Message, SwarmEvent };
export type PeerInfo = Peer;
export const PeerInfoHash = ({ peerKey }: PeerInfo) => peerKey;

/**
 * A broadcast message delivered by tag intersection rather than to a single recipient (DX-1125).
 */
export type BroadcastMessage = Pick<Message, 'author' | 'payload'> & { tags: string[] };

export type SignalStatus = {
  host: string;
  state: SignalState;
  error?: string;
  reconnectIn: number;
  connectionStarted: Date;
  lastStateChange: Date;
};

/**
 * Message routing interface.
 */
export interface SignalMethods {
  /**
   * Emits when other peers join or leave the swarm.
   * @deprecated
   * TODO(mykola): Use swarmState in network-manager instead.
   */
  swarmEvent: Event<SwarmEvent>;

  /**
   * Emits when a point-to-point message addressed to this peer is received.
   */
  onMessage: Event<Message>;

  /**
   * Emits when a tag broadcast matching this peer's subscription is received (DX-1125).
   * Only edge signaling delivers broadcasts; other transports leave this undefined.
   */
  onBroadcast?: Event<BroadcastMessage>;

  /**
   * Emits when the swarm state changes.
   */
  swarmState?: Event<SwarmResponse>;

  /**
   * Join topic on signal network, to be discoverable by other peers.
   */
  join: (ctx: Context, params: JoinRequest) => Promise<void>;

  /**
   * Leave topic on signal network, to stop being discoverable by other peers.
   */
  leave: (ctx: Context, params: LeaveRequest) => Promise<void>;

  /**
   * Query peers in the swarm without joining it.
   */
  query: (ctx: Context, params: QueryRequest) => Promise<SwarmResponse>;

  /**
   * Send a point-to-point message to a peer.
   */
  sendMessage: (ctx: Context, message: Message) => Promise<void>;

  /**
   * Broadcast a tagged message to a swarm (DX-1125). Fanned out to every peer whose tag subscription
   * intersects `tags`. Only supported by edge signaling.
   */
  sendBroadcast?: (
    ctx: Context,
    params: { author: PeerInfo; swarmKey: string; tags: string[]; payload: Message['payload'] },
  ) => Promise<void>;

  /**
   * Start receiving messages addressed to `peer`. When `tags` are provided (DX-1125), also register an
   * OR-subscription so the peer receives swarm broadcasts whose tags intersect `tags` (emitted on
   * {@link onBroadcast}). Tags are only meaningful for edge signaling; other transports ignore them.
   */
  // TODO(burdon): Return unsubscribe function. Encapsulate callback/routing here.
  subscribeMessages: (peer: PeerInfo, tags?: string[]) => Promise<void>;

  /**
   * Stop receiving messages from peer and clear any tag subscription.
   */
  unsubscribeMessages: (peer: PeerInfo) => Promise<void>;
}

/**
 * Signaling client.
 * TODO(mykola): Delete.
 * @deprecated
 */
export interface SignalClientMethods extends SignalMethods, Required<Lifecycle> {
  getStatus(): SignalStatus;
}
