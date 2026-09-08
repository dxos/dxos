//
// Copyright 2026 DXOS.org
//

import { buf } from '@dxos/protocols/buf';
import { decodeCompat, encodeCompat } from '@dxos/protocols/buf-shape-compat';
import {
  type BridgeEvent,
  BridgeEventSchema,
  type CloseRequest,
  CloseRequestSchema,
  type ConnectionRequest,
  ConnectionRequestSchema,
  type DataRequest,
  DataRequestSchema,
  type DetailsRequest,
  DetailsRequestSchema,
  type DetailsResponse,
  DetailsResponseSchema,
  type SignalRequest,
  SignalRequestSchema,
  type StatsRequest,
  StatsRequestSchema,
  type StatsResponse,
  StatsResponseSchema,
} from '@dxos/protocols/buf/dxos/mesh/bridge_pb';
import {
  type BridgeEvent as LegacyBridgeEvent,
  type CloseRequest as LegacyCloseRequest,
  type ConnectionRequest as LegacyConnectionRequest,
  type DataRequest as LegacyDataRequest,
  type DetailsRequest as LegacyDetailsRequest,
  type DetailsResponse as LegacyDetailsResponse,
  type SignalRequest as LegacySignalRequest,
  type StatsRequest as LegacyStatsRequest,
  type StatsResponse as LegacyStatsResponse,
} from '@dxos/protocols/proto/dxos/mesh/bridge';

//
// The bridge RPC speaks buf while `RtcTransportService` and `RtcTransportProxyFactory` stay on the
// protobuf.js shapes, which keeps the transport keying its proxy map on `PublicKey` instances rather
// than on messages that compare by identity. Both codecs agree byte for byte, so the encoding is the
// conversion; these bridges delete themselves when the transport moves to buf.
//

/** Reads a connection request as the shape `RtcTransportService` implements. */
export const fromBufConnectionRequest = (request: ConnectionRequest): LegacyConnectionRequest =>
  decodeCompat(ConnectionRequestSchema, buf.toBinary(ConnectionRequestSchema, request));

/** Reads a signal request as the shape `RtcTransportService` implements. */
export const fromBufSignalRequest = (request: SignalRequest): LegacySignalRequest =>
  decodeCompat(SignalRequestSchema, buf.toBinary(SignalRequestSchema, request));

/** Reads a data request as the shape `RtcTransportService` implements. */
export const fromBufDataRequest = (request: DataRequest): LegacyDataRequest =>
  decodeCompat(DataRequestSchema, buf.toBinary(DataRequestSchema, request));

/** Reads a close request as the shape `RtcTransportService` implements. */
export const fromBufCloseRequest = (request: CloseRequest): LegacyCloseRequest =>
  decodeCompat(CloseRequestSchema, buf.toBinary(CloseRequestSchema, request));

/** Reads a details request as the shape `RtcTransportService` implements. */
export const fromBufDetailsRequest = (request: DetailsRequest): LegacyDetailsRequest =>
  decodeCompat(DetailsRequestSchema, buf.toBinary(DetailsRequestSchema, request));

/** Reads a stats request as the shape `RtcTransportService` implements. */
export const fromBufStatsRequest = (request: StatsRequest): LegacyStatsRequest =>
  decodeCompat(StatsRequestSchema, buf.toBinary(StatsRequestSchema, request));

/** Reads a bridge event from the transport as the buf message the RPC streams. */
export const toBufBridgeEvent = (event: LegacyBridgeEvent): BridgeEvent =>
  buf.fromBinary(BridgeEventSchema, encodeCompat(BridgeEventSchema, event));

/** Reads a details response from the transport as the buf message the RPC returns. */
export const toBufDetailsResponse = (response: LegacyDetailsResponse): DetailsResponse =>
  buf.fromBinary(DetailsResponseSchema, encodeCompat(DetailsResponseSchema, response));

/** Reads a stats response from the transport as the buf message the RPC returns. */
export const toBufStatsResponse = (response: LegacyStatsResponse): StatsResponse =>
  buf.fromBinary(StatsResponseSchema, encodeCompat(StatsResponseSchema, response));

/** Reads a connection request as the buf message the RPC sends. */
export const toBufConnectionRequest = (request: LegacyConnectionRequest): ConnectionRequest =>
  buf.fromBinary(ConnectionRequestSchema, encodeCompat(ConnectionRequestSchema, request));

/** Reads a signal request as the buf message the RPC sends. */
export const toBufSignalRequest = (request: LegacySignalRequest): SignalRequest =>
  buf.fromBinary(SignalRequestSchema, encodeCompat(SignalRequestSchema, request));

/** Reads a data request as the buf message the RPC sends. */
export const toBufDataRequest = (request: LegacyDataRequest): DataRequest =>
  buf.fromBinary(DataRequestSchema, encodeCompat(DataRequestSchema, request));

/** Reads a close request as the buf message the RPC sends. */
export const toBufCloseRequest = (request: LegacyCloseRequest): CloseRequest =>
  buf.fromBinary(CloseRequestSchema, encodeCompat(CloseRequestSchema, request));

/** Reads a details request as the buf message the RPC sends. */
export const toBufDetailsRequest = (request: LegacyDetailsRequest): DetailsRequest =>
  buf.fromBinary(DetailsRequestSchema, encodeCompat(DetailsRequestSchema, request));

/** Reads a stats request as the buf message the RPC sends. */
export const toBufStatsRequest = (request: LegacyStatsRequest): StatsRequest =>
  buf.fromBinary(StatsRequestSchema, encodeCompat(StatsRequestSchema, request));

/** Reads a bridge event from the RPC as the shape `RtcTransportProxy` consumes. */
export const fromBufBridgeEvent = (event: BridgeEvent): LegacyBridgeEvent =>
  decodeCompat(BridgeEventSchema, buf.toBinary(BridgeEventSchema, event));

/** Reads a details response from the RPC as the shape `RtcTransportProxy` consumes. */
export const fromBufDetailsResponse = (response: DetailsResponse): LegacyDetailsResponse =>
  decodeCompat(DetailsResponseSchema, buf.toBinary(DetailsResponseSchema, response));

/** Reads a stats response from the RPC as the shape `RtcTransportProxy` consumes. */
export const fromBufStatsResponse = (response: StatsResponse): LegacyStatsResponse =>
  decodeCompat(StatsResponseSchema, buf.toBinary(StatsResponseSchema, response));
