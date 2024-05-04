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
  peerKey: string;
  socketId: string;
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
    // TODO(burdon): ID should match swarm key.
    log.info('SwarmObject', { id: state.id.toString().slice(0, 8) });
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
  public async join(peerKey: string, socketId: string): Promise<string[]> {
    const peers = await this.getPeers();
    peers.add({ peerKey, socketId });
    await this.setPeers(peers);
    await this.notify(peers);
    return Array.from(peers.values()).map((peer) => peer.peerKey);
  }

  /**
   * Leave the swarm.
   */
  public async leave(peerKey: string, socketId: string): Promise<string[]> {
    const peers = await this.getPeers();
    const peer = Array.from(peers.values()).find((peer) => peer.peerKey === peerKey && peer.socketId === socketId);
    invariant(peer);
    peers.delete(peer);
    await this.setPeers(peers);
    await this.notify(peers);
    return Array.from(peers.values()).map((peer) => peer.peerKey);
  }

  /**
   * Notify all peers of change.
   */
  private async notify(peers: Set<Peer>) {
    for (const peer of peers) {
      const socket = this.env.SOCKET.get(this.env.SOCKET.idFromString(peer.socketId));
      await socket.notify(
        this.ctx.id.toString(),
        Array.from(peers).map((p) => p.peerKey),
      );
    }
  }
}
