//
// Copyright 2026 DXOS.org
//

import * as SqliteDoClient from '@effect/sql-sqlite-do/SqliteClient';
import { DurableObject } from 'cloudflare:workers';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import type * as SqlClient from 'effect/sql/SqlClient';

import { SpaceAuthority, decodeFrame, encodeFrame } from '@dxos/echo-sqlite/sync';
import { log } from '@dxos/log';

export type SpaceEnv = {
  /** One object per space. */
  readonly SPACE: DurableObjectNamespace<SpaceObject>;
};

type Attachment = { readonly connectionId: string };

/**
 * The authority for one space: it holds the space's feeds in its own SQLite and gives every block its
 * position. It reads block metadata only; Automerge documents are never loaded here.
 *
 * Clients connect a socket, accepted through the hibernation API so an idle space holds no memory and
 * costs no duration. A push another client made is announced to the rest, which pull it.
 */
export class SpaceObject extends DurableObject<SpaceEnv> {
  readonly #runtime: ManagedRuntime.ManagedRuntime<SqlClient.SqlClient, never>;
  readonly #authority: SpaceAuthority;

  constructor(ctx: DurableObjectState, env: SpaceEnv) {
    super(ctx, env);
    this.#runtime = ManagedRuntime.make(
      // `storage`, not only its `sql`: transactions go through the object storage API.
      SqliteDoClient.layer({ storage: ctx.storage }).pipe(Layer.orDie),
    );
    this.#authority = new SpaceAuthority({
      send: (connectionId, message) => this.#socket(connectionId)?.send(encodeFrame(message)),
      connections: () =>
        this.ctx.getWebSockets().flatMap((socket) => {
          const attachment = readAttachment(socket);
          return attachment ? [attachment.connectionId] : [];
        }),
    });
    // Every request waits for the schema, so none can reach a store whose tables are not created yet.
    void ctx.blockConcurrencyWhile(() => this.#runtime.runPromise(this.#authority.migrate()));
  }

  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get('upgrade') !== 'websocket') {
      return new Response('Expected a WebSocket upgrade', { status: 426 });
    }
    const pair = new WebSocketPair();
    const attachment: Attachment = { connectionId: crypto.randomUUID() };
    pair[1].serializeAttachment(attachment);
    this.ctx.acceptWebSocket(pair[1]);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  override async webSocketMessage(socket: WebSocket, frame: string | ArrayBuffer): Promise<void> {
    const attachment = readAttachment(socket);
    if (!attachment || typeof frame === 'string') {
      socket.close(1003, 'Binary feed protocol frames only');
      return;
    }
    try {
      const message = decodeFrame(new Uint8Array(frame));
      await this.#runtime.runPromise(this.#authority.handle(attachment.connectionId, message));
    } catch (err) {
      log.warn('feed sync message failed', { error: err });
    }
  }

  override async webSocketClose(socket: WebSocket, code: number): Promise<void> {
    socket.close(code, 'Closing');
  }

  #socket(connectionId: string): WebSocket | undefined {
    return this.ctx.getWebSockets().find((socket) => readAttachment(socket)?.connectionId === connectionId);
  }
}

const readAttachment = (socket: WebSocket): Attachment | undefined => {
  const attachment: unknown = socket.deserializeAttachment();
  return typeof attachment === 'object' &&
    attachment !== null &&
    'connectionId' in attachment &&
    typeof attachment.connectionId === 'string'
    ? { connectionId: attachment.connectionId }
    : undefined;
};
