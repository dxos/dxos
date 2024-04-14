//
// Copyright 2024 DXOS.org
//

import { type Connection, type Request, type Room, type Server } from 'partykit/server';

// https://docs.partykit.io/glossary/#durable-object
// Durable object: A piece of code running at the edge (worker) with persistent state that is infinitely scaleable (from Cloudflare). It is best suited for real time collaborative applications. Learn more.
// Party: A single server instance - in other words, a single Durable Object.
// Room: An instance of a party, distinguishable by a unique id.

// TODO(burdon): Setting `team` required whitelising from PartyKit (from Sunil via Discord).

// TODO(burdon): Build target for server (compile/imports).
// TODO(burdon): Telemetry.
// https://baselime.io/docs/sending-data/languages/node.js

// TODO(burdon): Security/auth.
// TODO(burdon): Analytics.
// https://developers.cloudflare.com/calls/https-api

// TODO(burdon): TURN? (requires credentials).
//  https://developers.cloudflare.com/calls/turn

// https://docs.partykit.io/guides/deploy-to-cloudflare
// https://dash.cloudflare.com/profile/api-tokens (API token)
// CLOUDFLARE_ACCOUNT_ID=<your account id> CLOUDFLARE_API_TOKEN=<your api token> npx partykit deploy --domain signaling.dxos.network

// TODO(burdon): Experimental (move to closed source)?

/**
 * `npx partykit dev`
 * https://docs.partykit.io/reference/partyserver-api
 */
export default class SignalingServer implements Server {
  // https://docs.partykit.io/guides/scaling-partykit-servers-with-hibernation
  readonly options = {
    hibernate: false, // TODO(burdon): If more than 100 concurrent clients.
  };

  // TODO(burdon): Authz connections (e.g., using OTP style session key)?
  //  https://www.npmjs.com/package/otp-io
  // static onBeforeConnect(req: Request) {
  //   return new Response('Access denied', { status: 403 });
  // }

  // TODO(burdon): However, signaling should be private peer-to-peer.
  private readonly _buffer = new Map<string, string[]>();

  /**
   * For invitations the caller initiates usings a temporary swarm key.
   * To reconnect to space, peers join using the swarm key and have to negotiate roles (e.g., polite/impolite).
   * A new room (durable object) is created for each swarm/invitation.
   * Cloudflare Workers allow 100K requests/day (10ms CPU time per invocation) on the free tier.
   * https://developers.cloudflare.com/workers/platform/pricing
   */
  constructor(private readonly room: Room) {}

  // TODO(burdon): Tag connections.
  // getConnectionTags(connection: Connection) {
  //   return [];
  // }

  onStart() {
    console.log('start', { room: this.room?.id });
  }

  /**
   * Messages are recorded by sender and replayed to new peers joining the swarm.
   */
  onConnect(connection: Connection) {
    console.log('connect', { room: this.room?.id, peer: connection.id });
    for (const [id, buffer] of this._buffer.entries()) {
      for (const data of buffer) {
        this.room.broadcast(data, [id]);
      }
    }
  }

  onClose(connection: Connection) {
    console.log('close', { room: this.room?.id, peer: connection.id });
    this._buffer.delete(connection.id);
  }

  onError(connection: Connection, error: Error) {
    console.error('error', { room: this.room?.id, peer: connection.id, error });
  }

  onMessage(data: string, connection: Connection) {
    try {
      console.log('message', { room: this.room?.id, peer: connection.id, data: JSON.parse(data) });
      const buffer = this._buffer.get(connection.id) ?? [];
      this._buffer.set(connection.id, buffer);
      buffer.push(data);

      this.room.broadcast(data, [connection.id]);
    } catch (err) {
      // TODO(burdon): Test if uncaught errors fire the onError handler?
      console.error('error', { room: this.room?.id, peer: connection.id, error: err });
    }
  }

  // TODO(burdon): Authz admin API.
  // curl -s -X POST -H "Content-Type: application/json" http://127.0.0.1:1999/parties/main/<SWARM_KEY> | jq
  async onRequest(req: Request) {
    console.log('onRequest', { room: this.room?.id });
    const peers = Array.from(this.room.getConnections()).map((connection) => connection.id);
    return Response.json({ ok: true, connections: peers });
  }
}
