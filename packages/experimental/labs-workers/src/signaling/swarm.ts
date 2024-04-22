//
// Copyright 2024 DXOS.org
//

import { DurableObject } from 'cloudflare:workers';

// TODO(burdon): Rust: https://github.com/cloudflare/workers-rs?tab=readme-ov-file#durable-objects

// https://developers.cloudflare.com/durable-objects/reference/in-memory-state
// https://developers.cloudflare.com/durable-objects/best-practices/create-durable-object-stubs-and-send-requests

export type Message = {
  swarmKey: string;
  peerKey: string;
  data: any;
};

/**
 * Represents swarm.
 */
export class SwarmObject extends DurableObject {
  /**
   * Join the swarm.
   */
  async join(key: string): Promise<number> {
    const peers = (await this.ctx.storage.get<Set<string>>('peers')) || new Set();
    peers.add(key);
    await this.ctx.storage.put('peers', peers);
    return peers.size;
  }

  /**
   * Leave the swarm.
   */
  async leave(key: string): Promise<number> {
    const peers = (await this.ctx.storage.get<Set<string>>('peers')) || new Set();
    peers.delete(key);
    await this.ctx.storage.put('peers', peers);
    return peers.size;
  }
}
