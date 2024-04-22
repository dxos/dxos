//
// Copyright 2024 DXOS.org
//

import { DurableObject } from 'cloudflare:workers';

export class WebSocketServer extends DurableObject {
  currentlyConnectedWebSockets = 0;

  // constructor(ctx, env) {
  // This is reset whenever the constructor runs because
  // regular WebSockets do not survive Durable Object resets.
  //
  // WebSockets accepted via the Hibernation API can survive
  // a certain type of eviction, but we will not cover that here.
  // super(ctx, env);
  // this.currentlyConnectedWebSockets = 0;
  // }

  override async fetch(request: Request) {
    console.log('###', request);

    // Creates two ends of a WebSocket connection.
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    // Calling `accept()` tells the runtime that this WebSocket is to begin terminating
    // request within the Durable Object. It has the effect of "accepting" the connection,
    // and allowing the WebSocket to send and receive messages.
    server.accept();
    this.currentlyConnectedWebSockets += 1;

    // Upon receiving a message from the client, the server replies with the same message,
    // and the total number of connections with the "[Durable Object]: " prefix
    server.addEventListener('message', (event) => {
      server.send(`[Durable Object] currentlyConnectedWebSockets: ${this.currentlyConnectedWebSockets}`);
    });

    // If the client closes the connection, the runtime will close the connection too.
    server.addEventListener('close', (cls) => {
      this.currentlyConnectedWebSockets -= 1;
      server.close(cls.code, 'Durable Object is closing WebSocket');
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }
}
