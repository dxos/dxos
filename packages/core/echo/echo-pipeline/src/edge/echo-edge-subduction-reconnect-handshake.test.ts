//
// Copyright 2026 DXOS.org
//

import { cbor, initSubduction } from '@automerge/automerge-repo';
import {
  MemorySigner,
  MemoryStorage,
  Subduction,
  type Transport,
} from '@automerge/automerge-subduction';
import { getRandomPort } from 'get-port-please';
import { beforeAll, describe, expect, onTestFinished, test } from 'vitest';

import { Context } from '@dxos/context';
import {
  EdgeClient,
  type EdgeHttpClient,
  MessageSchema,
  createEphemeralEdgeIdentity,
} from '@dxos/edge-client';
import { createTestEdgeWsServer } from '@dxos/edge-client/testing';
import { PublicKey, SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  EdgeService,
  MESSAGE_TYPE_SUBDUCTION_CONNECTION,
  MESSAGE_TYPE_SUBDUCTION_FRAME,
  MESSAGE_TYPE_SUBDUCTION_RECONNECT,
  type PeerId,
  type SubductionConnectionMessage,
  type SubductionFrameEnvelope,
} from '@dxos/protocols';
import { createBuf } from '@dxos/protocols/buf';
import type { Peer } from '@dxos/protocols/proto/dxos/edge/messenger';
import { openAndClose } from '@dxos/test-utils';
import { compositeKey } from '@dxos/util';

import {
  type AutomergeReplicatorConnection,
  type AutomergeReplicatorContext,
} from '../automerge';
import { EchoEdgeSubductionReplicator } from './echo-edge-subduction-replicator';

const SUBDUCTION_HANDSHAKE_MAGIC = new Uint8Array([0x53, 0x55, 0x48, 0x00]);
const SUBDUCTION_SYNC_MAGIC = new Uint8Array([0x53, 0x55, 0x4d, 0x00]);

/**
 * Hypothesis test for the BZ4WRVUR-style reconnect-loop stall:
 *
 * After {@link EchoEdgeSubductionReplicator._handleReconnect} (or per-connection
 * `_onRestartRequested`) tears down an `EdgeSubductionReplicatorConnection`
 * and opens a fresh one with a new `_connectionId`, does the client's
 * `Subduction` instance issue a fresh `SUH\0` handshake on the new transport,
 * or does it carry over its protocol state with the edge peer and start
 * sending `SUM\0` post-handshake frames immediately?
 *
 * If the latter, the edge's `_dispatchSubductionFrame` would correctly drop
 * the bytes (`isHandshakeFrame` checks for `SUH\0` only) and pin the client
 * in a reconnect loop. That matches the production symptom: every new
 * `connectionId` we see in the edge log gets a 110–550-byte frame dropped as
 * "unknown connectionId", never a handshake.
 *
 * The test wires a real `Subduction` instance on each side of the
 * `EdgeSubductionReplicatorConnection` ↔ test WS server, lets the first
 * handshake complete, triggers a reconnect, and inspects the magic prefix of
 * the first outbound `subductionFrame.data` byte payload on each
 * `connectionId`.
 */
describe('EchoEdgeSubductionReplicator reconnect handshake', () => {
  beforeAll(async () => {
    await initSubduction();
  });

  test(
    'every fresh EdgeSubductionReplicatorConnection re-handshakes from byte 0',
    { timeout: 30_000 },
    async () => {
      const spaceId = SpaceId.random();
      const subductionServiceId = compositeKey(EdgeService.SUBDUCTION_REPLICATOR, spaceId);

      // Real Subduction on the client. Each fresh EdgeSubductionReplicatorConnection
      // gets a new `_remotePeerId` (`${serviceId}-${randomUUID}`) so Subduction's
      // per-peer state machine should treat it as a brand new peer and re-handshake.
      const clientSigner = MemorySigner.generate();
      const clientSubduction = new Subduction(clientSigner, new MemoryStorage(), 'svc');

      // Real Subduction on the server. One instance, multiple sessions keyed by
      // `connectionId` — mirrors the edge DO's per-`ClientSession` shape.
      const serverSigner = MemorySigner.generate();
      const serverSubduction = new Subduction(serverSigner, new MemoryStorage(), 'svc');

      // Outbound frames the client wrote, in order. Each entry is the first byte
      // payload (handshake-or-not check) of the corresponding `subductionFrame.data`,
      // tagged by the envelope's `connectionId`.
      const outbound: Array<{ connectionId: string; magic: 'SUH' | 'SUM' | 'OTHER' }> = [];

      const port = await getRandomPort();
      const server = await createTestEdgeWsServer(port, {
        payloadDecoder: (bytes) => cbor.decode(bytes),
        messageHandler: async (envelope: any) => {
          if (envelope?.type === MESSAGE_TYPE_SUBDUCTION_FRAME) {
            const env = envelope as SubductionFrameEnvelope;
            await routeInboundToServerSubduction(env);
          }
          // No synchronous response — server-side replies go via `server.sendMessage`.
          return undefined;
        },
      });
      onTestFinished(server.cleanup);

      const client = new EdgeClient(await createEphemeralEdgeIdentity(), {
        socketEndpoint: server.endpoint,
      });
      await openAndClose(client);

      // ── Server: lazy per-`connectionId` `acceptTransport` ─────────────────
      type ServerSession = { transport: WsBridgedTransport; acceptPromise: Promise<unknown> };
      const serverSessions = new Map<string, ServerSession>();
      const serverPeerId = `subduction-replicator:${spaceId}` as PeerId;
      const clientRepoPeerId = (connectionId: string) =>
        `${serverPeerId}-${connectionId}` as PeerId;

      const routeInboundToServerSubduction = async (env: SubductionFrameEnvelope): Promise<void> => {
        // Spy: record the first 4 bytes the client just sent on this connectionId.
        const data = env.subductionFrame.data;
        const magic = classifyMagic(data);
        outbound.push({ connectionId: env.connectionId, magic });

        let session = serverSessions.get(env.connectionId);
        if (!session) {
          const transport = new WsBridgedTransport({
            label: `server[${env.connectionId.slice(0, 8)}]`,
            sendBytes: async (bytes) => {
              // Wrap each outbound chunk in the same envelope shape, addressed back to
              // the client; the EdgeSubductionReplicatorConnection demuxes by
              // `connectionId` on receive.
              await server.sendMessage(
                createBuf(MessageSchema, {
                  target: [{ identityKey: client.identityKey, peerKey: client.peerKey }],
                  serviceId: subductionServiceId,
                  payload: {
                    value: cbor.encode({
                      type: MESSAGE_TYPE_SUBDUCTION_FRAME,
                      connectionId: env.connectionId,
                      subductionFrame: {
                        type: MESSAGE_TYPE_SUBDUCTION_CONNECTION,
                        senderId: serverPeerId,
                        targetId: clientRepoPeerId(env.connectionId),
                        data: new Uint8Array(bytes),
                      } satisfies SubductionConnectionMessage,
                    } satisfies SubductionFrameEnvelope),
                  },
                }),
              );
            },
          });
          const acceptPromise = serverSubduction
            .acceptTransport(transport, 'svc')
            .then((peerId) => {
              log.info('[test] server acceptTransport resolved', {
                connectionId: env.connectionId,
                peerId: String(peerId),
              });
            })
            .catch((err) => {
              log.info('[test] server acceptTransport rejected', {
                connectionId: env.connectionId,
                err: err instanceof Error ? err.message : String(err),
              });
            });
          session = { transport, acceptPromise };
          serverSessions.set(env.connectionId, session);
        }
        session.transport.pushBytes(env.subductionFrame.data);
      };

      // ── Client: mock context wires each connection to clientSubduction ───
      type ClientSession = {
        transport: WsBridgedTransport;
        connectionId: string;
        connectPromise: Promise<unknown>;
      };
      const clientSessions: ClientSession[] = [];
      // Eager-collect open events so we don't race the listener against the emit.
      const openedConnections: Array<{ connectionId: string; t: number }> = [];
      const closedConnections: Array<{ connectionId: string; t: number }> = [];

      const extractConnectionId = (peerId: string): string => {
        // `subduction-replicator:${spaceId}-${uuid}` — the UUID is the last 5 dash-
        // delimited segments, the spaceId has no dashes so we can split safely.
        const parts = peerId.split('-');
        return parts.slice(-5).join('-');
      };

      const context: AutomergeReplicatorContext = {
        getContainingSpaceIdForDocument: async () => null,
        getContainingSpaceForDocument: async () => null,
        isDocumentInRemoteCollection: async () => false,
        onConnectionAuthScopeChanged: () => {},
        onConnectionClosed: (connection) => {
          const connectionId = extractConnectionId(connection.peerId);
          closedConnections.push({ connectionId, t: Date.now() });
          log.info('[test] mock onConnectionClosed', { connectionId });
          const session = clientSessions.find((s) => s.connectionId === connectionId);
          if (session) {
            void session.transport.disconnect();
          }
        },
        onConnectionOpen: (connection: AutomergeReplicatorConnection) => {
          const connectionId = extractConnectionId(connection.peerId);
          openedConnections.push({ connectionId, t: Date.now() });
          log.info('[test] mock onConnectionOpen', { connectionId });

          const transport = new WsBridgedTransport({
            label: `client[${connectionId.slice(0, 8)}]`,
            sendBytes: async (bytes) => {
              const message: SubductionConnectionMessage = {
                type: MESSAGE_TYPE_SUBDUCTION_CONNECTION,
                senderId: clientRepoPeerId(connectionId), // self-id; replicator overwrites targetId
                targetId: '' as PeerId, // overwritten by `EdgeSubductionReplicatorConnection._sendMessage`
                data: new Uint8Array(bytes),
              };
              const writer = connection.writable.getWriter();
              try {
                await writer.write(message);
              } finally {
                writer.releaseLock();
              }
            },
          });

          // Pump inbound from the connection's readable stream into the transport.
          const reader = connection.readable.getReader();
          void (async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) {
                  break;
                }
                if (value.type === MESSAGE_TYPE_SUBDUCTION_CONNECTION) {
                  transport.pushBytes(value.data);
                }
                // Collection-query/state and reconnect frames are not part of
                // the subduction byte stream — ignore here.
              }
            } catch {
              /* reader cancelled on disconnect */
            }
          })();

          const connectPromise = clientSubduction
            .connectTransport(transport, 'svc')
            .then((peerId) => {
              log.info('[test] client connectTransport resolved', {
                connectionId,
                peerId: String(peerId),
              });
            })
            .catch((err) => {
              log.info('[test] client connectTransport rejected', {
                connectionId,
                err: err instanceof Error ? err.message : String(err),
              });
            });

          clientSessions.push({ transport, connectionId, connectPromise });
        },
        peerId: PublicKey.random().toHex(),
      };

      const replicator = new EchoEdgeSubductionReplicator({
        edgeConnection: client,
        edgeHttpClient: {} as EdgeHttpClient,
      });
      await replicator.connect(Context.default(), context);
      onTestFinished(() => replicator.disconnect());

      // ── Drive: open first connection, wait for handshake to complete ─────
      await replicator.connectToSpace(Context.default(), spaceId);
      await waitFor(() => openedConnections.length >= 1, 5_000, 'first connection opened');
      const firstConnectionId = openedConnections[0].connectionId;
      log.info('[test] first connection opened', { connectionId: firstConnectionId });

      // Wait for the SUH frame on the first connection to be observed server-side.
      await waitFor(
        () => outbound.find((f) => f.connectionId === firstConnectionId) !== undefined,
        5_000,
        'first outbound subduction frame',
      );

      // Sanity: the first frame on the first connection MUST be a SUH handshake.
      const firstFrame = outbound.find((f) => f.connectionId === firstConnectionId)!;
      expect(firstFrame.magic, 'first byte payload of first connection should be a SUH handshake').toBe(
        'SUH',
      );

      // Let the handshake settle so `Subduction` has live peer state to (potentially) carry over.
      await Promise.race([
        clientSessions[0].connectPromise,
        new Promise((r) => setTimeout(r, 2_000)),
      ]);
      log.info('[test] first handshake settled, sending subduction-reconnect');

      // ── Trigger reconnect via `subduction-reconnect` ─────────────────────
      const reconnectMessage = createBuf(MessageSchema, {
        target: [{ identityKey: client.identityKey, peerKey: client.peerKey } satisfies Peer],
        serviceId: subductionServiceId,
        payload: {
          value: cbor.encode({ type: MESSAGE_TYPE_SUBDUCTION_RECONNECT }),
        },
      });
      await server.sendMessage(reconnectMessage);

      // Wait for either: the new connection to open, OR a 10s budget. If it never opens we'll dump
      // observed state to help diagnose the client-side restart-not-firing case.
      try {
        await waitFor(
          () => openedConnections.some((o) => o.connectionId !== firstConnectionId),
          10_000,
          'second connection opened after subduction-reconnect',
        );
      } catch (err) {
        log.info('[test] DIAGNOSTIC: second connection never opened', {
          openedConnections,
          closedConnections,
          outbound: outbound.map((f) => ({ connectionId: f.connectionId.slice(0, 8), magic: f.magic })),
        });
        throw err;
      }
      const secondConnectionId = openedConnections.find((o) => o.connectionId !== firstConnectionId)!
        .connectionId;
      log.info('[test] second connection opened', { connectionId: secondConnectionId });

      await waitFor(
        () => outbound.find((f) => f.connectionId === secondConnectionId) !== undefined,
        5_000,
        'first outbound subduction frame on reconnected connection',
      );

      const secondFrame = outbound.find((f) => f.connectionId === secondConnectionId)!;

      // ── Assertions ───────────────────────────────────────────────────────
      // This is the hypothesis: a fresh transport MUST re-handshake from byte 0.
      // If `secondFrame.magic === 'SUM'` (or anything non-'SUH'), the client's
      // `Subduction` is reusing protocol state across transport restart and the
      // edge has no chance to recognise the new connectionId.
      expect(
        secondFrame.magic,
        `first byte payload on the reconnected connection (${secondConnectionId.slice(0, 8)}…) — ` +
          `'SUH' confirms Subduction re-handshakes per-transport; 'SUM' confirms H1 (state carryover).`,
      ).toBe('SUH');
    },
  );
});

/**
 * Async-queue-backed `Transport` adapter. The owner of this transport feeds
 * inbound bytes via {@link pushBytes} and provides an outbound `sendBytes`
 * callback; Subduction reads via `recvBytes` and writes via `sendBytes`.
 */
class WsBridgedTransport implements Transport {
  private readonly _label: string;
  private readonly _sendBytes: (bytes: Uint8Array) => Promise<void>;
  private readonly _pending: Uint8Array[] = [];
  private _waitingResolver: ((bytes: Uint8Array) => void) | undefined;
  private _disconnectCallbacks: (() => void)[] = [];
  private _disconnected = false;

  constructor(params: { label: string; sendBytes: (bytes: Uint8Array) => Promise<void> }) {
    this._label = params.label;
    this._sendBytes = params.sendBytes;
  }

  async sendBytes(bytes: Uint8Array): Promise<void> {
    if (this._disconnected) {
      return;
    }
    await this._sendBytes(bytes);
  }

  recvBytes(): Promise<Uint8Array> {
    if (this._disconnected) {
      return Promise.resolve(new Uint8Array(0));
    }
    const next = this._pending.shift();
    if (next) {
      return Promise.resolve(next);
    }
    return new Promise<Uint8Array>((resolve) => {
      this._waitingResolver = resolve;
    });
  }

  async disconnect(): Promise<void> {
    this._disconnected = true;
    for (const cb of this._disconnectCallbacks) {
      cb();
    }
    this._disconnectCallbacks.length = 0;
    this._pending.length = 0;
    if (this._waitingResolver) {
      const resolver = this._waitingResolver;
      this._waitingResolver = undefined;
      resolver(new Uint8Array(0));
    }
  }

  onDisconnect(callback: () => void): void {
    this._disconnectCallbacks.push(callback);
  }

  pushBytes(bytes: Uint8Array): void {
    if (this._disconnected) {
      return;
    }
    if (this._waitingResolver) {
      const resolver = this._waitingResolver;
      this._waitingResolver = undefined;
      resolver(bytes);
    } else {
      this._pending.push(bytes);
    }
  }
}

const startsWith = (bytes: Uint8Array, prefix: Uint8Array): boolean => {
  if (bytes.length < prefix.length) {
    return false;
  }
  for (let i = 0; i < prefix.length; i++) {
    if (bytes[i] !== prefix[i]) {
      return false;
    }
  }
  return true;
};

const classifyMagic = (bytes: Uint8Array): 'SUH' | 'SUM' | 'OTHER' => {
  if (startsWith(bytes, SUBDUCTION_HANDSHAKE_MAGIC)) return 'SUH';
  if (startsWith(bytes, SUBDUCTION_SYNC_MAGIC)) return 'SUM';
  return 'OTHER';
};

const waitFor = async (
  predicate: () => boolean,
  timeoutMs: number,
  description: string,
): Promise<void> => {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timed out waiting for: ${description}`);
    }
    await new Promise((r) => setTimeout(r, 25));
  }
};
