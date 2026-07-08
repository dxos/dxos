//
// Copyright 2024 DXOS.org
//

import { cbor } from '@automerge/automerge-repo';

import { Mutex, scheduleMicroTask, scheduleTask, scheduleTaskInterval } from '@dxos/async';
import { Context, Resource } from '@dxos/context';
import { randomUUID } from '@dxos/crypto';
import type { CollectionId } from '@dxos/echo-protocol';
import { type EdgeConnection, type EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import type { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  EdgeService,
  MESSAGE_TYPE_COLLECTION_QUERY,
  MESSAGE_TYPE_COLLECTION_STATE,
  MESSAGE_TYPE_ERROR,
  MESSAGE_TYPE_SUBDUCTION_CONNECTION,
  MESSAGE_TYPE_SUBDUCTION_FRAME,
  type PeerId,
  type SubductionProtocolMessage,
  type SubductionProtocolMessageEnveloped,
} from '@dxos/protocols';
import { buf } from '@dxos/protocols/buf';
import {
  type Message as RouterMessage,
  MessageSchema as RouterMessageSchema,
} from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { trace } from '@dxos/tracing';
import { bufferToArray, compositeKey } from '@dxos/util';

import {
  type AutomergeReplicatorConnection,
  type AutomergeReplicatorContext,
  type EdgeAutomergeReplicator,
  type ShouldAdvertiseProps,
  type ShouldSyncCollectionProps,
  getSpaceIdFromCollectionId,
} from '../automerge';

/**
 * Delay before restarting the connection after the edge requests it.
 */
const INITIAL_RESTART_DELAY = 500;
const RESTART_DELAY_JITTER = 250;
const MAX_RESTART_DELAY = 5000;

export type EchoEdgeSubductionReplicatorProps = {
  edgeConnection: EdgeConnection;
  edgeHttpClient: EdgeHttpClient;
  disableSharePolicy?: boolean;
};

/** Cumulative message counts and peak throughput for a single subduction connection. */
export type SubductionMessageStats = {
  messagesSent: number;
  messagesReceived: number;
  /** Highest `sentPerSecond` observed across the 1-second rate samples taken so far. */
  maxSentPerSecond: number;
  /** Highest `receivedPerSecond` observed across the 1-second rate samples taken so far. */
  maxReceivedPerSecond: number;
};

/**
 * Edge replicator for the Subduction transport.
 *
 * Subduction byte tunnel over the Edge router WebSocket. Every inbound router message
 * targeting the subduction service is forwarded verbatim to the local Repo via an
 * {@link AutomergeReplicatorConnection}. Outbound repo messages are wrapped in a router
 * frame and sent to the edge.
 *
 * No classical automerge-repo sync, collection-query/state, bundle sync, or rate-limiting
 * runs through this class — Subduction's sedimentree protocol replaces those
 * responsibilities. For the classical sync path see {@link EchoEdgeReplicator}.
 */
@trace.resource()
export class EchoEdgeSubductionReplicator implements EdgeAutomergeReplicator {
  private readonly _edgeConnection: EdgeConnection;
  private readonly _edgeHttpClient: EdgeHttpClient;
  /**
   * Coordinates cross-space lifecycle (`connect`/`disconnect`/`_handleReconnect`)
   * — operations that touch the entire `_connections` map atomically. Per-space
   * operations use {@link _spaceMutex} instead, so a slow restart on space A
   * cannot serialize behind / block `connectToSpace(B)`.
   */
  private readonly _mutex = new Mutex();
  /**
   * Per-space serialization for `connectToSpace`/`disconnectFromSpace` and the
   * restart task fired from `onRestartRequested`. Restart tears down the WS
   * subscription and runs a fresh SUH handshake against the edge (seconds of
   * I/O), and under a single global mutex this blocked every other space's
   * `host.spaces.create` → `connectToSpace` call, producing O(N) create-latency
   * growth at space-creation boundaries. Per-space mutexes preserve the same-
   * space serialization invariant (`_openConnection`'s `invariant(!_connections.has)`,
   * single in-flight restart per space) without cross-space contention.
   */
  private readonly _spaceMutexes = new Map<SpaceId, Mutex>();
  private readonly _disableSharePolicy: boolean;

  private _ctx?: Context = undefined;
  private _context: AutomergeReplicatorContext | null = null;
  private _connectedSpaces = new Set<SpaceId>();
  private _connections = new Map<SpaceId, EdgeSubductionReplicatorConnection>();

  private _spaceMutex(spaceId: SpaceId): Mutex {
    let mutex = this._spaceMutexes.get(spaceId);
    if (!mutex) {
      mutex = new Mutex();
      this._spaceMutexes.set(spaceId, mutex);
    }
    return mutex;
  }

  constructor({ edgeConnection, edgeHttpClient, disableSharePolicy }: EchoEdgeSubductionReplicatorProps) {
    this._edgeConnection = edgeConnection;
    this._edgeHttpClient = edgeHttpClient;
    this._disableSharePolicy = disableSharePolicy ?? false;
  }

  async connect(ctx: Context, context: AutomergeReplicatorContext): Promise<void> {
    log('connecting...', { peerId: context.peerId, connectedSpaces: this._connectedSpaces.size });
    this._context = context;
    this._ctx = ctx.derive();
    this._ctx.onDispose(
      this._edgeConnection.onReconnected(
        () => {
          this._ctx && scheduleMicroTask(this._ctx, () => this._handleReconnect());
        },
        // Reconnect-reaction logic: reacting to the subscribe-time current-state firing would
        // tear down and reopen connections that are already on the fresh WS.
        { emitCurrentState: false },
      ),
    );
  }

  private async _handleReconnect(): Promise<void> {
    using _guard = await this._mutex.acquire();

    // Snapshot + tear down all existing connections in one pass. Per-space
    // operations no longer share `_mutex` with us, so we acquire each
    // `_spaceMutex` before touching its slot to avoid racing with a concurrent
    // `connectToSpace`/`disconnectFromSpace`/restart-task for the same space.
    const spaces = [...this._connectedSpaces];
    for (const spaceId of spaces) {
      using _spaceGuard = await this._spaceMutex(spaceId).acquire();
      const connection = this._connections.get(spaceId);
      if (connection) {
        await connection.close();
        this._connections.delete(spaceId);
      }
      if (this._context !== null && this._connectedSpaces.has(spaceId)) {
        await this._openConnection(spaceId);
      }
    }
  }

  async disconnect(): Promise<void> {
    using _guard = await this._mutex.acquire();
    await this._ctx?.dispose();

    for (const connection of this._connections.values()) {
      await connection.close();
    }
    this._connections.clear();
  }

  @trace.span({ showInBrowserTimeline: true })
  async connectToSpace(ctx: Context, spaceId: SpaceId): Promise<void> {
    log('connectToSpace', { spaceId });
    using _guard = await this._spaceMutex(spaceId).acquire();

    if (this._connectedSpaces.has(spaceId)) {
      return;
    }
    this._connectedSpaces.add(spaceId);

    if (this._context !== null) {
      await this._openConnection(spaceId);
    }
  }

  /** Message stats for a single space's connection, or `undefined` if the space is not connected. */
  getMessageStats(spaceId: SpaceId): SubductionMessageStats | undefined {
    return this._connections.get(spaceId)?.messageStats;
  }

  /** Message stats for every currently connected space. */
  getAllMessageStats(): Map<SpaceId, SubductionMessageStats> {
    return new Map([...this._connections].map(([spaceId, connection]) => [spaceId, connection.messageStats]));
  }

  async disconnectFromSpace(spaceId: SpaceId): Promise<void> {
    using _guard = await this._spaceMutex(spaceId).acquire();

    this._connectedSpaces.delete(spaceId);

    const connection = this._connections.get(spaceId);
    if (connection) {
      await connection.close();
      this._connections.delete(spaceId);
    }
    // NOTE: do not delete from `_spaceMutexes`. A concurrent `connectToSpace`
    // that arrived while we held the mutex is parked on this exact instance
    // and would otherwise race against a fresh mutex created by a later
    // caller. The map entries are bounded by the live space set, so the
    // residual cost is one Mutex per ever-connected space.
  }

  private async _openConnection(spaceId: SpaceId, reconnects: number = 0): Promise<void> {
    invariant(this._context);
    invariant(!this._connections.has(spaceId));

    let restartScheduled = false;

    const connection = new EdgeSubductionReplicatorConnection({
      edgeConnection: this._edgeConnection,
      spaceId,
      context: this._context,
      sharedPolicyEnabled: !this._disableSharePolicy,
      onRemoteConnected: async () => {
        log.trace('dxos.echo.edge.subduction-replicator.onRemoteConnected', { spaceId });
        this._context?.onConnectionOpen(connection);
      },
      onRemoteDisconnected: async () => {
        log.trace('dxos.echo.edge.subduction-replicator.onRemoteDisconnected', { spaceId });
        this._context?.onConnectionClosed(connection);
      },
      onRestartRequested: async () => {
        if (!this._ctx || restartScheduled) {
          return;
        }

        const restartDelay =
          Math.min(MAX_RESTART_DELAY, INITIAL_RESTART_DELAY * reconnects) + Math.random() * RESTART_DELAY_JITTER;

        log('connection restart scheduled', { spaceId, reconnects, restartDelay });

        restartScheduled = true;
        scheduleTask(
          this._ctx!,
          async () => {
            // Per-space mutex (not the global `_mutex`) — the restart's heavy
            // I/O (`close()` + fresh SUH handshake on `open()`) must not block
            // `connectToSpace`/`disconnectFromSpace` for other spaces, which
            // was the O(N) create-latency cliff at space-creation boundaries.
            using _guard = await this._spaceMutex(spaceId).acquire();
            if (this._connections.get(spaceId) !== connection) {
              return;
            }

            const ctx = this._ctx;
            await connection.close();
            this._connections.delete(spaceId);
            if (ctx?.disposed) {
              return;
            }
            log.trace('dxos.echo.edge.subduction-replicator.restart', { spaceId, reconnects, restartDelay });
            await this._openConnection(spaceId, reconnects + 1);
          },
          restartDelay,
        );
      },
    });
    this._connections.set(spaceId, connection);

    await connection.open();
  }
}

type EdgeSubductionReplicatorConnectionProps = {
  edgeConnection: EdgeConnection;
  spaceId: SpaceId;
  context: AutomergeReplicatorContext;
  sharedPolicyEnabled: boolean;
  onRemoteConnected: () => Promise<void>;
  onRemoteDisconnected: () => Promise<void>;
  onRestartRequested: () => Promise<void>;
};

class EdgeSubductionReplicatorConnection extends Resource implements AutomergeReplicatorConnection {
  private readonly _connectionId = randomUUID();
  private readonly _edgeConnection: EdgeConnection;
  private readonly _remotePeerId: string;
  private readonly _subductionServiceId: string;
  private readonly _spaceId: SpaceId;
  private readonly _context: AutomergeReplicatorContext;
  private readonly _sharedPolicyEnabled: boolean;
  private readonly _onRemoteConnected: () => Promise<void>;
  private readonly _onRemoteDisconnected: () => Promise<void>;
  private readonly _onRestartRequested: () => void;

  private _readableStreamController!: ReadableStreamDefaultController<SubductionProtocolMessage>;

  // Message-rate tracking, sliding window (mirrors `EdgeWsConnection`'s byte-rate tracking).
  private readonly _rateWindowMs = 10_000;
  private readonly _rateUpdateIntervalMs = 1_000;
  private _messageSamples: Array<{ timestamp: number; sent: number; received: number }> = [];
  private _messagesSent = 0;
  private _messagesReceived = 0;
  private _sentPerSecond = 0;
  private _receivedPerSecond = 0;
  /** Peak `_sentPerSecond` observed across every rate sample taken so far (see {@link _updateMessageRates}). */
  private _maxSentPerSecond = 0;
  /** Peak `_receivedPerSecond` observed across every rate sample taken so far. */
  private _maxReceivedPerSecond = 0;

  public readable: ReadableStream<SubductionProtocolMessage>;
  public writable: WritableStream<SubductionProtocolMessage>;

  constructor({
    edgeConnection,
    spaceId,
    context,
    sharedPolicyEnabled,
    onRemoteConnected,
    onRemoteDisconnected,
    onRestartRequested,
  }: EdgeSubductionReplicatorConnectionProps) {
    super();
    this._edgeConnection = edgeConnection;
    this._spaceId = spaceId;
    this._context = context;
    this._sharedPolicyEnabled = sharedPolicyEnabled;
    // Generate a unique peer id for every connection so sync-state is fresh on reconnect.
    this._subductionServiceId = compositeKey(EdgeService.SUBDUCTION_REPLICATOR, spaceId);
    this._remotePeerId = `${this._subductionServiceId}-${this._connectionId}`;
    this._onRemoteConnected = onRemoteConnected;
    this._onRemoteDisconnected = onRemoteDisconnected;
    this._onRestartRequested = onRestartRequested;

    this.readable = new ReadableStream<SubductionProtocolMessage>({
      start: (controller) => {
        this._readableStreamController = controller;
      },
    });

    this.writable = new WritableStream<SubductionProtocolMessage>({
      write: async (message: SubductionProtocolMessage) => {
        await this._sendMessage(this._ctx, message);
      },
    });
  }

  protected override async _open(ctx: Context): Promise<void> {
    log('opening...');

    this._ctx.onDispose(
      this._edgeConnection.onMessage((msg: RouterMessage) => {
        this._onMessage(msg);
      }),
    );

    this._ctx.onDispose(
      this._edgeConnection.onReconnected(
        async () => {
          // Every WS (re-)establishment after this session started runs the full restart cycle:
          // close this connection (emitting peer-disconnected for its peer id) and open a fresh
          // one under a new connectionId. `emitCurrentState: false` is essential: the default
          // subscribe-time firing would restart the connection that was just created, and each
          // restart re-subscribes — an unbounded restart loop.
          this._onRestartRequested();
        },
        { emitCurrentState: false },
      ),
    );

    scheduleTaskInterval(this._ctx, async () => this._updateMessageRates(), this._rateUpdateIntervalMs);

    await this._onRemoteConnected();
  }

  protected override async _close(ctx: Context): Promise<void> {
    log('closing...');
    this._readableStreamController.close();
    await this._onRemoteDisconnected();
  }

  get peerId(): string {
    return this._remotePeerId;
  }

  get bundleSyncEnabled(): boolean {
    return false;
  }

  get messageStats(): SubductionMessageStats {
    return {
      messagesSent: this._messagesSent,
      messagesReceived: this._messagesReceived,
      maxSentPerSecond: this._maxSentPerSecond,
      maxReceivedPerSecond: this._maxReceivedPerSecond,
    };
  }

  async shouldAdvertise(params: ShouldAdvertiseProps): Promise<boolean> {
    if (!this._sharedPolicyEnabled) {
      return true;
    }
    const spaceId = await this._context.getContainingSpaceIdForDocument(params.documentId);
    if (!spaceId) {
      const remoteDocumentExists = await this._context.isDocumentInRemoteCollection({
        documentId: params.documentId,
        peerId: this._remotePeerId as PeerId,
      });
      log.verbose('document not found locally for share policy check', {
        documentId: params.documentId,
        acceptDocument: remoteDocumentExists,
        remoteId: this._remotePeerId,
      });
      // If a document is not present locally return true only if it already exists on edge.
      return remoteDocumentExists;
    }
    return spaceId === this._spaceId;
  }

  shouldSyncCollection(params: ShouldSyncCollectionProps): boolean {
    if (!this._sharedPolicyEnabled) {
      return true;
    }
    const spaceId = getSpaceIdFromCollectionId(params.collectionId as CollectionId);
    // Only sync collections of form `space:id:rootDoc`; edge ignores legacy `space:id` collections.
    return spaceId === this._spaceId && params.collectionId.split(':').length === 3;
  }

  private _onMessage(message: RouterMessage): void {
    if (message.serviceId !== this._subductionServiceId) {
      return;
    }
    this._recordMessage({ received: 1 });

    let payload: SubductionProtocolMessageEnveloped;
    try {
      payload = cbor.decode(message.payload!.value) as SubductionProtocolMessageEnveloped;
    } catch (err) {
      log.warn('failed to decode subduction envelope', { err });
      return;
    }
    // Defensive validation: cbor.decode returns untrusted bytes. Drop malformed
    // envelopes before touching `payload.type` / `payload.subductionFrame`.
    if (payload === null || typeof payload !== 'object' || typeof (payload as { type?: unknown }).type !== 'string') {
      log.warn('dropping malformed subduction envelope', { payload });
      return;
    }

    switch (payload.type) {
      case MESSAGE_TYPE_ERROR: {
        // Edge → client restart signal for a specific connection lifetime.
        // Match the edge-supplied `connectionId` against our local
        // `_connectionId` and tear down only on an exact match; mismatches
        // (or absent ids) refer to a sibling/prior connection and must be
        // ignored.
        if (payload.connectionId === undefined) {
          log.verbose('dropping error without connectionId', { message: payload.message });
          return;
        }
        if (payload.connectionId !== this._connectionId) {
          log.verbose('dropping error for different connection', {
            expected: this._connectionId,
            got: payload.connectionId,
          });
          return;
        }
        log.info('received subduction error; restarting', { message: payload.message });
        this._onRestartRequested();
        return;
      }
      case MESSAGE_TYPE_SUBDUCTION_FRAME: {
        // The edge echoes the client-supplied connectionId. Frames carrying a
        // different id are leftovers from a previous connection lifetime
        // (rotated by `_onRestartRequested`) and must be dropped.
        if (payload.connectionId !== this._connectionId) {
          log.verbose('dropping subduction-frame for different connection', {
            expected: this._connectionId,
            got: payload.connectionId,
          });
          return;
        }
        const inner = payload.subductionFrame;
        if (inner === null || typeof inner !== 'object') {
          log.warn('dropping subduction-frame with missing inner frame', { payload });
          return;
        }
        log.verbose('received subduction frame', { remoteId: this._remotePeerId });
        // Fix the peer id so subduction routing inside the Repo accepts the frame.
        inner.senderId = this._remotePeerId as PeerId;
        this._readableStreamController.enqueue(inner);
        return;
      }
      case MESSAGE_TYPE_COLLECTION_STATE: {
        const documentCount =
          payload.state && typeof payload.state === 'object' && 'documents' in payload.state
            ? Object.keys((payload.state as { documents: Record<string, unknown> }).documents).length
            : undefined;
        log.info('received collection-state', {
          collectionId: payload.collectionId,
          documentCount,
          remoteId: this._remotePeerId,
        });
        payload.senderId = this._remotePeerId as PeerId;
        this._readableStreamController.enqueue(payload);
        return;
      }
      case MESSAGE_TYPE_COLLECTION_QUERY:
        log.info('received collection-query', { collectionId: payload.collectionId, remoteId: this._remotePeerId });
        payload.senderId = this._remotePeerId as PeerId;
        this._readableStreamController.enqueue(payload);
        return;
      default: {
        const _exhaustive: never = payload;
        log.warn('unknown subduction protocol message', { payload: _exhaustive });
      }
    }
  }

  private async _sendMessage(ctx: Context, message: SubductionProtocolMessage): Promise<void> {
    let wire: SubductionProtocolMessageEnveloped;
    switch (message.type) {
      case MESSAGE_TYPE_SUBDUCTION_CONNECTION:
        message.targetId = this._subductionServiceId as PeerId;
        wire = {
          type: MESSAGE_TYPE_SUBDUCTION_FRAME,
          connectionId: this._connectionId,
          subductionFrame: message,
        };
        break;
      case MESSAGE_TYPE_COLLECTION_QUERY:
      case MESSAGE_TYPE_COLLECTION_STATE:
        message.targetId = this._subductionServiceId as PeerId;
        wire = message;
        break;
      case MESSAGE_TYPE_ERROR:
        // Edge → client only; the client never originates an error on the subduction channel.
        log.warn('dropping unexpected error outbound', { message: message.message });
        return;
      default: {
        const _exhaustive: never = message;
        log.warn('dropping unexpected message type on subduction channel', {
          type: (_exhaustive as { type: string }).type,
        });
        return;
      }
    }

    if (wire.type === MESSAGE_TYPE_COLLECTION_QUERY || wire.type === MESSAGE_TYPE_COLLECTION_STATE) {
      log.info(`sending ${wire.type}`, {
        collectionId: wire.collectionId,
        serviceId: this._subductionServiceId,
        remoteId: this._remotePeerId,
      });
    } else {
      log.verbose('sending...', {
        type: wire.type,
        serviceId: this._subductionServiceId,
        remoteId: this._remotePeerId,
      });
    }

    const encoded = cbor.encode(wire);

    try {
      await this._edgeConnection.send(
        ctx,
        buf.create(RouterMessageSchema, {
          serviceId: this._subductionServiceId,
          source: {
            identityDid: this._edgeConnection.identityDid,
            peerKey: this._edgeConnection.peerKey,
          },
          payload: { value: bufferToArray(encoded) },
        }),
      );
      this._recordMessage({ sent: 1 });
    } catch (err) {
      log.error('failed to send message', { err });
    }
  }

  /** Accumulates raw sent/received message counts for the current 1-second bucket. */
  private _recordMessage({ sent = 0, received = 0 }: { sent?: number; received?: number }): void {
    if (sent > 0) {
      this._messagesSent += sent;
    }
    if (received > 0) {
      this._messagesReceived += received;
    }

    const now = Date.now();
    const currentBucket = Math.floor(now / 1000) * 1000;
    const existingSample = this._messageSamples.find((sample) => sample.timestamp === currentBucket);
    if (existingSample) {
      existingSample.sent += sent;
      existingSample.received += received;
    } else {
      this._messageSamples.push({ timestamp: currentBucket, sent, received });
    }
  }

  /**
   * Recomputes {@link _sentPerSecond}/{@link _receivedPerSecond} from the sliding window, folds
   * them into the running {@link _maxSentPerSecond}/{@link _maxReceivedPerSecond} peaks, and logs
   * the result.
   */
  private _updateMessageRates(): void {
    const now = Date.now();
    const windowStart = now - this._rateWindowMs;
    this._messageSamples = this._messageSamples.filter((sample) => sample.timestamp >= windowStart);

    const windowSeconds = this._rateWindowMs / 1000;
    this._sentPerSecond = this._messageSamples.reduce((total, sample) => total + sample.sent, 0) / windowSeconds;
    this._receivedPerSecond =
      this._messageSamples.reduce((total, sample) => total + sample.received, 0) / windowSeconds;
    this._maxSentPerSecond = Math.max(this._maxSentPerSecond, this._sentPerSecond);
    this._maxReceivedPerSecond = Math.max(this._maxReceivedPerSecond, this._receivedPerSecond);

    if (this._sentPerSecond > 0 || this._receivedPerSecond > 0) {
      log.info('subduction message rate', {
        spaceId: this._spaceId,
        messagesSent: this._messagesSent,
        messagesReceived: this._messagesReceived,
        sentPerSecond: this._sentPerSecond.toFixed(1),
        receivedPerSecond: this._receivedPerSecond.toFixed(1),
        maxSentPerSecond: this._maxSentPerSecond.toFixed(1),
        maxReceivedPerSecond: this._maxReceivedPerSecond.toFixed(1),
      });
    }
  }
}
