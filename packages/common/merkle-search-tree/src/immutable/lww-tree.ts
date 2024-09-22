import { arrayToString } from '@dxos/util';
import { Forest, type DigestHex, type Key, type NodeData } from './forest';

export type ActorID = string & { __ActorID: never };

export type LLWTreeParams = {
  actor: ActorID;
};

export class LWWTree<T> {
  static async new(params: LLWTreeParams) {
    const tree = new LWWTree(params);
    tree.#currentRoot = await tree.#forest.createTree([]);

    return tree;
  }

  #actor: ActorID;

  #forest = new Forest();

  #currentRoot!: DigestHex;

  get currentRoot() {
    return this.#currentRoot;
  }

  private constructor(params: LLWTreeParams) {
    this.#actor = params.actor;
  }

  async get(key: Key): Promise<T | undefined> {
    const data = await this.#getData(key);
    return data?.value;
  }

  async set(key: Key, value: T) {
    const prevData = await this.#getData(key);
    const newClock: VersionClock = !prevData
      ? ([this.#actor, 0] as const)
      : ([this.#actor, prevData.clock[1] + 1] as const);
    const data = this.#encode({ clock: newClock, value });
    this.#currentRoot = await this.#forest.set(this.#currentRoot, key, data);
  }

  async receiveSyncMessage(state: SyncState, message: SyncMessage): Promise<SyncState> {
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
      remoteRoot: remoteRoot,
      remoteWant: message.want,
      needsAck: message.nodes.length > 0,
    };
  }

  async generateSyncMessage(state: SyncState): Promise<[SyncState, SyncMessage | null]> {
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

export type SyncMessage = {
  root: DigestHex | null;
  want: DigestHex[];
  nodes: NodeData[];
};

export type SyncState = {
  remoteRoot: DigestHex | null;
  remoteWant: DigestHex[];
  needsAck: boolean;
};

export const initSyncState = (): SyncState => ({ remoteRoot: null, remoteWant: [], needsAck: false });

type VersionClock = readonly [actor: ActorID, version: number];

type ValueData<T> = {
  clock: VersionClock;
  value: T;
};

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();
