//
// Copyright 2024 DXOS.org
//

import { DurableObject } from 'cloudflare:workers';

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { nonNullable } from '@dxos/util';

import { decodeMessage, encodeMessage, type SwarmPayload } from './protocol';
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
export class SignalingServer extends DurableObject {
  // This is reset whenever the constructor runs because regular WebSockets do not survive Durable Object resets.
  // WebSockets accepted via the Hibernation API can survive a certain type of eviction, but we will not cover that here.
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    log.info('constructed');
  }

  override async fetch(request: Request) {
    const swarmKey = PublicKey.from(request.url.split('/').pop()!);
    log.info('connecting...', { swarmKey: swarmKey.truncate() });

    // Creates two ends of a WebSocket connection.
    const [client, server] = Object.values(new WebSocketPair());

    // Bind the socket to the Durable Object but make it hibernatable.
    // https://developers.cloudflare.com/durable-objects/api/websockets/#state-methods
    this.ctx.acceptWebSocket(server, [swarmKey.toHex()]);

    // TODO(burdon): Auto-respond without waking object.
    // this.ctx.setWebSocketAutoResponse();

    log.info('connected', { swarmKey: swarmKey.truncate(), peers: this.ctx.getWebSockets().length });
    return new Response(null, {
      status: 101, // Change (upgrade) protocol.
      webSocket: client,
    });
  }

  override async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    const tags = this.ctx.getTags(ws);
    const swarmKey = PublicKey.from(tags[0]);
    log.info('closing...', { swarmKey: swarmKey.truncate(), code, reason, wasClean });

    // Check if client has disconnected.
    // https://www.rfc-editor.org/rfc/rfc6455#section-7.4.1
    if (code !== 1005) {
      ws.close(code, 'SignalingServer is closing WebSocket');
    }

    // @ts-ignore
    ws.serializeAttachment({});
    this.updatePeers();

    log.info('closed', { swarmKey: swarmKey.truncate(), peers: this.getOtherPeers(ws).length });
  }

  override async webSocketError(ws: WebSocket, error: Error) {
    log.catch(error);
  }

  // TODO(burdon): Implement protocol: advertise, offer, answer.
  override async webSocketMessage(ws: WebSocket, _message: ArrayBuffer | string) {
    const message = decodeMessage(_message);
    log.info('message', { message });
    if (!message) {
      return;
    }

    const { type, sender, recipient, data } = message;
    invariant(sender, 'Missing sender.');

    switch (type) {
      case 'ping': {
        ws.send(encodeMessage({ type: 'pong' }));
        break;
      }

      case 'join': {
        // @ts-ignore
        ws.serializeAttachment({ peerKey: sender });
        this.updatePeers();
        break;
      }

      case 'leave': {
        // @ts-ignore
        ws.serializeAttachment({});
        this.updatePeers();
        break;
      }

      default: {
        if (recipient) {
          // Send to peer.
          const peer = this.ctx.getWebSockets().find((peer) => this.getPeerKey(peer)?.equals(recipient));
          peer?.send(encodeMessage({ type, sender, data }));
        } else {
          // Broadcast to all connected peers.
          for (const { ws: peer } of this.getOtherPeers(ws)) {
            peer.send(encodeMessage({ type, sender, data }));
          }
        }
      }
    }
  }

  getPeerKey(ws: WebSocket): PublicKey | undefined {
    // @ts-ignore
    const { peerKey } = ws.deserializeAttachment();
    return peerKey && PublicKey.from(peerKey);
  }

  /**
   * Get other connected peers.
   */
  getOtherPeers(current: WebSocket): { ws: WebSocket; peerKey?: PublicKey }[] {
    return this.ctx
      .getWebSockets()
      .filter((ws) => ws !== current)
      .map((ws) => {
        // @ts-ignore
        const { peerKey } = ws.deserializeAttachment();
        return { ws, peerKey };
      });
  }

  /**
   * Broadcast peer keys to all connected peers.
   */
  updatePeers() {
    for (const peer of this.ctx.getWebSockets()) {
      const peerKeys = this.getOtherPeers(peer)
        .map(({ peerKey }) => peerKey)
        .filter(nonNullable);
      peer.send(encodeMessage<SwarmPayload>({ type: 'info', data: { peerKeys } }));
    }
  }
}
