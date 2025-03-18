//
// Copyright 2022 DXOS.org
//

import { type Event } from '@dxos/async';
import { type Lifecycle } from '@dxos/context';
import { type QueryRequest } from '@dxos/protocols/proto/dxos/echo/query';
import { type SwarmResponse, type Peer } from '@dxos/protocols/proto/dxos/edge/messenger';
import { type LeaveRequest, type JoinRequest, type Message } from '@dxos/protocols/proto/dxos/mesh/signal';

export type PeerInfo = Peer;
export const PeerInfoHash = ({ peerKey }: PeerInfo) => peerKey;
export type { JoinRequest, LeaveRequest, Message, QueryRequest, SwarmResponse };

/**
 * Message routing interface.
 */
export interface SignalManager extends Required<Lifecycle> {
  onMessage: Event<Message>;

  /**
   * Emits when the swarm state changes.
   */
  swarmState: Event<SwarmResponse>;

  /**
   * Join swarmKey on signal network, to be discoverable by other peers.
   */
  join: (params: JoinRequest) => Promise<void>;

  /**
   * Leave swarmKey on signal network, to stop being discoverable by other peers.
   */
  leave: (params: LeaveRequest) => Promise<void>;

  /**
   * Query swarm state without joining it.
   */
  query: (params: QueryRequest) => Promise<void>;

  /**
   * Send message to peer.
   */
  sendMessage: (message: Message) => Promise<void>;
}
