//
// Copyright 2024 DXOS.org
//

import { Mutex, scheduleTask, Trigger } from '@dxos/async';
import * as A from '@dxos/automerge/automerge';
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
const RESTART_DELAY = 500;

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
    log.info('connect', { peerId: context.peerId });
    this._context = context;

    this._ctx = Context.default();
    this._edgeConnection.reconnect.on(this._ctx, async () => {
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
    });

    for (const spaceId of this._connectedSpaces) {
      await this._openConnection(spaceId);
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

  private async _openConnection(spaceId: SpaceId) {
    invariant(this._context);
    const connection = new EdgeReplicatorConnection({
      edgeConnection: this._edgeConnection,
      ownPeerId: this._context.peerId,
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
        const ctx = this._ctx;
        this._context?.onConnectionClosed(connection);
        await connection.close();
        if (ctx?.disposed) {
          return;
        }
        await this._openConnection(spaceId);
      },
    });
    this._connections.set(spaceId, connection);

    await connection.open();
  }
}

type EdgeReplicatorConnectionsParams = {
  edgeConnection: EdgeConnection;
  ownPeerId: string;
  spaceId: SpaceId;
  context: EchoReplicatorContext;
  sharedPolicyEnabled: boolean;
  onRemoteConnected: () => Promise<void>;
  onRemoteDisconnected: () => Promise<void>;
  onRestartRequested: () => Promise<void>;
};

class EdgeReplicatorConnection extends Resource implements ReplicatorConnection {
  private readonly _edgeConnection: EdgeConnection;
  private _remotePeerId: string | null = null;
  private readonly _ownPeerId: string;
  private readonly _targetServiceId: string;
  private readonly _spaceId: SpaceId;
  private readonly _context: EchoReplicatorContext;
  private readonly _sharedPolicyEnabled: boolean;
  private readonly _onRemoteConnected: () => Promise<void>;
  private readonly _onRemoteDisconnected: () => Promise<void>;
  private readonly _onRestartRequested: () => Promise<void>;

  private _streamStarted = new Trigger();
  private _readableStreamController!: ReadableStreamDefaultController<AutomergeProtocolMessage>;
  private _restartScheduled = false;

  public readable: ReadableStream<AutomergeProtocolMessage>;
  public writable: WritableStream<AutomergeProtocolMessage>;

  constructor({
    edgeConnection,
    ownPeerId,
    spaceId,
    context,
    sharedPolicyEnabled,
    onRemoteConnected,
    onRemoteDisconnected,
    onRestartRequested,
  }: EdgeReplicatorConnectionsParams) {
    super();
    this._edgeConnection = edgeConnection;
    this._ownPeerId = ownPeerId;
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

    this.readable = new ReadableStream<AutomergeProtocolMessage>({
      start: (controller) => {
        this._readableStreamController = controller;
        this._ctx.onDispose(() => controller.close());
        this._streamStarted.wake();
      },
    });

    this.writable = new WritableStream<AutomergeProtocolMessage>({
      write: async (message: AutomergeProtocolMessage, controller) => {
        await this._sendMessage(message);
      },
    });
  }

  protected override async _open(ctx: Context): Promise<void> {
    // TODO: handle reconnects
    this._ctx.onDispose(
      this._edgeConnection.addListener((msg: RouterMessage) => {
        this._onMessage(msg);
      }),
    );

    await this._onRemoteConnected();
  }

  protected override async _close(): Promise<void> {
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
      // There's no spaceId if the document is not present locally. This means the sharePolicy check is being
      // performed on message reception, so spaceId check was already performed in _onMessage.
      return true;
    }
    return spaceId === this._spaceId;
  }

  shouldSyncCollection(params: ShouldSyncCollectionParams): boolean {
    if (!this._sharedPolicyEnabled) {
      return true;
    }
    const spaceId = getSpaceIdFromCollectionId(params.collectionId as CollectionId);
    return spaceId === this._spaceId;
  }

  private _onMessage(message: RouterMessage) {
    if (message.serviceId !== this._targetServiceId) {
      return;
    }

    const payload = cbor.decode(message.payload!.value) as AutomergeProtocolMessage;
    log('recv', () => {
      const decodedData =
        payload.type === 'sync' && payload.data
          ? A.decodeSyncMessage(payload.data)
          : payload.type === 'collection-state'
            ? (payload as any).state
            : payload;
      return { from: message.serviceId, type: payload.type, decodedData };
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
      if (!this._restartScheduled) {
        log.warn('Forbidden error received, replicator will restart the connection', {
          spaceId: this._spaceId,
          delayMs: RESTART_DELAY,
          remotePeerId: this._remotePeerId,
        });
        this._restartScheduled = true;
        scheduleTask(
          this._ctx,
          async () => {
            await this._onRestartRequested();
          },
          RESTART_DELAY,
        );
      }
      return;
    }

    this._readableStreamController.enqueue(message);
  }

  private async _sendMessage(message: AutomergeProtocolMessage) {
    // Fix the peer id.
    (message as any).targetId = this._targetServiceId as PeerId;

    log('send', {
      type: message.type,
      senderId: message.senderId,
      targetId: (message as any).targetId,
      documentId: (message as any).documentId,
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
