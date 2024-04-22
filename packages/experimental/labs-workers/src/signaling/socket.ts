//
// Copyright 2024 DXOS.org
//

import { DurableObject } from 'cloudflare:workers';

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { decodeMessage, encodeMessage } from './protocol';
import { type Env } from '../defs';

/**
 * WebSockets are long-lived TCP connections that enable bi-directional, real-time communication between client and server.
 * Cloudflare Durable Objects coordinate Cloudflare Workers to manage WebSocket connections between peers.
 *
 * https://developers.cloudflare.com/workers/runtime-apis/websockets
 *
 * Hibernation allows Durable Objects that do not have events handlers (i.e., not handling peer messages)
 * to be removed from memory without disconnecting the WebSocket.
 *
 * https://developers.cloudflare.com/durable-objects/examples/websocket-hibernation-server
 *
 * Pricing model.
 * https://developers.cloudflare.com/durable-objects/platform/pricing/#example-2
 * Example: $300/mo for 10,000 peers (very actively connected).
 */
export class WebSocketServer extends DurableObject {
  private _connectedSockets;

  // This is reset whenever the constructor runs because regular WebSockets do not survive Durable Object resets.
  // WebSockets accepted via the Hibernation API can survive a certain type of eviction, but we will not cover that here.
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    this._connectedSockets = 0;
  }

  override async fetch(request: Request) {
    // Creates two ends of a WebSocket connection.
    const [client, server] = Object.values(new WebSocketPair());
    const swarmKey = PublicKey.from(request.url.split('/').pop()!);

    // Bind the socket to the Durable Object but make it hibernatable.
    // https://developers.cloudflare.com/durable-objects/api/websockets/#state-methods
    // TODO(burdon): Assign tag?
    this.ctx.acceptWebSocket(server, [swarmKey.toHex()]);

    // TODO(burdon): Auto-respond without waking object.
    // this.ctx.setWebSocketAutoResponse();

    this._connectedSockets += 1;
    log.info('connected', { swarmKey: swarmKey.truncate(), count: this._connectedSockets });

    return new Response(null, {
      status: 101, // Change (upgrade) protocol.
      webSocket: client,
    });
  }

  override async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    log.info('closing...', { code });

    // Check if client has disconnected.
    // https://www.rfc-editor.org/rfc/rfc6455#section-7.4.1
    if (code !== 1005) {
      ws.close(code, 'WebSocketServer is closing WebSocket');
    }

    this._connectedSockets -= 1;
    log.info('closed', { count: this._connectedSockets });
  }

  override async webSocketError(ws: WebSocket, error: Error) {
    log.catch(error);
  }

  // TODO(burdon): Implement protocol:
  //  - advertise
  //  - offer
  //  - answer

  override async webSocketMessage(ws: WebSocket, _message: ArrayBuffer | string) {
    const message = decodeMessage(_message) || {};
    log.info('message', { message });

    const { peerKey, data } = message;
    invariant(peerKey, 'Missing peerKey.');
    // @ts-ignore
    ws.serializeAttachment({ peerKey });

    if (data === 'ping') {
      ws.send(encodeMessage({ data: 'pong' }));
    } else {
      // Broadcast to all connected peers.
      for (const peer of this.ctx.getWebSockets()) {
        if (peer !== ws) {
          // @ts-ignore
          // const { peerKey } = peer.deserializeAttachment() ?? {};
          peer.send(encodeMessage({ peerKey, data }));
        }
      }
    }
  }
}
