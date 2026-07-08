//
// Copyright 2026 DXOS.org
//

import * as RpcClient from '@effect/rpc/RpcClient';
import * as RpcClientError from '@effect/rpc/RpcClientError';
import * as RpcMessage from '@effect/rpc/RpcMessage';
import * as RpcSerialization from '@effect/rpc/RpcSerialization';
import * as RpcServer from '@effect/rpc/RpcServer';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Mailbox from 'effect/Mailbox';
import * as Option from 'effect/Option';
import type * as Scope from 'effect/Scope';

import { log } from '@dxos/log';

import { type RpcPort } from './rpc';

/**
 * Interval at which the client re-sends the initial Ping while waiting for the server to attach.
 */
const HANDSHAKE_RETRY_INTERVAL = Duration.millis(50);

/**
 * Effect RPC protocols over a {@link RpcPort} — a transport-agnostic, reliable, ordered,
 * binary message channel. Message envelopes are framed with msgpack; RPC payloads are expected
 * to already be binary-safe (e.g. protobuf-encoded by the payload schemas).
 */

const subscribePort = (port: RpcPort) =>
  Effect.gen(function* () {
    const mailbox = yield* Mailbox.make<Uint8Array>();
    const unsubscribe = port.subscribe((message) => {
      mailbox.unsafeOffer(message);
    });
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        unsubscribe?.();
      }),
    );
    return mailbox;
  });

const sendFrame = (port: RpcPort, frame: Uint8Array | string | undefined): Effect.Effect<void> =>
  frame === undefined || typeof frame === 'string'
    ? Effect.dieMessage('rpc-port protocol requires binary frames')
    : // Copy the frame: msgpack encoders reuse their output buffer, but RpcPort.send may be
      // asynchronous (e.g. postMessage) and read the bytes after the encoder has overwritten them.
      Effect.promise(async () => port.send(frame.slice()));

/**
 * Client-side effect-rpc protocol over an {@link RpcPort}.
 *
 * Performs a Ping/Pong handshake on construction: the server answers Pings as soon as it is
 * running, so construction blocks until the peer is reachable and fails fast under an outer
 * timeout instead of buffering requests towards a peer that never attaches.
 */
export const makeProtocolRpcPortClient = (
  port: RpcPort,
): Effect.Effect<RpcClient.Protocol['Type'], never, Scope.Scope> =>
  RpcClient.Protocol.make(
    Effect.fnUntraced(function* (writeResponse) {
      const parser = RpcSerialization.msgPack.unsafeMake();
      const mailbox = yield* subscribePort(port);

      const decodeFrame = (frame: Uint8Array) =>
        Effect.try({
          try: () => parser.decode(frame) as ReadonlyArray<RpcMessage.FromServerEncoded>,
          catch: (cause) => {
            log.warn('rpc-port client: failed to decode frame', { cause });
            return [] as ReadonlyArray<RpcMessage.FromServerEncoded>;
          },
        }).pipe(Effect.merge);

      const send = (request: RpcMessage.FromClientEncoded): Effect.Effect<void, RpcClientError.RpcClientError> =>
        Effect.suspend(() => sendFrame(port, parser.encode(request))).pipe(
          Effect.mapError(
            (cause) =>
              new RpcClientError.RpcClientError({
                reason: 'Protocol',
                message: 'Failed to send message over RpcPort',
                cause,
              }),
          ),
        );

      // Handshake: resend Ping until the server responds, forwarding any other early responses.
      // Transport failures during the handshake are unrecoverable for this connection.
      yield* Effect.gen(function* () {
        let connected = false;
        while (!connected) {
          yield* send(RpcMessage.constPing);
          const frame = yield* mailbox.take.pipe(Effect.timeoutOption(HANDSHAKE_RETRY_INTERVAL));
          if (Option.isNone(frame)) {
            continue;
          }
          for (const response of yield* decodeFrame(frame.value)) {
            if (response._tag === 'Pong') {
              connected = true;
            } else {
              yield* writeResponse(response);
            }
          }
        }
      }).pipe(Effect.orDie);

      yield* mailbox.take.pipe(
        Effect.flatMap(decodeFrame),
        Effect.flatMap((responses) => Effect.forEach(responses, writeResponse, { discard: true })),
        Effect.forever,
        Effect.orDie,
        Effect.interruptible,
        Effect.forkScoped,
      );

      return {
        send,
        supportsAck: true,
        supportsTransferables: false,
      };
    }),
  );

export const layerProtocolRpcPortClient = (port: RpcPort): Layer.Layer<RpcClient.Protocol> =>
  Layer.scoped(RpcClient.Protocol, makeProtocolRpcPortClient(port));

/**
 * Server-side effect-rpc protocol over an {@link RpcPort}.
 * The port carries a single logical client for the lifetime of the protocol.
 */
export const makeProtocolRpcPortServer = (
  port: RpcPort,
): Effect.Effect<RpcServer.Protocol['Type'], never, Scope.Scope> =>
  RpcServer.Protocol.make(
    Effect.fnUntraced(function* (writeRequest) {
      const parser = RpcSerialization.msgPack.unsafeMake();
      const mailbox = yield* subscribePort(port);
      const disconnects = yield* Mailbox.make<number>();
      const clientId = 0;

      yield* mailbox.take.pipe(
        Effect.flatMap((frame) =>
          Effect.try({
            try: () => parser.decode(frame) as ReadonlyArray<RpcMessage.FromClientEncoded>,
            catch: (cause) => {
              log.warn('rpc-port server: failed to decode frame', { cause });
              return [] as ReadonlyArray<RpcMessage.FromClientEncoded>;
            },
          }).pipe(Effect.merge),
        ),
        Effect.flatMap((requests) =>
          Effect.forEach(requests, (request) => writeRequest(clientId, request), { discard: true }),
        ),
        Effect.forever,
        Effect.interruptible,
        Effect.forkScoped,
      );

      return {
        disconnects,
        send: (_clientId: number, response: RpcMessage.FromServerEncoded) =>
          Effect.suspend(() => sendFrame(port, parser.encode(response))).pipe(Effect.orDie),
        end: (_clientId: number) => Effect.void,
        clientIds: Effect.sync(() => new Set([clientId])),
        initialMessage: Effect.succeed(Option.none()),
        supportsAck: true,
        supportsTransferables: false,
        supportsSpanPropagation: false,
      };
    }),
  );

export const layerProtocolRpcPortServer = (port: RpcPort): Layer.Layer<RpcServer.Protocol> =>
  Layer.scoped(RpcServer.Protocol, makeProtocolRpcPortServer(port));
