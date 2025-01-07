//
// Copyright 2024 DXOS.org
//

import { Mutex, scheduleTask, scheduleMicroTask, Trigger } from '@dxos/async';
import { cbor } from '@dxos/automerge/automerge-repo';
import { Context, Resource } from '@dxos/context';
import { randomUUID } from '@dxos/crypto';
import type { CollectionId } from '@dxos/echo-protocol';
import { type EdgeConnection } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import type { SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { EdgeService, type AutomergeProtocolMessage, type PeerId } from '@dxos/protocols';
import { buf } from '@dxos/protocols/buf';
import {
  type Message as RouterMessage,
  MessageSchema as RouterMessageSchema,
} from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { bufferToArray } from '@dxos/util';

import {
  getSpaceIdFromCollectionId,
  type EchoReplicator,
  type EchoReplicatorContext,
  type ReplicatorConnection,
  type ShouldAdvertiseParams,
  type ShouldSyncCollectionParams,
} from '../automerge';

/**
 * Delay before restarting the connection after receiving a forbidden error.
 */
const INITIAL_RESTART_DELAY = 500;
const RESTART_DELAY_JITTER = 250;
const MAX_RESTART_DELAY = 5000;

export type EchoEdgeReplicatorParams = {
  edgeConnection: EdgeConnection;
  disableSharePolicy?: boolean;
};

export class EchoEdgeReplicator implements EchoReplicator {
  private readonly _edgeConnection: EdgeConnection;
  private readonly _mutex = new Mutex();

  private _ctx?: Context = undefined;
  private _context: EchoReplicatorContext | null = null;
  private _connectedSpaces = new Set<SpaceId>();
  private _connections = new Map<SpaceId, EdgeReplicatorConnection>();
  private _sharePolicyEnabled = true;

  constructor({ edgeConnection, disableSharePolicy }: EchoEdgeReplicatorParams) {
    this._edgeConnection = edgeConnection;
    this._sharePolicyEnabled = !disableSharePolicy;
  }

  async connect(context: EchoReplicatorContext): Promise<void> {
    log.info('connect', { peerId: context.peerId, connectedSpaces: this._connectedSpaces.size });
    this._context = context;

    this._ctx = Context.default();
    this._ctx.onDispose(
      this._edgeConnection.onReconnected(() => {
        this._ctx && scheduleMicroTask(this._ctx, () => this._handleReconnect());
      }),
    );
  }

  private async _handleReconnect() {
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

  async connectToSpace(spaceId: SpaceId) {
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

  async disconnectFromSpace(spaceId: SpaceId) {
    using _guard = await this._mutex.acquire();

    this._connectedSpaces.delete(spaceId);

    const connection = this._connections.get(spaceId);
    if (connection) {
      await connection.close();
      this._connections.delete(spaceId);
    }
  }

  private async _openConnection(spaceId: SpaceId, reconnects: number = 0) {
    invariant(this._context);
    invariant(!this._connections.has(spaceId));

    let restartScheduled = false;

    const connection = new EdgeReplicatorConnection({
      edgeConnection: this._edgeConnection,
      spaceId,
      context: this._context,
      sharedPolicyEnabled: this._sharePolicyEnabled,
      onRemoteConnected: async () => {
        this._context?.onConnectionOpen(connection);
      },
      onRemoteDisconnected: async () => {
        this._context?.onConnectionClosed(connection);
      },
      onRestartRequested: async () => {
        if (!this._ctx || restartScheduled) {
          return;
        }

        const restartDelay =
          Math.min(MAX_RESTART_DELAY, INITIAL_RESTART_DELAY * reconnects) + Math.random() * RESTART_DELAY_JITTER;

        log.info('connection restart scheduled', { spaceId, reconnects, restartDelay });

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
  spaceId: SpaceId;
  context: EchoReplicatorContext;
  sharedPolicyEnabled: boolean;
  onRemoteConnected: () => Promise<void>;
  onRemoteDisconnected: () => Promise<void>;
  onRestartRequested: () => Promise<void>;
};

const MAX_INFLIGHT_REQUESTS = 5;

class EdgeReplicatorConnection extends Resource implements ReplicatorConnection {
  private readonly _edgeConnection: EdgeConnection;
  private readonly _remotePeerId: string | null = null;
  private readonly _targetServiceId: string;
  private readonly _spaceId: SpaceId;
  private readonly _context: EchoReplicatorContext;
  private readonly _sharedPolicyEnabled: boolean;
  private readonly _onRemoteConnected: () => Promise<void>;
  private readonly _onRemoteDisconnected: () => Promise<void>;
  private readonly _onRestartRequested: () => void;

  /**
   * Prevents sending too many messages to edge over this connection so that we don't overwhelm
   * a replicator durable object.
   * inflightRequests counter is incremented on outgoing sync messages and decremented on incoming messages.
   * The trigger is waiting while the counter is above MAX_INFLIGHT_REQUESTS.
   * The counter can go negative because we receive edge-initiated sync messages on doc change broadcasts.
   */
  private _outgoingRequestsBarrier = new Trigger();
  private _inflightRequests = 0;

  private _readableStreamController!: ReadableStreamDefaultController<AutomergeProtocolMessage>;

  public readable: ReadableStream<AutomergeProtocolMessage>;
  public writable: WritableStream<AutomergeProtocolMessage>;

  constructor({
    edgeConnection,
    spaceId,
    context,
    sharedPolicyEnabled,
    onRemoteConnected,
    onRemoteDisconnected,
    onRestartRequested,
  }: EdgeReplicatorConnectionsParams) {
    super();
    this._edgeConnection = edgeConnection;
    this._spaceId = spaceId;
    this._context = context;
    // Generate a unique peer id for every connection.
    // This way automerge-repo will have separate sync states for every connection.
    // This is important because the previous connection might have had some messages that failed to deliver
    // abd if we don't clear the sync-state, automerge will not attempt to deliver them again.
    this._remotePeerId = `${EdgeService.AUTOMERGE_REPLICATOR}:${spaceId}-${randomUUID()}`;
    this._targetServiceId = `${EdgeService.AUTOMERGE_REPLICATOR}:${spaceId}`;
    this._sharedPolicyEnabled = sharedPolicyEnabled;
    this._onRemoteConnected = onRemoteConnected;
    this._onRemoteDisconnected = onRemoteDisconnected;
    this._onRestartRequested = onRestartRequested;

    this._outgoingRequestsBarrier.wake();

    this.readable = new ReadableStream<AutomergeProtocolMessage>({
      start: (controller) => {
        this._readableStreamController = controller;
      },
    });

    this.writable = new WritableStream<AutomergeProtocolMessage>({
      write: async (message: AutomergeProtocolMessage, controller) => {
        await this._outgoingRequestsBarrier.wait();

        this._inflightRequests++;
        if (this._inflightRequests === MAX_INFLIGHT_REQUESTS) {
          this._outgoingRequestsBarrier.reset();
        }

        await this._sendMessage(message);
      },
    });
  }

  protected override async _open(ctx: Context): Promise<void> {
    log('open');
    // TODO: handle reconnects
    this._ctx.onDispose(
      this._edgeConnection.onMessage((msg: RouterMessage) => {
        this._onMessage(msg);
      }),
    );

    await this._onRemoteConnected();
  }

  protected override async _close(): Promise<void> {
    log('close');
    this._readableStreamController.close();

    this._outgoingRequestsBarrier.throw(new Error('Connection closed.'));

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

      log.verbose('edge-replicator document not found locally for share policy check', {
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

  private _onMessage(message: RouterMessage) {
    if (message.serviceId !== this._targetServiceId) {
      return;
    }

    const payload = cbor.decode(message.payload!.value) as AutomergeProtocolMessage;
    log.verbose('edge replicator receive', {
      type: payload.type,
      documentId: payload.type === 'sync' && payload.documentId,
      remoteId: this._remotePeerId,
    });

    // Fix the peer id.
    payload.senderId = this._remotePeerId! as PeerId;
    this._processMessage(payload);
  }

  private _processMessage(message: AutomergeProtocolMessage) {
    // There's a race between the credentials being replicated that are needed for access control and the data replication.
    // AutomergeReplicator might return a Forbidden error if the credentials are not yet replicated.
    // We restart the connection with some delay to account for that.
    if (isForbiddenErrorMessage(message)) {
      this._onRestartRequested();
      return;
    }

    if (message.type === 'sync') {
      this._inflightRequests--;
      if (this._inflightRequests === MAX_INFLIGHT_REQUESTS - 1) {
        this._outgoingRequestsBarrier.wake();
      }
    }

    this._readableStreamController.enqueue(message);
  }

  private async _sendMessage(message: AutomergeProtocolMessage) {
    // Fix the peer id.
    (message as any).targetId = this._targetServiceId as PeerId;

    log.verbose('edge replicator send', {
      type: message.type,
      documentId: message.type === 'sync' && message.documentId,
      remoteId: this._remotePeerId,
    });

    const encoded = cbor.encode(message);

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
  }
}

/**
 * This message is sent by EDGE AutomergeReplicator when the authorization is denied.
 */
const isForbiddenErrorMessage = (message: AutomergeProtocolMessage) =>
  message.type === 'error' && message.message === 'Forbidden';
