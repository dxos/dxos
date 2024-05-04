//
// Copyright 2024 DXOS.org
//

import { DurableObject } from 'cloudflare:workers';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import type { Env } from './defs';

// TODO(burdon): Rust: https://github.com/cloudflare/workers-rs?tab=readme-ov-file#durable-objects

// https://developers.cloudflare.com/durable-objects/reference/in-memory-state
// https://developers.cloudflare.com/durable-objects/best-practices/create-durable-object-stubs-and-send-requests

export type Peer = {
  userId: string;
  peerKey: string;
};

/**
 * Represents a swarm (e.g., Space or invitation swarm).
 * Each Durable Object is identified by its swarm key.
 */
export class SwarmObject extends DurableObject<Env> {
  /**
   * @param state
   * @param env
   */
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    log.info('SwarmObject', { id: state.id.toString().slice(0, 8) });
  }

  async getSwarmKey(): Promise<string> {
    const swarmKey = await this.ctx.storage.get<string>('swarmKey');
    invariant(swarmKey);
    return swarmKey;
  }

  async setSwarmKey(swarmKey: string) {
    await this.ctx.storage.put('swarmKey', swarmKey);
  }

  async getPeers(): Promise<Set<Peer>> {
    return (await this.ctx.storage.get<Set<Peer>>('peers')) || new Set();
  }

  async setPeers(peers: Set<Peer>) {
    await this.ctx.storage.put('peers', peers);
  }

  // Storage
  // https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm
  // https://developers.cloudflare.com/workers/runtime-apis/rpc/#structured-clonable-types-and-more

  /**
   * Join the swarm.
   * Registers the peer Key and the associated socket object.
   */
  public async join(peerKey: string, userId: string): Promise<string[]> {
    const peers = await this.getPeers();
    peers.add({ peerKey, userId });
    await this.setPeers(peers);
    await this.notify(peers);
    return Array.from(peers.values()).map((peer) => peer.peerKey);
  }

  /**
   * Leave the swarm.
   */
  public async leave(peerKey: string, userId: string): Promise<string[]> {
    const peers = await this.getPeers();
    const peer = Array.from(peers.values()).find((peer) => peer.peerKey === peerKey && peer.userId === userId);
    invariant(peer);
    peers.delete(peer);
    await this.setPeers(peers);
    await this.notify(peers);
    return Array.from(peers.values()).map((peer) => peer.peerKey);
  }

  /**
   * Notify all peers of a change in the swarm membership.
   */
  private async notify(peers: Set<Peer>) {
    const swarmKey = await this.getSwarmKey();
    const peerKeys = Array.from(peers).map((peer) => peer.peerKey);
    for (const peer of peers) {
      const user = this.env.USER.get(this.env.USER.idFromString(peer.userId));
      await user.notifySwarmUpdated(peer.peerKey, swarmKey, peerKeys);
    }
  }
}
