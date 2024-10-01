import type { Diff } from './sync';
import { Tree } from './tree';

/**
 * Replicated CRDT that hold a state of a KV map for a set of remote peers.
 */
export class MultiTree {
  #ownState?: Tree = undefined;
  #peerStates = new Map<PeerId, Tree>();

  get(key: string): Uint8Array | undefined {
    if (!this.#ownState) return undefined;

    return this.#ownState.get(key);
  }

  async set(key: string, value: Uint8Array) {
    if (this.#ownState) {
      await this.#ownState.set(key, value);
    } else {
      this.#ownState = await Tree.build([[key, value]]);
    }
  }

  async delete(key: string) {
    if (typeof key !== 'string') {
      throw new TypeError('key is not a string');
    }

    await this.#ownState?.delete(key);
  }

  getAll(key: string): Map<PeerId, Uint8Array> {
    const res = new Map<PeerId, Uint8Array>();
    for (const [peer, tree] of this.#peerStates) {
      const value = tree.get(key);
      if (value) {
        res.set(peer, value);
      }
    }
    return res;
  }

  async generateSyncMessage(peerId: PeerId): Promise<Uint8Array> {
    throw new Error('Not implemented');
  }

  async receiveSyncMessage(peerId: PeerId, message: Uint8Array): Promise<Diff> {
    throw new Error('Not implemented');
  }

  #getPeerState(peerId: PeerId): Tree {
    let tree = this.#peerStates.get(peerId);
    if (!tree) {
      tree = new Tree();
      this.#peerStates.set(peerId, tree);
    }
    return tree;
  }
}

export type PeerId = string;
