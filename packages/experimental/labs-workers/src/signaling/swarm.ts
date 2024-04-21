//
// Copyright 2024 DXOS.org
//

import { DurableObject } from 'cloudflare:workers';

// TODO(burdon): Web sockets server.
//  https://developers.cloudflare.com/durable-objects/api/websockets
//  https://developers.cloudflare.com/durable-objects/examples/websocket-server

// TODO(burdon): Rust: https://github.com/cloudflare/workers-rs?tab=readme-ov-file#durable-objects

// https://developers.cloudflare.com/durable-objects/reference/in-memory-state
// https://developers.cloudflare.com/durable-objects/best-practices/create-durable-object-stubs-and-send-requests

/**
 * Represents swarm.
 */
export class SwarmObject extends DurableObject {
  async join(key: string): Promise<number> {
    const peers = (await this.ctx.storage.get<Set<string>>('peers')) || new Set();
    peers.add(key);
    await this.ctx.storage.put('peers', peers);
    return peers.size;
  }

  async leave(key: string): Promise<number> {
    const peers = (await this.ctx.storage.get<Set<string>>('peers')) || new Set();
    peers.delete(key);
    await this.ctx.storage.put('peers', peers);
    return peers.size;
  }
}
