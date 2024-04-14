//
// Copyright 2024 DXOS.org
//

import { type Connection, type Room, type Server } from 'partykit/server';

// https://docs.partykit.io/glossary/#durable-object
// Durable object: A piece of code running at the edge (worker) with persistent state that is infinitely scaleable (from Cloudflare). It is best suited for real time collaborative applications. Learn more.
// Party: A single server instance - in other words, a single Durable Object.
// Room: An instance of a party, distinguishable by a unique id.

// TODO(burdon): Test offer before listen (how long before forgotten); Polling? Memcache?
// TODO(burdon): Room vs. party.
// TODO(burdon): Import issues; ESM?
// TODO(burdon): Deploy.
// TODO(burdon): Security/auth.
// TODO(burdon): Analytics.
// https://developers.cloudflare.com/calls/https-api

/**
 * `npx partykit dev`
 */
export default class SignalingServer implements Server {
  // TODO(burdon): Index by sender and invitation.
  private buffer = new Map<string, string[]>();

  constructor(private readonly room: Room) {}

  onStart() {
    console.log('start', { room: this.room?.name });
  }

  onConnect(connection: Connection) {
    console.log('connect', { room: this.room?.name, peer: connection.id });
    for (const [id, buffer] of this.buffer.entries()) {
      for (const data of buffer) {
        this.room.broadcast(data, [id]);
      }
    }
  }

  // TODO(burdon): Buffer.
  onMessage(data: string, connection: Connection) {
    // const { invitation } = JSON.parse(data);
    console.log('message', { room: this.room?.name, peer: connection.id, data: JSON.parse(data) });
    this.room.broadcast(data, [connection.id]);
    const buffer = this.buffer.get(connection.id) ?? [];
    this.buffer.set(connection.id, buffer);
    buffer.push(data);
  }
}
