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
import { type AutomergeProtocolMessage, EdgeService, type PeerId } from '@dxos/protocols';
import { buf } from '@dxos/protocols/buf';
import {
  type Message as RouterMessage,
  MessageSchema as RouterMessageSchema,
} from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { trace } from '@dxos/tracing';
import { bufferToArray, compositeKey } from '@dxos/util';

import {
  type AutomergeReplicator,
  type AutomergeReplicatorConnection,
  type AutomergeReplicatorContext,
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
export class EchoEdgeSubductionReplicator implements AutomergeReplicator {
  private readonly _edgeConnection: EdgeConnection;
  private readonly _edgeHttpClient: EdgeHttpClient;
  private readonly _mutex = new Mutex();
  private readonly _disableSharePolicy: boolean;

  private _ctx?: Context = undefined;
  private _context: AutomergeReplicatorContext | null = null;
  private _connectedSpaces = new Set<SpaceId>();
  private _connections = new Map<SpaceId, EdgeSubductionReplicatorConnection>();

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

  @trace.span({ showInBrowserTimeline: true })
  async connectToSpace(ctx: Context, spaceId: SpaceId): Promise<void> {
    log('connectToSpace', { spaceId });
    using _guard = await this._mutex.acquire();

    if (this._connectedSpaces.has(spaceId)) {
      return;
    }
    this._connectedSpaces.add(spaceId);

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
            using _guard = await this._mutex.acquire();
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

    this.readable = new ReadableStream<AutomergeProtocolMessage>({
      start: (controller) => {
        this._readableStreamController = controller;
      },
    });

    this.writable = new WritableStream<AutomergeProtocolMessage>({
      write: async (message: AutomergeProtocolMessage) => {
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

    let firstReconnect = true;
    this._ctx.onDispose(
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

    const payload = cbor.decode(message.payload!.value) as any;

    // Out-of-band reconnect signal from the edge (sent after DO hibernation).
    if (payload?.type === 'subduction-reconnect') {
      log.info('received subduction-reconnect signal');
      this._onRestartRequested();
      return;
    }

    log.verbose('received subduction frame', { remoteId: this._remotePeerId });

    // Fix the peer id so subduction routing inside the Repo accepts the frame.
    const msg = payload as AutomergeProtocolMessage;
    msg.senderId = this._remotePeerId as PeerId;
    this._readableStreamController.enqueue(msg);
  }

  private async _sendMessage(ctx: Context, message: AutomergeProtocolMessage): Promise<void> {
    // Fix the peer id for the outbound frame.
    (message as any).targetId = this._subductionServiceId as PeerId;

    log.verbose('sending...', {
      type: message.type,
      serviceId: this._subductionServiceId,
      remoteId: this._remotePeerId,
    });

    const encoded = cbor.encode(message);

    try {
      await this._edgeConnection.send(
        ctx,
        buf.create(RouterMessageSchema, {
          serviceId: this._subductionServiceId,
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
}
