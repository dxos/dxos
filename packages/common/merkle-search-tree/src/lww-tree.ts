//
// Copyright 2024 DXOS.org
//

import type { ActorID } from './common';
import { type DigestHex, Forest, type Key, type NodeData } from './forest';

export type LLWTreeProps = {
  actor: ActorID;
};

/**
 * Replicated Key-Value Store with Last-Write-Wins semantics.
 */
export class LWWTree<T> {
  static async new<T>(params: LLWTreeProps): Promise<LWWTree<T>> {
    const tree = new LWWTree<T>(params);
    tree.#currentRoot = await tree.#forest.createTree([]);

    return tree;
  }

  #actor: ActorID;

  #forest = new Forest();

  #currentRoot!: DigestHex;

  get currentRoot() {
    return this.#currentRoot;
  }

  private constructor(params: LLWTreeProps) {
    this.#actor = params.actor;
  }

  async get(key: Key): Promise<T | undefined> {
    const data = await this.#getData(key);
    return data?.value;
  }

  async setBatch(pairs: [Key, T][]): Promise<void> {
    const prevDataBatch = await Promise.all(pairs.map(([key]) => this.#getData(key)));
    const updates = pairs.map(([key, value], i) => {
      const prevData = prevDataBatch[i];
      const newClock: VersionClock = !prevData
        ? ([this.#actor, 0] as const)
        : ([this.#actor, prevData.clock[1] + 1] as const);
      const data = this.#encode({ clock: newClock, value });

      return [key, data] as const;
    });
    this.#currentRoot = await this.#forest.setBatch(this.#currentRoot, updates);
  }

  async set(key: Key, value: T): Promise<void> {
    await this.setBatch([[key, value]]);
  }

  async receiveSyncMessage(state: LWWTreeSyncState, message: LWWTreeSyncMessage): Promise<LWWTreeSyncState> {
    await this.#forest.insertNodes(message.nodes);

    const remoteRoot = message.root ?? state.remoteRoot;

    if (remoteRoot !== null) {
      const missing = [...(await this.#forest.missingNodes(remoteRoot))];
      if (missing.length === 0) {
        this.#currentRoot = await this.#forest.merge(remoteRoot, this.#currentRoot, this.#merge.bind(this));
      } else if (state.remoteRoot !== null && state.remoteRoot !== remoteRoot) {
        // If we're missing nodes from the new remote root, but we have the previous remote root, we can try to merge.
        const missingFromPrevRoot = [...(await this.#forest.missingNodes(state.remoteRoot))];
        if (missingFromPrevRoot.length === 0) {
          await this.#forest.merge(state.remoteRoot, this.#currentRoot, this.#merge.bind(this));

          const missing = [...(await this.#forest.missingNodes(remoteRoot))];
          if (missing.length === 0) {
            this.#currentRoot = await this.#forest.merge(remoteRoot, this.#currentRoot, this.#merge.bind(this));
          }
        }
      }
    }

    return {
      remoteRoot,
      remoteWant: message.want,
      needsAck: message.nodes.length > 0,
    };
  }

  async generateSyncMessage(state: LWWTreeSyncState): Promise<[LWWTreeSyncState, LWWTreeSyncMessage | null]> {
    if (state.remoteRoot === this.#currentRoot && state.remoteWant.length === 0 && !state.needsAck) {
      return [state, null];
    }

    const nodes = await this.#forest.getNodes(state.remoteWant);
    const want = state.remoteRoot === null ? [] : [...(await this.#forest.missingNodes(state.remoteRoot))];

    return [
      {
        remoteRoot: state.remoteRoot,
        remoteWant: state.remoteWant,
        needsAck: false,
      },
      {
        root: this.#currentRoot,
        want,
        nodes,
      },
    ];
  }

  async #getData(key: Key): Promise<ValueData<T> | undefined> {
    const res = await this.#forest.get(this.#currentRoot, key);
    switch (res.kind) {
      case 'present': {
        return this.#decode(res.value);
      }

      case 'missing':
        return undefined;
      case 'not-available':
        throw new Error('Key not available');
    }
  }

  async #merge(key: Key, left: Uint8Array | null, right: Uint8Array | null): Promise<Uint8Array> {
    if (!left) {
      return right!;
    }
    if (!right) {
      return left!;
    }

    const leftData = this.#decode(left);
    const rightData = this.#decode(right);

    const cmp =
      leftData.clock[1] === rightData.clock[1]
        ? leftData.clock[0].localeCompare(rightData.clock[0])
        : leftData.clock[1] - rightData.clock[1];
    if (cmp >= 0) {
      return left;
    } else {
      return right;
    }
  }

  #decode(value: Uint8Array): ValueData<T> {
    return JSON.parse(textDecoder.decode(value));
  }

  #encode(data: ValueData<T>): Uint8Array {
    const { clock, value } = data;
    return textEncoder.encode(JSON.stringify({ clock, value })); // Field order ensures consistent hashing.
  }
}

export type LWWTreeSyncMessage = {
  root: DigestHex | null;
  want: DigestHex[];
  nodes: NodeData[];
};

export type LWWTreeSyncState = {
  remoteRoot: DigestHex | null;
  remoteWant: DigestHex[];
  needsAck: boolean;
};

export const initLWWTreeSyncState = (): LWWTreeSyncState => ({ remoteRoot: null, remoteWant: [], needsAck: false });

type VersionClock = readonly [actor: ActorID, version: number];

type ValueData<T> = {
  clock: VersionClock;
  value: T;
};

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();
