//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Queue from 'effect/Queue';
import * as Schema from 'effect/Schema';
import type * as Scope from 'effect/Scope';
import * as RpcClient from 'effect/unstable/rpc/RpcClient';
import * as RpcClientError from 'effect/unstable/rpc/RpcClientError';
import * as RpcMessage from 'effect/unstable/rpc/RpcMessage';
import * as RpcSerialization from 'effect/unstable/rpc/RpcSerialization';
import * as RpcServer from 'effect/unstable/rpc/RpcServer';

import { BaseError } from '@dxos/errors';
import { log } from '@dxos/log';

import { type RpcPort } from './rpc.ts';

/**
 * Interval at which the client re-sends the initial Ping while waiting for the server to attach.
 */
const HANDSHAKE_RETRY_INTERVAL = Duration.millis(50);

/**
 * Effect RPC protocols over a {@link RpcPort} — a transport-agnostic, reliable, ordered,
 * binary message channel. Envelopes and payloads are both SchemaBinary-encoded; the envelope
 * parser and the payload codec come from one {@link RpcSerialization} so the two ends agree.
 */

/**
 * Each port message is a whole frame from a connected peer, so frames are not size-limited.
 */
const layerSerialization = RpcSerialization.layerSchemaBinary({ maxFrameSize: 'unbounded' });

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

/**
 * Decodes port messages, dropping any frame that fails to decode.
 */
const makeFrameDecoder = <Message>(
  serialization: RpcSerialization.RpcSerialization['Service'],
  side: 'client' | 'server',
): ((frame: Uint8Array) => ReadonlyArray<Message>) => {
  let parser = serialization.makeUnsafe();
  return (frame) => {
    try {
      return parser.decode(frame) as ReadonlyArray<Message>;
    } catch (cause) {
      // A SchemaBinary parser rejects every call after its first failure.
      parser = serialization.makeUnsafe();
      log.warn('rpc-port: failed to decode frame', { side, cause });
      return [];
    }
  };
};

/** The underlying {@link RpcPort} rejected a frame. */
export class RpcPortError extends BaseError.extend('RpcPortError', 'Failed to send an RPC frame.') {}

const sendFrame = (port: RpcPort, frame: Uint8Array | string | undefined): Effect.Effect<void, RpcPortError> =>
  frame === undefined || typeof frame === 'string'
    ? Effect.die(new Error('rpc-port protocol requires binary frames'))
    : // Copy the frame: SchemaBinary returns views into a shared arena that later encodes overwrite,
      // but RpcPort.send may be asynchronous (e.g. postMessage) and read the bytes afterwards.
      Effect.tryPromise({
        try: async () => port.send(frame.slice()),
        catch: (cause) => new RpcPortError({ cause }),
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
): Effect.Effect<RpcClient.Protocol['Service'], never, Scope.Scope> =>
  Effect.gen(function* () {
    const serialization = yield* RpcSerialization.RpcSerialization;
    return yield* RpcClient.Protocol.make(
      Effect.fnUntraced(function* (writeResponse) {
        const encoder = serialization.makeUnsafe();
        const decodeFrame = makeFrameDecoder<RpcMessage.FromServerEncoded>(serialization, 'client');
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
            const clientId = boundClientId;
            const backlog = pending.splice(0);
            return Effect.forEach([...backlog, response], (message) => writeResponse(clientId, message), {
              discard: true,
            });
          });

        const send = (request: RpcMessage.FromClientEncoded): Effect.Effect<void, RpcClientError.RpcClientError> =>
          Effect.suspend(() => sendFrame(port, encoder.encode(request))).pipe(
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
            for (const response of decodeFrame(frame.value)) {
              if (response._tag === 'Pong') {
                connected = true;
              } else {
                yield* deliver(response);
              }
            }
          }
        }).pipe(Effect.orDie);

        yield* Queue.take(queue).pipe(
          Effect.flatMap((frame) => Effect.forEach(decodeFrame(frame), deliver, { discard: true })),
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
    );
  }).pipe(Effect.provide(layerSerialization));

export const layerProtocolRpcPortClient = (port: RpcPort): Layer.Layer<RpcClient.Protocol> =>
  Layer.effect(RpcClient.Protocol, makeProtocolRpcPortClient(port));

/**
 * Server-side effect-rpc protocol over an {@link RpcPort}.
 * The port carries a single logical client for the lifetime of the protocol.
 */
export const makeProtocolRpcPortServer = (
  port: RpcPort,
): Effect.Effect<RpcServer.Protocol['Service'], never, Scope.Scope> =>
  Effect.gen(function* () {
    const serialization = yield* RpcSerialization.RpcSerialization;
    return yield* RpcServer.Protocol.make(
      Effect.fnUntraced(function* (writeRequest) {
        const encoder = serialization.makeUnsafe();
        const decodeFrame = makeFrameDecoder<RpcMessage.FromClientEncoded>(serialization, 'server');
        const queue = yield* subscribePort(port);
        const disconnects = yield* Queue.make<number>();
        const clientId = 0;

        // An unknown request tag is the one response v4 builds structurally instead of through the
        // rpc's exit codec, and a serialization whose codec returns bytes has no wire form for that
        // shape. Re-encoding it here keeps an unknown tag a failure of its own request rather than a
        // defect that ends the connection; the `Die` branch it lands in does not depend on the rpc's
        // own success or error schemas.
        const encodeDie = Schema.encodeUnknownSync(
          serialization.codecFor(Schema.Exit(Schema.Void, Schema.Never, Schema.Defect())),
        );
        const unknownTagDefect = (response: RpcMessage.FromServerEncoded): string | undefined => {
          if (response._tag !== 'Exit' || response.exit instanceof Uint8Array || response.exit._tag !== 'Failure') {
            return undefined;
          }
          const [die, ...rest] = response.exit.cause;
          return rest.length === 0 && die?._tag === 'Die' && typeof die.defect === 'string' ? die.defect : undefined;
        };
        const encodeFrame = (response: RpcMessage.FromServerEncoded): Uint8Array | string | undefined => {
          const defect = unknownTagDefect(response);
          return defect === undefined
            ? encoder.encode(response)
            : encoder.encode({ ...response, exit: encodeDie(Exit.die(defect)) });
        };

        yield* Queue.take(queue).pipe(
          Effect.flatMap((frame) =>
            Effect.forEach(decodeFrame(frame), (request) => writeRequest(clientId, request), { discard: true }),
          ),
          Effect.forever,
          Effect.interruptible,
          Effect.forkScoped,
        );

        return {
          disconnects,
          send: (_clientId: number, response: RpcMessage.FromServerEncoded) =>
            Effect.suspend(() => sendFrame(port, encodeFrame(response))).pipe(Effect.orDie),
          end: (_clientId: number) => Effect.void,
          clientIds: Effect.sync(() => new Set([clientId])),
          initialMessage: Effect.succeed(Option.none()),
          supportsAck: true,
          supportsTransferables: false,
          supportsSpanPropagation: false,
          // The port is duplex, so server-originated requests reach the client.
          supportsNotifications: true,
          codecFor: serialization.codecFor,
        };
      }),
    );
  }).pipe(Effect.provide(layerSerialization));

export const layerProtocolRpcPortServer = (port: RpcPort): Layer.Layer<RpcServer.Protocol> =>
  Layer.effect(RpcServer.Protocol, makeProtocolRpcPortServer(port));
