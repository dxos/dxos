//
// Copyright 2024 DXOS.org
//

import { arraysEqual } from '@dxos/util';

import type { ActorID } from './common';
import { type DigestHex, Forest, type Key, type NodeData } from './forest';

export type MirrorMultiMapProps = {
  actor: ActorID;
};

/**
 * Replicated tree where each actor's state is tracked separately.
 * Sync is optimized for the case where each actor has a similar state.
 * Actors are expected to eventually converge to the same state.
 */
export class MirrorMultiMap<T> {
  static async new<T>(params: MirrorMultiMapProps): Promise<MirrorMultiMap<T>> {
    const tree = new MirrorMultiMap<T>(params);
    tree.#currentRoot = await tree.#forest.createTree([]);

    return tree;
  }

  #forest = new Forest();

  #actor: ActorID;
  #currentRoot!: DigestHex;

  #remoteStates = new Map<ActorID, SyncState>();

  private constructor(params: MirrorMultiMapProps) {
    this.#actor = params.actor;
  }

  get localActorId(): ActorID {
    return this.#actor;
  }

  get currentRoot(): DigestHex {
    return this.#currentRoot;
  }

  get forest(): Forest {
    return this.#forest;
  }

  async getLocal(key: Key): Promise<T | undefined> {
    const entry = await this.#forest.get(this.#currentRoot, key);
    switch (entry?.kind) {
      case 'present':
        return this.#decode(entry.value);
      case 'missing':
        return undefined;
      case 'not-available':
        throw new Error('Unexpected local entry not available');
    }
  }

  async setLocalBatch(pairs: (readonly [Key, T])[]): Promise<void> {
    const updates = pairs.map(([key, value]) => [key, this.#encode(value)] as const);
    this.#currentRoot = await this.#forest.setBatch(this.#currentRoot, updates);
  }

  async getFor(actorId: ActorID, key: Key): Promise<T | undefined> {
    const state = this.#remoteStates.get(actorId);
    if (!state) {
      throw new Error(`Unknown actorId: ${actorId}`);
    }
    if (!state.remoteRoot) {
      return undefined;
    }

    const entry = await this.#forest.get(state.remoteRoot, key);
    switch (entry?.kind) {
      case 'present':
        return this.#decode(entry.value);
      case 'missing':
        return undefined;
      case 'not-available':
        throw new Error('Unexpected remote entry not available');
    }
  }

  async setForBatch(actorId: ActorID, pairs: [Key, T][]): Promise<void> {
    const remoteState = this.#remoteStates.get(actorId) ?? initSyncState();
    const updates = pairs.map(([key, value]) => [key, this.#encode(value)] as const);
    const prevRoot = remoteState.remoteRoot ?? (await this.#forest.createTree([]));
    const nextRoot = await this.#forest.setBatch(prevRoot, updates);

    this.#remoteStates.set(actorId, {
      remoteRoot: nextRoot,
      myRoot: null,
      remoteWant: remoteState.remoteWant,
      needsAck: remoteState.needsAck,
    });
  }

  async getAll(key: Key): Promise<Map<ActorID, T | undefined>> {
    const result = new Map<ActorID, T | undefined>();
    result.set(this.#actor, await this.getLocal(key));
    for (const [actorId, _state] of this.#remoteStates) {
      result.set(actorId, await this.getFor(actorId, key));
    }
    return result;
  }

  async getDifferent(): Promise<Map<Key, Map<ActorID, T | undefined>>> {
    // TODO(dmaretskyi): This could be optimized to not traverse nodes that have equal hashes.

    const resultByKey = new Map<Key, Map<ActorID, Uint8Array>>();

    const actors = new Set<ActorID>([this.#actor, ...this.#remoteStates.keys()]);
    for (const actor of actors) {
      let root;
      if (actor === this.#actor) {
        root = this.#currentRoot;
      } else {
        root = this.#remoteStates.get(actor)?.remoteRoot;
      }

      if (!root) {
        continue;
      }
      for (const item of this.#forest.items(root)) {
        let subMap = resultByKey.get(item.key);
        if (!subMap) {
          subMap = new Map();
          resultByKey.set(item.key, subMap);
        }
        subMap.set(actor, item.value);
      }
    }

    const result = new Map<Key, Map<ActorID, T | undefined>>();

    for (const [key, subMap] of resultByKey) {
      const first = subMap.values().next().value!;
      let allEqual = subMap.size === actors.size;
      if (allEqual) {
        for (const value of subMap.values()) {
          if (!arraysEqual(first, value)) {
            allEqual = false;
            break;
          }
        }
      }

      if (!allEqual) {
        const resultSubMap = new Map<ActorID, T | undefined>();
        for (const [actorId, value] of subMap) {
          resultSubMap.set(actorId, this.#decode(value));
        }
        result.set(key, resultSubMap);
      }
    }

    return result;
  }

  clearActorState(actorId: ActorID): void {
    this.#remoteStates.delete(actorId);
  }

  async receiveSyncMessage(actorId: ActorID, message: MirrorMultiMapSyncMessage): Promise<void> {
    await this.#forest.insertNodes(message.nodes);

    const state = this.#remoteStates.get(actorId) ?? initSyncState();
    const remoteRoot = message.root ?? state.remoteRoot;

    const newState: SyncState = {
      remoteRoot,
      myRoot: message.remoteRoot ?? state.myRoot,
      remoteWant: message.want,
      needsAck: message.nodes.length > 0,
    };
    this.#remoteStates.set(actorId, newState);
  }

  async generateSyncMessage(actorId: ActorID): Promise<MirrorMultiMapSyncMessage | null> {
    const state = this.#remoteStates.get(actorId) ?? initSyncState();

    if (state.myRoot === this.#currentRoot && state.remoteWant.length === 0 && !state.needsAck) {
      return null;
    }

    const nodes = await this.#forest.getNodes(state.remoteWant);
    const want = state.remoteRoot === null ? [] : [...(await this.#forest.missingNodes(state.remoteRoot))];

    this.#remoteStates.set(actorId, {
      remoteRoot: state.remoteRoot,
      myRoot: state.myRoot,
      remoteWant: state.remoteWant,
      needsAck: false,
    });

    return {
      root: this.#currentRoot,
      remoteRoot: state.remoteRoot,
      want,
      nodes,
    };
  }

  #decode(value: Uint8Array): T {
    return JSON.parse(textDecoder.decode(value));
  }

  #encode(data: T): Uint8Array {
    return textEncoder.encode(JSON.stringify(data)); // Field order ensures consistent hashing.
  }
}

export type MirrorMultiMapSyncMessage = {
  root: DigestHex | null;
  remoteRoot: DigestHex | null;
  want: DigestHex[];
  nodes: NodeData[];
};

type SyncState = {
  remoteRoot: DigestHex | null;
  myRoot: DigestHex | null;
  remoteWant: DigestHex[];
  needsAck: boolean;
};

const initSyncState = (): SyncState => ({ remoteRoot: null, myRoot: null, remoteWant: [], needsAck: false });

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();
