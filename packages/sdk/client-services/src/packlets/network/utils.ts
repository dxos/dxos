//
// Copyright 2026 DXOS.org
//

import { buf } from '@dxos/protocols/buf';
import { decodeCompat, encodeCompat } from '@dxos/protocols/buf-shape-compat';
import { type SwarmInfo, SwarmInfoSchema } from '@dxos/protocols/buf/dxos/devtools/swarm_pb';
import {
  type Peer,
  PeerSchema,
  type SwarmResponse,
  SwarmResponseSchema,
} from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import {
  type JoinRequest,
  JoinRequestSchema,
  type LeaveRequest,
  LeaveRequestSchema,
  type Message,
  MessageSchema,
  type QueryRequest,
  QueryRequestSchema,
} from '@dxos/protocols/buf/dxos/edge/signal_pb';
import { type SwarmInfo as LegacySwarmInfo } from '@dxos/protocols/buf/dxos/devtools/swarm_pb';
import {
  type Peer as LegacyPeer,
  type SwarmResponse as LegacySwarmResponse,
} from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import {
  type JoinRequest as LegacyJoinRequest,
  type LeaveRequest as LegacyLeaveRequest,
  type Message as LegacyMessage,
  type QueryRequest as LegacyQueryRequest,
} from '@dxos/protocols/buf/dxos/edge/signal_pb';

//
// `SignalManager` is still written against the protobuf.js shapes while the service speaks buf.
// Both codecs agree byte for byte, which makes the encoding the conversion; these bridges delete
// themselves when `@dxos/messaging` moves to buf.
//

/** Reads a join request as the shape `SignalManager` expects. */
export const fromBufJoinRequest = (request: JoinRequest): LegacyJoinRequest =>
  decodeCompat(JoinRequestSchema, buf.toBinary(JoinRequestSchema, request));

/** Reads a leave request as the shape `SignalManager` expects. */
export const fromBufLeaveRequest = (request: LeaveRequest): LegacyLeaveRequest =>
  decodeCompat(LeaveRequestSchema, buf.toBinary(LeaveRequestSchema, request));

/** Reads a query request as the shape `SignalManager` expects. */
export const fromBufQueryRequest = (request: QueryRequest): LegacyQueryRequest =>
  decodeCompat(QueryRequestSchema, buf.toBinary(QueryRequestSchema, request));

/** Reads a message as the shape `SignalManager` expects. */
export const fromBufMessage = (message: Message): LegacyMessage =>
  decodeCompat(MessageSchema, buf.toBinary(MessageSchema, message));

/** Reads a subscribing peer as the shape `SignalManager` expects. */
export const fromBufPeer = (peer: Peer): LegacyPeer => decodeCompat(PeerSchema, buf.toBinary(PeerSchema, peer));

/** Reads a swarm response from `SignalManager` as the buf message the service returns. */
export const toBufSwarmResponse = (response: LegacySwarmResponse): SwarmResponse =>
  buf.fromBinary(SwarmResponseSchema, encodeCompat(SwarmResponseSchema, response));

/** Reads a message from `SignalManager` as the buf message the service streams. */
export const toBufMessage = (message: LegacyMessage): Message =>
  buf.fromBinary(MessageSchema, encodeCompat(MessageSchema, message));

/** Reads the connection log's swarms as the buf messages the status message carries. */
export const toBufSwarmInfo = (info: LegacySwarmInfo): SwarmInfo =>
  buf.fromBinary(SwarmInfoSchema, encodeCompat(SwarmInfoSchema, info));
