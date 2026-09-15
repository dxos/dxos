//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Queue from 'effect/Queue';
import type * as Scope from 'effect/Scope';
import * as RpcClient from 'effect/unstable/rpc/RpcClient';
import * as RpcClientError from 'effect/unstable/rpc/RpcClientError';
import * as RpcMessage from 'effect/unstable/rpc/RpcMessage';
import * as RpcSerialization from 'effect/unstable/rpc/RpcSerialization';
import * as RpcServer from 'effect/unstable/rpc/RpcServer';

import { log } from '@dxos/log';

import { type RpcPort } from './rpc.ts';

/**
 * Interval at which the client re-sends the initial Ping while waiting for the server to attach.
 */
const HANDSHAKE_RETRY_INTERVAL = Duration.millis(50);

/**
 * Effect RPC protocols over a {@link RpcPort} — a transport-agnostic, reliable, ordered,
 * binary message channel. The wire format comes from the ambient `RpcSerialization`, which must
 * be a binary one (e.g. `RpcSerialization.layerSchemaBinary`) because a port carries bytes.
 */

/**
 * Wire format the `layer*` helpers supply, so both ends of a port agree without the caller
 * choosing: a port carries bytes, and both peers are built from this same version.
 */
const BINARY_SERIALIZATION = RpcSerialization.layerSchemaBinary();

const subscribePort = (port: RpcPort) =>
  Effect.gen(function* () {
    const queue = yield* Queue.make<Uint8Array>();
    const unsubscribe = port.subscribe((message) => {
      Queue.offerUnsafe(queue, message);
    });
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        unsubscribe?.();
      }),
    );
    return queue;
  });

const sendFrame = (port: RpcPort, frame: Uint8Array | string | undefined): Effect.Effect<void, Error> =>
  frame === undefined || typeof frame === 'string'
    ? Effect.die(new Error('rpc-port protocol requires binary frames'))
    : // Copy the frame: binary encoders reuse their output buffer, but RpcPort.send may be
      // asynchronous (e.g. postMessage) and read the bytes after the encoder has overwritten them.
      Effect.tryPromise({
        try: async () => port.send(frame.slice()),
        catch: (cause) => (cause instanceof Error ? cause : new Error(String(cause))),
      });

/**
 * Client-side effect-rpc protocol over an {@link RpcPort}.
 *
 * Performs a Ping/Pong handshake on construction: the server answers Pings as soon as it is
 * running, so construction blocks until the peer is reachable and fails fast under an outer
 * timeout instead of buffering requests towards a peer that never attaches.
 */
export const makeProtocolRpcPortClient = (
  port: RpcPort,
): Effect.Effect<RpcClient.Protocol['Service'], never, Scope.Scope | RpcSerialization.RpcSerialization> =>
  Effect.flatMap(RpcSerialization.RpcSerialization, (serialization) =>
    RpcClient.Protocol.make(
      Effect.fnUntraced(function* (writeResponse) {
        const parser = serialization.makeUnsafe();
        const queue = yield* subscribePort(port);

        /**
         * Id of the single client this port carries, learned from its first outgoing request.
         *
         * `RpcClient.make` draws its id from a process-global counter, so it is 0 only for the very
         * first client built in a process; addressing responses to a hard-coded 0 silently buffers
         * every response of every later client. The id is latched from `send` rather than read off
         * the protocol's `clientIds` set, which is only populated once the client's receive loop has
         * been forked — after the first response can already have arrived.
         */
        let boundClientId: number | undefined;

        /** Responses that arrived before the client identified itself; only the handshake can do that. */
        const pending: RpcMessage.FromServerEncoded[] = [];
        const deliver = (response: RpcMessage.FromServerEncoded): Effect.Effect<void> =>
          Effect.suspend(() => {
            if (boundClientId === undefined) {
              pending.push(response);
              return Effect.void;
            }
            const backlog = pending.splice(0);
            return Effect.forEach([...backlog, response], (message) => writeResponse(boundClientId!, message), {
              discard: true,
            });
          });

        const decodeFrame = (frame: Uint8Array) =>
          Effect.try({
            try: () => parser.decode(frame) as ReadonlyArray<RpcMessage.FromServerEncoded>,
            catch: (cause) => {
              log.warn('rpc-port client: failed to decode frame', { cause });
              return [] as ReadonlyArray<RpcMessage.FromServerEncoded>;
            },
          }).pipe(Effect.catch(Effect.succeed));

        const send = (request: RpcMessage.FromClientEncoded): Effect.Effect<void, RpcClientError.RpcClientError> =>
          Effect.suspend(() => sendFrame(port, parser.encode(request))).pipe(
            Effect.mapError(
              (cause) =>
                // v4 types `reason` as a structured union rather than a string tag; a transport
                // failure on a custom port is a client-side protocol defect.
                new RpcClientError.RpcClientError({
                  reason: new RpcClientError.RpcClientDefect({
                    message: 'Failed to send message over RpcPort',
                    cause,
                  }),
                }),
            ),
          );

        // Handshake: resend Ping until the server responds, forwarding any other early responses.
        // Transport failures during the handshake are unrecoverable for this connection.
        yield* Effect.gen(function* () {
          let connected = false;
          while (!connected) {
            yield* send(RpcMessage.constPing);
            const frame = yield* Queue.take(queue).pipe(Effect.timeoutOption(HANDSHAKE_RETRY_INTERVAL));
            if (Option.isNone(frame)) {
              continue;
            }
            for (const response of yield* decodeFrame(frame.value)) {
              if (response._tag === 'Pong') {
                connected = true;
              } else {
                yield* deliver(response);
              }
            }
          }
        }).pipe(Effect.orDie);

        yield* Queue.take(queue).pipe(
          Effect.flatMap(decodeFrame),
          Effect.flatMap((responses) => Effect.forEach(responses, deliver, { discard: true })),
          Effect.forever,
          Effect.orDie,
          Effect.interruptible,
          Effect.forkScoped,
        );

        return {
          send: (clientId: number, request: RpcMessage.FromClientEncoded) => {
            boundClientId = clientId;
            return send(request);
          },
          supportsAck: true,
          supportsTransferables: false,
          codecFor: serialization.codecFor,
        };
      }),
    ),
  );

export const layerProtocolRpcPortClient = (port: RpcPort): Layer.Layer<RpcClient.Protocol> =>
  Layer.effect(RpcClient.Protocol, makeProtocolRpcPortClient(port)).pipe(Layer.provide(BINARY_SERIALIZATION));

/**
 * Server-side effect-rpc protocol over an {@link RpcPort}.
 * The port carries a single logical client for the lifetime of the protocol.
 */
export const makeProtocolRpcPortServer = (
  port: RpcPort,
): Effect.Effect<RpcServer.Protocol['Service'], never, Scope.Scope | RpcSerialization.RpcSerialization> =>
  Effect.flatMap(RpcSerialization.RpcSerialization, (serialization) =>
    RpcServer.Protocol.make(
      Effect.fnUntraced(function* (writeRequest) {
        const parser = serialization.makeUnsafe();
        const queue = yield* subscribePort(port);
        const disconnects = yield* Queue.make<number>();
        const clientId = 0;

        yield* Queue.take(queue).pipe(
          Effect.flatMap((frame) =>
            Effect.try({
              try: () => parser.decode(frame) as ReadonlyArray<RpcMessage.FromClientEncoded>,
              catch: (cause) => {
                log.warn('rpc-port server: failed to decode frame', { cause });
                return [] as ReadonlyArray<RpcMessage.FromClientEncoded>;
              },
            }).pipe(Effect.catch(Effect.succeed)),
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
          supportsNotifications: false,
          codecFor: serialization.codecFor,
        };
      }),
    ),
  );

export const layerProtocolRpcPortServer = (port: RpcPort): Layer.Layer<RpcServer.Protocol> =>
  Layer.effect(RpcServer.Protocol, makeProtocolRpcPortServer(port)).pipe(Layer.provide(BINARY_SERIALIZATION));
