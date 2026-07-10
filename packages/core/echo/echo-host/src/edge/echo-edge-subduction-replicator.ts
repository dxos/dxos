//
// Copyright 2024 DXOS.org
//

import { cbor } from '@automerge/automerge-repo';

import { Mutex, scheduleMicroTask, scheduleTask } from '@dxos/async';
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
  MESSAGE_TYPE_SUBDUCTION_BATCH,
  MESSAGE_TYPE_SUBDUCTION_CONNECTION,
  MESSAGE_TYPE_SUBDUCTION_FRAME,
  type PeerId,
  type SubductionBatchEnvelope,
  type SubductionConnectionMessage,
  type SubductionProtocolMessage,
  type SubductionProtocolMessageEnveloped,
} from '@dxos/protocols';
import { buf } from '@dxos/protocols/buf';
import {
  type Message as RouterMessage,
  MessageSchema as RouterMessageSchema,
} from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { EdgeStatus } from '@dxos/protocols/proto/dxos/client/services';
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

/**
 * Outbound frame batching bounds (see `frame-batching-spec.md`). Subduction transport frames are
 * coalesced into one {@link SubductionBatchEnvelope}, flushed on whichever bound trips first:
 * {@link SUBDUCTION_BATCH_MAX_FRAMES} frames, {@link SUBDUCTION_BATCH_MAX_BYTES} accumulated, or
 * {@link SUBDUCTION_BATCH_MAX_DELAY_MS} elapsed. The byte cap is a hard safety bound well under
 * the 1 MB Cloudflare WebSocket message limit; count and delay tune coalescing vs latency.
 */
const SUBDUCTION_BATCH_MAX_FRAMES = 32;
const SUBDUCTION_BATCH_MAX_BYTES = 256 * 1024;
const SUBDUCTION_BATCH_MAX_DELAY_MS = 20;

export type EchoEdgeSubductionReplicatorProps = {
  edgeConnection: EdgeConnection;
  edgeHttpClient: EdgeHttpClient;
  disableSharePolicy?: boolean;
  /**
   * Coalesce outbound subduction transport frames into batches (default enabled). Both peers
   * accept single and batched frames; a mixed-version fleet can flip this off until the edge is
   * deployed. See `frame-batching-spec.md`.
   */
  frameBatching?: boolean;
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
  private readonly _frameBatching: boolean;

  private _ctx?: Context = undefined;
  private _context: AutomergeReplicatorContext | null = null;
  private _connectedSpaces = new Set<SpaceId>();
  private _connections = new Map<SpaceId, EdgeSubductionReplicatorConnection>();
  /** Replaced connections whose async close is still settling; force-closed on disconnect. */
  private readonly _closingConnections = new Set<EdgeSubductionReplicatorConnection>();

  private _spaceMutex(spaceId: SpaceId): Mutex {
    let mutex = this._spaceMutexes.get(spaceId);
    if (!mutex) {
      mutex = new Mutex();
      this._spaceMutexes.set(spaceId, mutex);
    }
    return mutex;
  }

  constructor({
    edgeConnection,
    edgeHttpClient,
    disableSharePolicy,
    frameBatching,
  }: EchoEdgeSubductionReplicatorProps) {
    this._edgeConnection = edgeConnection;
    this._edgeHttpClient = edgeHttpClient;
    this._disableSharePolicy = disableSharePolicy ?? false;
    this._frameBatching = frameBatching ?? true;
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
        this._connections.delete(spaceId);
        this._closeReplacedConnection(spaceId, connection);
      }
      if (this._context !== null && this._connectedSpaces.has(spaceId)) {
        await this._openConnection(spaceId);
      }
    }
  }

  /**
   * Close a replaced connection immediately. Closing before the successor binds lets
   * `subduction_core` fail the connection's pending requests promptly (no sibling exists at
   * removal), so in-flight rounds settle and re-drive on the fresh connection within
   * milliseconds instead of riding the sync-round timeout.
   */
  private _closeReplacedConnection(spaceId: SpaceId, connection: EdgeSubductionReplicatorConnection): void {
    this._closingConnections.add(connection);
    const close = async () => {
      if (this._closingConnections.delete(connection)) {
        log('replaced connection closed', { spaceId });
        await connection.close();
      }
    };
    close().catch((err) => {
      log.warn('replaced-connection close failed', { spaceId, err });
      if (this._closingConnections.delete(connection)) {
        void connection.close();
      }
    });
  }

  async disconnect(): Promise<void> {
    using _guard = await this._mutex.acquire();
    await this._ctx?.dispose();

    for (const connection of this._connections.values()) {
      await connection.close();
    }
    this._connections.clear();
    for (const connection of this._closingConnections) {
      await connection.close();
    }
    this._closingConnections.clear();
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

    // Opening while the edge WS is down (or mid-restart, e.g. right after an identity change)
    // would handshake a connection that the reconnect handler immediately restarts. The edge
    // then supersedes that session the moment the replacement handshake arrives, and sync
    // requests racing the supersede are silently swallowed inside `subduction_core`
    // (`remove_connection` detaches the peer's muxes with no notification to the requester),
    // costing a full sync-round timeout. The space is already registered in `_connectedSpaces`,
    // so `_handleReconnect` opens this connection once the socket is actually ready.
    if (this._edgeConnection.status.state !== EdgeStatus.ConnectionState.CONNECTED) {
      log('deferring subduction connection until edge ws is ready', { spaceId });
      return;
    }

    let restartScheduled = false;

    const connection = new EdgeSubductionReplicatorConnection({
      edgeConnection: this._edgeConnection,
      spaceId,
      context: this._context,
      sharedPolicyEnabled: !this._disableSharePolicy,
      frameBatching: this._frameBatching,
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
            this._connections.delete(spaceId);
            this._closeReplacedConnection(spaceId, connection);
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
  frameBatching: boolean;
  onRemoteConnected: () => Promise<void>;
  onRemoteDisconnected: () => Promise<void>;
  onRestartRequested: () => Promise<void>;
};

class EdgeSubductionReplicatorConnection extends Resource implements AutomergeReplicatorConnection {
  private readonly _connectionId = randomUUID();

  /** Timestamp of the last inbound frame consumed by this connection. Diagnostic only. */
  lastInboundAt = Date.now();
  private readonly _edgeConnection: EdgeConnection;
  private readonly _remotePeerId: string;
  private readonly _subductionServiceId: string;
  private readonly _spaceId: SpaceId;
  private readonly _context: AutomergeReplicatorContext;
  private readonly _sharedPolicyEnabled: boolean;
  private readonly _onRemoteConnected: () => Promise<void>;
  private readonly _onRemoteDisconnected: () => Promise<void>;
  private readonly _onRestartRequested: () => void;
  private readonly _frameBatching: boolean;

  // Outbound batching state. `#pending` holds encoded-size-tracked inner frames awaiting a
  // flush; `#firstFrameSent` forces the handshake (first frame) to go single so session
  // establishment is version-independent; `#inFlightFlush` bounds buffering to one flush at a
  // time so a slow socket cannot grow the buffer without applying write backpressure.
  #pendingFrames: SubductionConnectionMessage[] = [];
  #pendingBytes = 0;
  #flushTimer?: ReturnType<typeof setTimeout>;
  #firstFrameSent = false;
  #inFlightFlush?: Promise<void>;

  private _readableStreamController!: ReadableStreamDefaultController<SubductionProtocolMessage>;

  public readable: ReadableStream<SubductionProtocolMessage>;
  public writable: WritableStream<SubductionProtocolMessage>;

  constructor({
    edgeConnection,
    spaceId,
    context,
    sharedPolicyEnabled,
    frameBatching,
    onRemoteConnected,
    onRemoteDisconnected,
    onRestartRequested,
  }: EdgeSubductionReplicatorConnectionProps) {
    super();
    this._edgeConnection = edgeConnection;
    this._spaceId = spaceId;
    this._context = context;
    this._sharedPolicyEnabled = sharedPolicyEnabled;
    this._frameBatching = frameBatching;
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

    await this._onRemoteConnected();
  }

  protected override async _close(ctx: Context): Promise<void> {
    log('closing...');
    // Flush buffered frames before teardown so nothing is lost on a close mid-batch.
    await this.#flushPendingFrames();
    this._readableStreamController.close();
    await this._onRemoteDisconnected();
  }

  get peerId(): string {
    return this._remotePeerId;
  }

  get bundleSyncEnabled(): boolean {
    return false;
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
        this.lastInboundAt = Date.now();
        // Fix the peer id so subduction routing inside the Repo accepts the frame.
        inner.senderId = this._remotePeerId as PeerId;
        this._readableStreamController.enqueue(inner);
        return;
      }
      case MESSAGE_TYPE_SUBDUCTION_BATCH: {
        // Batched counterpart of MESSAGE_TYPE_SUBDUCTION_FRAME: same connectionId gate, then
        // enqueue every inner frame in array order so the subduction byte stream stays FIFO.
        if (payload.connectionId !== this._connectionId) {
          log.verbose('dropping subduction-batch for different connection', {
            expected: this._connectionId,
            got: payload.connectionId,
          });
          return;
        }
        if (!Array.isArray(payload.frames)) {
          log.warn('dropping subduction-batch with missing frames', { payload });
          return;
        }
        this.lastInboundAt = Date.now();
        log.verbose('received subduction batch', { frames: payload.frames.length, remoteId: this._remotePeerId });
        for (const inner of payload.frames) {
          if (inner === null || typeof inner !== 'object') {
            continue;
          }
          inner.senderId = this._remotePeerId as PeerId;
          this._readableStreamController.enqueue(inner);
        }
        return;
      }
      case MESSAGE_TYPE_COLLECTION_STATE: {
        // The state shape is implementation-defined and arrives from remote CBOR; every level must
        // be validated so a malformed frame degrades the diagnostic instead of throwing mid-dispatch.
        const state = payload.state;
        const documents =
          state !== null && typeof state === 'object' && 'documents' in state ? state.documents : undefined;
        const documentCount =
          documents !== null && typeof documents === 'object' ? Object.keys(documents).length : undefined;
        log.verbose('received collection-state', {
          collectionId: payload.collectionId,
          documentCount,
          remoteId: this._remotePeerId,
        });
        payload.senderId = this._remotePeerId as PeerId;
        this._readableStreamController.enqueue(payload);
        return;
      }
      case MESSAGE_TYPE_COLLECTION_QUERY:
        // Invariant (not expressed in the protocol union): collection state flows edge → client
        // only; the edge never queries the client's collection state. An inbound query means a
        // protocol violation or a misbehaving peer, so surface it loudly instead of answering.
        throw new Error(
          `collection-query from edge is not supported (collectionId: ${payload.collectionId}, remoteId: ${this._remotePeerId})`,
        );
      default: {
        const _exhaustive: never = payload;
        log.warn('unknown subduction protocol message', { payload: _exhaustive });
      }
    }
  }

  private async _sendMessage(ctx: Context, message: SubductionProtocolMessage): Promise<void> {
    switch (message.type) {
      case MESSAGE_TYPE_SUBDUCTION_CONNECTION: {
        message.targetId = this._subductionServiceId as PeerId;
        if (!this._frameBatching) {
          await this.#sendEnveloped({
            type: MESSAGE_TYPE_SUBDUCTION_FRAME,
            connectionId: this._connectionId,
            subductionFrame: message,
          });
          return;
        }
        // The first frame of a connection (the handshake) is sent alone so the edge can
        // establish the session before any batched data arrives, keeping session setup
        // independent of whether the peer understands batches.
        if (!this.#firstFrameSent) {
          this.#firstFrameSent = true;
          await this.#sendEnveloped({
            type: MESSAGE_TYPE_SUBDUCTION_FRAME,
            connectionId: this._connectionId,
            subductionFrame: message,
          });
          return;
        }
        this.#enqueueFrame(message);
        // If a flush is already in flight and another full batch is queued behind it, apply
        // write backpressure so a slow socket cannot grow the buffer without bound.
        if (this.#inFlightFlush && this.#pendingFrames.length >= SUBDUCTION_BATCH_MAX_FRAMES) {
          await this.#inFlightFlush;
        }
        return;
      }
      case MESSAGE_TYPE_COLLECTION_QUERY:
      case MESSAGE_TYPE_COLLECTION_STATE:
        message.targetId = this._subductionServiceId as PeerId;
        // Preserve send order: any buffered transport frames must reach the edge before this
        // control-plane message.
        await this.#flushPendingFrames();
        await this.#sendEnveloped(message);
        return;
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
  }

  /** Buffer an inner frame for the next batch flush, arming the delay timer / tripping bounds. */
  #enqueueFrame(frame: SubductionConnectionMessage): void {
    this.#pendingFrames.push(frame);
    this.#pendingBytes += frame.data.byteLength;
    if (this.#pendingFrames.length >= SUBDUCTION_BATCH_MAX_FRAMES || this.#pendingBytes >= SUBDUCTION_BATCH_MAX_BYTES) {
      void this.#flushPendingFrames();
    } else if (this.#flushTimer === undefined) {
      this.#flushTimer = setTimeout(() => {
        this.#flushTimer = undefined;
        void this.#flushPendingFrames();
      }, SUBDUCTION_BATCH_MAX_DELAY_MS);
    }
  }

  /** Send all buffered frames as one batch (or a single-frame envelope for the degenerate case). */
  async #flushPendingFrames(): Promise<void> {
    if (this.#flushTimer !== undefined) {
      clearTimeout(this.#flushTimer);
      this.#flushTimer = undefined;
    }
    if (this.#pendingFrames.length === 0) {
      return;
    }
    const frames = this.#pendingFrames;
    this.#pendingFrames = [];
    this.#pendingBytes = 0;
    const wire: SubductionProtocolMessageEnveloped =
      frames.length === 1
        ? { type: MESSAGE_TYPE_SUBDUCTION_FRAME, connectionId: this._connectionId, subductionFrame: frames[0] }
        : { type: MESSAGE_TYPE_SUBDUCTION_BATCH, connectionId: this._connectionId, frames };
    const flush = this.#sendEnveloped(wire, frames.length);
    // Track a single in-flight flush; chain a follow-up if frames accumulated during this send.
    this.#inFlightFlush = flush.finally(() => {
      this.#inFlightFlush = undefined;
      if (this.#pendingFrames.length > 0) {
        void this.#flushPendingFrames();
      }
    });
    await flush;
  }

  /** Encode one wire envelope and send it as a single router message. */
  async #sendEnveloped(wire: SubductionProtocolMessageEnveloped, frameCount = 1): Promise<void> {
    if (wire.type === MESSAGE_TYPE_COLLECTION_QUERY || wire.type === MESSAGE_TYPE_COLLECTION_STATE) {
      log.verbose(`sending ${wire.type}`, {
        collectionId: wire.collectionId,
        serviceId: this._subductionServiceId,
        remoteId: this._remotePeerId,
      });
    } else {
      log.verbose('sending...', { type: wire.type, frameCount, remoteId: this._remotePeerId });
    }

    const encoded = cbor.encode(wire);
    try {
      await this._edgeConnection.send(
        this._ctx,
        buf.create(RouterMessageSchema, {
          serviceId: this._subductionServiceId,
          source: {
            identityDid: this._edgeConnection.identityDid,
            peerKey: this._edgeConnection.peerKey,
          },
          payload: { value: bufferToArray(encoded) },
        }),
      );
    } catch (err) {
      log.error('failed to send message', { err });
    }
  }
}
