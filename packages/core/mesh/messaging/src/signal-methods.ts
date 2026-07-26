//
// Copyright 2022 DXOS.org
//

import { type Event } from '@dxos/async';
import { type Context } from '@dxos/context';
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

export type SignalStatus = {
  host: string;
  state: SignalState;
  error?: string;
  reconnectIn: number;
  connectionStarted: Date;
  lastStateChange: Date;
};

/**
 * Parameters for {@link SignalMethods.subscribeMessages}.
 */
export type SubscribeMessagesParams = {
  /**
   * The subscribing peer. Point-to-point messages addressed to this `peerKey` are delivered.
   */
  peer: PeerInfo;

  /**
   * OR-subscription tags (DX-1125). When provided, swarm broadcasts whose tags intersect this set are
   * also delivered. Only meaningful for edge signaling; other transports ignore them.
   */
  tags?: string[];

  /**
   * Invoked for every message delivered to this subscription (point-to-point or matching broadcast).
   */
  onMessage: (message: Message) => void;
};

/**
 * Tears down a subscription created by {@link SignalMethods.subscribeMessages} and releases its
 * transport resources (edge tag registration / receive stream). The subscriber owns this lifecycle.
 */
export type UnsubscribeCallback = () => Promise<void>;

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
   * Send a message. Point-to-point when `recipient` is set; a swarm broadcast (DX-1125) when `tags`
   * are set — fanned out to every peer whose tag subscription intersects, with the target swarm taken
   * from `author.swarmKey`. Exactly one of `recipient` / `tags` must be present. Broadcasts are only
   * supported by edge signaling.
   */
  sendMessage: (ctx: Context, message: Message) => Promise<void>;

  /**
   * Start receiving messages for `peer`: its point-to-point messages, plus — when `tags` are provided
   * (DX-1125) — swarm broadcasts whose tags intersect. Matching messages are routed to
   * `params.onMessage`; routing and the transport stream are owned here. Returns a callback that tears
   * the subscription down; the subscriber owns that lifecycle.
   */
  subscribeMessages: (params: SubscribeMessagesParams) => Promise<UnsubscribeCallback>;
}
