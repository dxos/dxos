//
// Copyright 2024 DXOS.org
//

import * as Automerge from '@automerge/automerge';
import { type DocumentId, type Heads, cbor } from '@automerge/automerge-repo';

import { Mutex, scheduleMicroTask, scheduleTask } from '@dxos/async';
import { Context, Resource } from '@dxos/context';
import { randomUUID } from '@dxos/crypto';
import type { CollectionId } from '@dxos/echo-protocol';
import { type EdgeConnection, type EdgeHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import type { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import {
  type AutomergeProtocolMessage,
  DocumentCodec,
  EdgeService,
  type ErrorProtocolMessage,
  type ExportBundleRequest,
  type ImportBundleRequest,
  type PeerId,
} from '@dxos/protocols';
import { buf } from '@dxos/protocols/buf';
import {
  type Message as RouterMessage,
  MessageSchema as RouterMessageSchema,
} from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { bufferToArray, setDeep } from '@dxos/util';

import {
  type EchoReplicator,
  type EchoReplicatorContext,
  type ReplicatorConnection,
  type ShouldAdvertiseParams,
  type ShouldSyncCollectionParams,
  getSpaceIdFromCollectionId,
} from '../automerge';

import { InflightRequestLimiter } from './inflight-request-limiter';

/**
 * Delay before restarting the connection after receiving a forbidden error.
 */
const INITIAL_RESTART_DELAY = 500;
const RESTART_DELAY_JITTER = 250;
const MAX_RESTART_DELAY = 5000;

export type EchoEdgeReplicatorParams = {
  edgeConnection: EdgeConnection;
  edgeHttpClient: EdgeHttpClient;
  disableSharePolicy?: boolean;
};

export class EchoEdgeReplicator implements EchoReplicator {
  private readonly _edgeConnection: EdgeConnection;
  private readonly _edgeHttpClient: EdgeHttpClient;
  private readonly _mutex = new Mutex();

  private _ctx?: Context = undefined;
  private _context: EchoReplicatorContext | null = null;
  private _connectedSpaces = new Set<SpaceId>();
  private _connections = new Map<SpaceId, EdgeReplicatorConnection>();
  private _sharePolicyEnabled = true;

  constructor({ edgeConnection, edgeHttpClient, disableSharePolicy }: EchoEdgeReplicatorParams) {
    this._edgeConnection = edgeConnection;
    this._edgeHttpClient = edgeHttpClient;
    this._sharePolicyEnabled = !disableSharePolicy;
  }

  async connect(context: EchoReplicatorContext): Promise<void> {
    log('connecting...', { peerId: context.peerId, connectedSpaces: this._connectedSpaces.size });
    this._context = context;
    this._ctx = Context.default();
    this._ctx.onDispose(
      this._edgeConnection.onReconnected(() => {
        this._ctx && scheduleMicroTask(this._ctx, () => this._handleReconnect());
      }),
    );
  }

  private async _handleReconnect(): Promise<void> {
    using _guard = await this._mutex.acquire();

    const spaces = [...this._connectedSpaces];
    for (const connection of this._connections.values()) {
      await connection.close();
    }
    this._connections.clear();

    if (this._context !== null) {
      for (const spaceId of spaces) {
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

  async connectToSpace(spaceId: SpaceId): Promise<void> {
    log.info('connectToSpace', { spaceId });
    using _guard = await this._mutex.acquire();

    if (this._connectedSpaces.has(spaceId)) {
      return;
    }
    this._connectedSpaces.add(spaceId);

    // Check if AM-repo requested that we connect to remote peers.
    if (this._context !== null) {
      await this._openConnection(spaceId);
    }
  }

  async disconnectFromSpace(spaceId: SpaceId): Promise<void> {
    using _guard = await this._mutex.acquire();

    this._connectedSpaces.delete(spaceId);

    const connection = this._connections.get(spaceId);
    if (connection) {
      await connection.close();
      this._connections.delete(spaceId);
    }
  }

  private async _openConnection(spaceId: SpaceId, reconnects: number = 0): Promise<void> {
    invariant(this._context);
    invariant(!this._connections.has(spaceId));

    let restartScheduled = false;

    const connection = new EdgeReplicatorConnection({
      edgeHttpClient: this._edgeHttpClient,
      edgeConnection: this._edgeConnection,
      spaceId,
      context: this._context,
      sharedPolicyEnabled: this._sharePolicyEnabled,
      onRemoteConnected: async () => {
        log.trace('dxos.echo.edge.replicator.onRemoteConnected', { spaceId });
        this._context?.onConnectionOpen(connection);
      },
      onRemoteDisconnected: async () => {
        log.trace('dxos.echo.edge.replicator.onRemoteDisconnected', { spaceId });
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
          this._ctx,
          async () => {
            using _guard = await this._mutex.acquire();
            if (this._connections.get(spaceId) !== connection) {
              return;
            }

            const ctx = this._ctx;
            await connection.close(); // Will call onRemoteDisconnected
            this._connections.delete(spaceId);
            if (ctx?.disposed) {
              return;
            }
            log.trace('dxos.echo.edge.replicator.restart', { spaceId, reconnects, restartDelay });
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

type EdgeReplicatorConnectionsParams = {
  edgeConnection: EdgeConnection;
  edgeHttpClient: EdgeHttpClient;
  spaceId: SpaceId;
  context: EchoReplicatorContext;
  sharedPolicyEnabled: boolean;
  onRemoteConnected: () => Promise<void>;
  onRemoteDisconnected: () => Promise<void>;
  onRestartRequested: () => Promise<void>;
};

const MAX_INFLIGHT_REQUESTS = 5;
const MAX_RATE_LIMIT_WAIT_TIME_MS = 3000;

class EdgeReplicatorConnection extends Resource implements ReplicatorConnection {
  private readonly _connectionId = randomUUID();
  private readonly _edgeConnection: EdgeConnection;
  private readonly _edgeHttpClient: EdgeHttpClient;
  private readonly _remotePeerId: string | null = null;
  private readonly _targetServiceId: string;
  private readonly _spaceId: SpaceId;
  private readonly _context: EchoReplicatorContext;
  private readonly _sharedPolicyEnabled: boolean;
  private readonly _onRemoteConnected: () => Promise<void>;
  private readonly _onRemoteDisconnected: () => Promise<void>;
  private readonly _onRestartRequested: () => void;
  private _sequence = 0;

  private _requestLimiter = new InflightRequestLimiter({
    maxInflightRequests: MAX_INFLIGHT_REQUESTS,
    resetBalanceTimeoutMs: MAX_RATE_LIMIT_WAIT_TIME_MS,
  });

  private _readableStreamController!: ReadableStreamDefaultController<AutomergeProtocolMessage>;

  public readable: ReadableStream<AutomergeProtocolMessage>;
  public writable: WritableStream<AutomergeProtocolMessage>;

  constructor({
    edgeConnection,
    edgeHttpClient,
    spaceId,
    context,
    sharedPolicyEnabled,
    onRemoteConnected,
    onRemoteDisconnected,
    onRestartRequested,
  }: EdgeReplicatorConnectionsParams) {
    super();
    this._edgeConnection = edgeConnection;
    this._edgeHttpClient = edgeHttpClient;
    this._spaceId = spaceId;
    this._context = context;
    // Generate a unique peer id for every connection.
    // This way automerge-repo will have separate sync states for every connection.
    // This is important because the previous connection might have had some messages that failed to deliver
    // abd if we don't clear the sync-state, automerge will not attempt to deliver them again.
    this._remotePeerId = `${EdgeService.AUTOMERGE_REPLICATOR}:${spaceId}-${this._connectionId}`;
    this._targetServiceId = `${EdgeService.AUTOMERGE_REPLICATOR}:${spaceId}`;
    this._sharedPolicyEnabled = sharedPolicyEnabled;
    this._onRemoteConnected = onRemoteConnected;
    this._onRemoteDisconnected = onRemoteDisconnected;
    this._onRestartRequested = onRestartRequested;

    this.readable = new ReadableStream<AutomergeProtocolMessage>({
      start: (controller) => {
        this._readableStreamController = controller;
      },
    });

    this.writable = new WritableStream<AutomergeProtocolMessage>({
      write: async (message: AutomergeProtocolMessage, controller) => {
        await this._requestLimiter.rateLimit(message);

        await this._sendMessage(message);
      },
    });
  }

  protected override async _open(ctx: Context): Promise<void> {
    log('opening...');

    await this._requestLimiter.open();

    this._ctx.onDispose(
      this._edgeConnection.onMessage((msg: RouterMessage) => {
        this._onMessage(msg);
      }),
    );

    let firstReconnect = true;
    this._ctx.onDispose(
      // NOTE: This will fire immediately if the connection is already open.
      this._edgeConnection.onReconnected(async () => {
        if (firstReconnect) {
          log.verbose('first reconnect skipped');
          firstReconnect = false;
          return;
        }

        this._onRestartRequested();
      }),
    );

    await this._onRemoteConnected();
  }

  protected override async _close(): Promise<void> {
    log('closing...');
    this._readableStreamController.close();

    await this._requestLimiter.close();

    await this._onRemoteDisconnected();
  }

  get peerId(): string {
    invariant(this._remotePeerId, 'Not connected');
    return this._remotePeerId;
  }

  async shouldAdvertise(params: ShouldAdvertiseParams): Promise<boolean> {
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
      // Simply returning true will add edge to "generous peers list" for this document which will
      // start replication of the document after we receive it potentially pushing it to replicator of the wrong space.
      return remoteDocumentExists;
    }
    return spaceId === this._spaceId;
  }

  shouldSyncCollection(params: ShouldSyncCollectionParams): boolean {
    if (!this._sharedPolicyEnabled) {
      return true;
    }
    const spaceId = getSpaceIdFromCollectionId(params.collectionId as CollectionId);
    // Only sync collections of form space:id:rootDoc, edge ignores legacy space:id collections
    return spaceId === this._spaceId && params.collectionId.split(':').length === 3;
  }

  private _onMessage(message: RouterMessage): void {
    if (message.serviceId !== this._targetServiceId) {
      return;
    }

    const payload = cbor.decode(message.payload!.value) as AutomergeProtocolMessage;
    log.verbose('received', {
      ...getMessageInfo(payload),
      remoteId: this._remotePeerId,
    });

    // Fix the peer id.
    payload.senderId = this._remotePeerId! as PeerId;
    this._processMessage(payload);
  }

  get bundleSyncEnabled(): boolean {
    return true;
  }

  async pushBundle(bundle: { documentId: DocumentId; data: Uint8Array; heads: Heads }[]) {
    const request: ImportBundleRequest = {
      bundle: bundle.map(({ documentId, data, heads }) => ({
        documentId,
        mutation: DocumentCodec.encode(data),
        heads,
      })),
    };
    await this._edgeHttpClient.importBundle(this._spaceId, request);
  }

  async pullBundle(docHeads: Record<DocumentId, Heads>): Promise<Record<DocumentId, Uint8Array>> {
    const request: ExportBundleRequest = { docHeads };
    const response = await this._edgeHttpClient.exportBundle(this._spaceId, request);
    return Object.fromEntries(response.bundle.map((doc) => [doc.documentId, DocumentCodec.decode(doc.mutation)]));
  }

  private _processMessage(message: AutomergeProtocolMessage): void {
    // There's a race between the credentials being replicated that are needed for access control and the data replication.
    // AutomergeReplicator might return a Forbidden error if the credentials are not yet replicated.
    // We restart the connection with some delay to account for that.
    if (isErrorMessage(message)) {
      log.verbose('stream error', { error: (message as ErrorProtocolMessage).message });
      this._onRestartRequested();
      return;
    }

    this._requestLimiter.handleResponse(message);

    this._readableStreamController.enqueue(message);
  }

  private async _sendMessage(message: AutomergeProtocolMessage): Promise<void> {
    // Fix the peer id.
    (message as any).targetId = this._targetServiceId as PeerId;

    // Note: This is used on EDGE to detect out-of-order messages per connection.
    setDeep(message, ['metadata', 'dxos_sequence'], this._getSequence());
    setDeep(message, ['metadata', 'dxos_connectionId'], this._connectionId);

    log.verbose('sending...', {
      ...getMessageInfo(message),
      remoteId: this._remotePeerId,
    });

    const encoded = cbor.encode(message);

    try {
      await this._edgeConnection.send(
        buf.create(RouterMessageSchema, {
          serviceId: this._targetServiceId,
          source: {
            identityKey: this._edgeConnection.identityKey,
            peerKey: this._edgeConnection.peerKey,
          },
          payload: { value: bufferToArray(encoded) },
        }),
      );
    } catch (err) {
      log.error('failed to send message', { err });
    }
  }

  private _getSequence(): number {
    return this._sequence++;
  }
}

/**
 * This message is sent by EDGE AutomergeReplicator when the authorization is denied.
 */
const isErrorMessage = (message: AutomergeProtocolMessage) => message.type === 'error';

const getMessageInfo = (msg: AutomergeProtocolMessage) => {
  const { have, heads, need, changes } = msg.type === 'sync' ? Automerge.decodeSyncMessage(msg.data) : {};
  return {
    type: msg.type,
    documentId: 'documentId' in msg ? msg.documentId : undefined,
    collectionId: 'collectionId' in msg ? msg.collectionId : undefined,
    have,
    heads,
    need,
    changes: changes?.length,
    sequence: msg.metadata?.dxos_sequence,
  };
};
