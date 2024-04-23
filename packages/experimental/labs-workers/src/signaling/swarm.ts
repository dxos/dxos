//
// Copyright 2024 DXOS.org
//

import { DurableObject } from 'cloudflare:workers';

// TODO(burdon): Rust: https://github.com/cloudflare/workers-rs?tab=readme-ov-file#durable-objects

// https://developers.cloudflare.com/durable-objects/reference/in-memory-state
// https://developers.cloudflare.com/durable-objects/best-practices/create-durable-object-stubs-and-send-requests

/**
 * Represents swarm.
 */
export class SwarmObject extends DurableObject {
  async getPeers(): Promise<Set<string>> {
    return (await this.ctx.storage.get<Set<string>>('peers')) || new Set();
  }

  /**
   * Join the swarm.
   */
  async join(peerKey: string): Promise<string[]> {
    const peers = await this.getPeers();
    peers.add(peerKey);
    await this.ctx.storage.put('peers', peers);
    return Array.from(peers.values()).filter((peer) => peer !== peerKey);
  }

  /**
   * Leave the swarm.
   */
  async leave(peerKey: string): Promise<string[]> {
    const peers = await this.getPeers();
    peers.delete(peerKey);
    await this.ctx.storage.put('peers', peers);
    return Array.from(peers.values()).filter((peer) => peer !== peerKey);
  }
}
