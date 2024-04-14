//
// Copyright 2024 DXOS.org
//

import { type Connection, type Room, type Server } from 'partykit/server';

// https://docs.partykit.io/glossary/#durable-object
// Durable object: A piece of code running at the edge (worker) with persistent state that is infinitely scaleable (from Cloudflare). It is best suited for real time collaborative applications. Learn more.
// Party: A single server instance - in other words, a single Durable Object.
// Room: An instance of a party, distinguishable by a unique id.

// TODO(burdon): Setting `team` required whitelising from PartyKit (from Sunil via Discord).

// TODO(burdon): Build target for server (compile/imports).
// TODO(burdon): Telemetry.
// https://baselime.io/docs/sending-data/languages/node.js/

// TODO(burdon): Security/auth.
// TODO(burdon): Analytics.
// https://developers.cloudflare.com/calls/https-api

// TODO(burdon): TURN? (requires credentials).
//  https://developers.cloudflare.com/calls/turn

// https://docs.partykit.io/guides/deploy-to-cloudflare
// https://dash.cloudflare.com/profile/api-tokens (API token)
// CLOUDFLARE_ACCOUNT_ID=<your account id> CLOUDFLARE_API_TOKEN=<your api token> npx partykit deploy --domain signaling.dxos.network

/**
 * `npx partykit dev`
 * https://docs.partykit.io/reference/partyserver-api
 */
export default class SignalingServer implements Server {
  // https://docs.partykit.io/guides/scaling-partykit-servers-with-hibernation
  readonly options = {
    hibernate: false, // TODO(burdon): If more than 100 concurrent clients.
  };

  // TODO(burdon): Index by sender and invitation.
  private buffer = new Map<string, string[]>();

  constructor(private readonly room: Room) {}

  onStart() {
    console.log('start', { room: this.room?.id });
  }

  onConnect(connection: Connection) {
    console.log('connect', { room: this.room?.id, peer: connection.id });
    for (const [id, buffer] of this.buffer.entries()) {
      for (const data of buffer) {
        this.room.broadcast(data, [id]);
      }
    }
  }

  // TODO(burdon): Tag connections.
  // getConnectionTags(connection: Connection) {
  //   return [];
  // }

  onMessage(data: string, connection: Connection) {
    // const { invitation } = JSON.parse(data);
    console.log('message', { room: this.room?.id, peer: connection.id, data: JSON.parse(data) });

    const buffer = this.buffer.get(connection.id) ?? [];
    this.buffer.set(connection.id, buffer);
    buffer.push(data);

    this.room.broadcast(data, [connection.id]);
  }
}
