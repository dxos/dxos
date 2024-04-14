//
// Copyright 2024 DXOS.org
//

import type * as Party from 'partykit/server';

// TODO(burdon): Import issues; ESM?
// TODO(burdon): Deploy.
// https://developers.cloudflare.com/calls/https-api

/**
 * `npx partykit dev`
 */
export default class SignalingServer implements Party.Server {
  constructor(readonly room: Party.Room) {
    console.log('started', room.name);
  }

  onMessage(message: string, sender: Party.Connection) {
    this.room.broadcast(message, [sender.id]);
    console.log('message', { sender: sender.id, message });
  }
}
