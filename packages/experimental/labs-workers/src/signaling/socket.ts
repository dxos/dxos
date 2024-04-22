//
// Copyright 2024 DXOS.org
//

import { DurableObject } from 'cloudflare:workers';

import { log } from '@dxos/log';

import { decodeMessage, encodeMessage } from './protocol';

/**
 * Durable socket connection.
 */
export class WebSocketServer extends DurableObject {
  private _connectedSockets = 0;

  // TODO(burdon): Does this support hibernation?
  // https://developers.cloudflare.com/durable-objects/api/websockets/#state-methods

  // This is reset whenever the constructor runs because regular WebSockets do not survive Durable Object resets.
  // WebSockets accepted via the Hibernation API can survive a certain type of eviction, but we will not cover that here.

  override async fetch(request: Request) {
    // Creates two ends of a WebSocket connection.
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    Object.assign(server, {
      // If the client closes the connection, the runtime will close the connection too.
      onclose: (event) => {
        log.info('closing...', { code: event.code });

        // Check if client has disconnected.
        // https://www.rfc-editor.org/rfc/rfc6455#section-7.4.1
        if (event.code !== 1005) {
          server.close(event.code, 'WebSocketServer is closing WebSocket');
        }

        this._connectedSockets -= 1;
        log.info('closed', { count: this._connectedSockets });
      },

      onerror: (event) => {
        log.catch(event);
      },

      onmessage: (event) => {
        const data = decodeMessage(event.data) || {};
        log.info('message', { data });
        if (data?.swarmKey) {
          server.send(encodeMessage({ swarmKey: data?.swarmKey, data: { sockets: this._connectedSockets } }));
        }
      },
    } satisfies Partial<WebSocket>);

    // Tells the runtime that this WebSocket is to begin terminating request within the Durable Object.
    // It has the effect of "accepting" the connection, and allowing the WebSocket to send and receive messages.
    // @ts-ignore
    server.accept();
    this._connectedSockets += 1;
    log.info('connected', { url: request.url, count: this._connectedSockets });

    // Change (upgrade) protocol.
    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }
}
