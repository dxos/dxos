//
// Copyright 2024 DXOS.org
//

import { DurableObject } from 'cloudflare:workers';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { type Env } from './defs';
import { type Peer } from '../protocol';

// TODO(burdon): Rust: https://github.com/cloudflare/workers-rs?tab=readme-ov-file#durable-objects

// https://developers.cloudflare.com/durable-objects/reference/in-memory-state
// https://developers.cloudflare.com/durable-objects/best-practices/create-durable-object-stubs-and-send-requests

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

  public async setSwarmKey(swarmKey: string) {
    invariant(swarmKey);
    await this.ctx.storage.put('swarmKey', swarmKey);
  }

  public async getSwarmKey(): Promise<string> {
    const swarmKey = await this.ctx.storage.get<string>('swarmKey');
    invariant(swarmKey);
    return swarmKey;
  }

  private async getPeers(): Promise<Set<Peer>> {
    return (await this.ctx.storage.get<Set<Peer>>('peers')) || new Set();
  }

  private async setPeers(peers: Set<Peer>) {
    await this.ctx.storage.put('peers', peers);
  }

  // Storage
  // https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm
  // https://developers.cloudflare.com/workers/runtime-apis/rpc/#structured-clonable-types-and-more

  /**
   * Join the swarm and notify other peers.
   * Registers the peer key and the associated UserObject.
   */
  public async join(peer: Peer) {
    const peers = await this.getPeers();
    const peerArray = Array.from(peers.values());
    peers.add(peer);
    await this.setPeers(peers);
    await this.notify(peerArray);
  }

  /**
   * Leave the swarm and notify other peers.
   */
  public async leave(peer: Peer) {
    const peers = await this.getPeers();
    const peerArray = Array.from(peers.values());
    peers.delete(
      peerArray.find(({ discoveryKey, peerKey }) => discoveryKey === peer.discoveryKey && peerKey === peer.peerKey)!,
    );
    await this.setPeers(peers);
    await this.notify(peerArray);
  }

  /**
   * Notify all peers of the change in swarm membership.
   */
  private async notify(peers: Peer[]) {
    const swarmKey = await this.getSwarmKey();
    for (const peer of peers) {
      const router = this.env.ROUTER.get(this.env.ROUTER.idFromName(peer.discoveryKey));
      await router.notifySwarmUpdated(peer.peerKey, swarmKey, peers);
    }
  }
}
