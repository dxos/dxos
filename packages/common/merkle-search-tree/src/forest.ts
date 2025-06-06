//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { arrayToHex, arraysEqual } from '@dxos/util';

import { formatDigest, getLevelHex } from './common';

export class Forest {
  #nodes = new Map<DigestHex, Node>();

  itemHashOps = 0;
  nodeHashOps = 0;

  async createTree(pairs: Iterable<Pair>): Promise<DigestHex> {
    const items = await Promise.all([...pairs].map(([key, value]) => makeItem(key, value)));
    this.itemHashOps += items.length;
    items.sort((a, b) => (a.key < b.key ? -1 : 1));
    // Check for repetition.
    for (let i = 0; i < items.length; i++) {
      if (i + 1 < items.length && items[i].key === items[i + 1].key) {
        throw new Error('Duplicate key');
      }
    }

    if (items.length === 0) {
      return this.#makeNode(0, [], []);
    }

    // #    0 0  1  0 0   2  1  0  1  0
    // 0   [0 0] 1 [0 0]  2  1 [0] 1 [0]
    // 1  [[0 0] 1 [0 0]] 2 [1 [0] 1 [0]]
    // 2 [[[0 0] 1 [0 0]] 2 [1 [0] 1 [0]]]

    const buildLevel = async (level: number, from: number, to: number): Promise<DigestHex> => {
      invariant(level >= 0);
      if (level === 0) {
        return this.#makeNode(0, items.slice(from, to), []);
      }

      let rangeBegin = from;
      const childItems: Item[] = [];
      const childNodes: DigestHex[] = [];
      for (let i = from; i < to; i++) {
        if (items[i].level > level) {
          throw new Error('BUG - Node level is higher then expected');
        }
        if (items[i].level === level) {
          const node = await buildLevel(level - 1, rangeBegin, i);
          childNodes.push(node);
          childItems.push(items[i]);
          rangeBegin = i + 1;
        }
      }
      childNodes.push(await buildLevel(level - 1, rangeBegin, to));

      return this.#makeNode(level, childItems, childNodes);
    };

    const maxLevel = Math.max(...items.map((item) => item.level));
    const root = await buildLevel(maxLevel, 0, items.length);
    return root;
  }

  async get(root: DigestHex, key: string): Promise<GetResult<Uint8Array>> {
    const keyLevel = await getKeyLevel(key);

    let node = this.#nodes.get(root);

    if (node !== undefined && node.level < keyLevel) {
      return { kind: 'missing' };
    }

    while (node !== undefined) {
      if (node.level === keyLevel) {
        // TODO(dmaretskyi): Binary search.
        for (let i = 0; i < node.items.length; i++) {
          if (node.items[i].key === key) {
            return { kind: 'present', value: node.items[i].value };
          }
        }
        return { kind: 'missing' };
      } else {
        // TODO(dmaretskyi): Binary search.
        let found = false;
        for (let i = 0; i < node.items.length; i++) {
          if (node.items[i].key > key) {
            // Descend down one level.
            node = this.#nodes.get(node.children[i]);
            found = true;
            break;
          }
        }
        if (!found) {
          invariant(node!.level > 0);
          node = this.#nodes.get(node!.children[node!.items.length]);
        }
      }
    }
    return { kind: 'not-available' };
  }

  async merge(digest1: DigestHex, digest2: DigestHex, mergeFn: MergeFn): Promise<DigestHex> {
    // console.log(`merge ${digest1.slice(0, 8)} ${digest2.slice(0, 8)}`)
    if (digest1 === digest2) {
      return digest1;
    }

    const node1 = this.#requireNode(digest1);
    const node2 = this.#requireNode(digest2);

    if (node2.level < node1.level) {
      return await this.merge(digest1, await this.#makeNode(node2.level + 1, [], [digest2]), mergeFn);
    } else if (node1.level < node2.level) {
      return await this.merge(await this.#makeNode(node1.level + 1, [], [digest1]), digest2, mergeFn);
    }

    invariant(node1.level === node2.level);

    //    # B # | D | # E # F # H # | K |   #
    //  # A #   | D |    #    G   # | K | # L #
    //

    const resultItems: Item[] = [];
    const resultChildren: DigestHex[] = [];

    let carry1: DigestHex | null = null;
    let carry2: DigestHex | null = null;

    for (let i1 = 0, i2 = 0; i1 < node1.items.length || i2 < node2.items.length; undefined) {
      invariant(i1 <= node1.items.length);
      invariant(i2 <= node2.items.length);

      const key1 = i1 < node1.items.length ? node1.items[i1].key : null;
      const key2 = i2 < node2.items.length ? node2.items[i2].key : null;
      invariant(key1 !== null || key2 !== null);

      const child1 = carry1 !== null ? carry1 : node1.children[i1];
      const child2 = carry2 !== null ? carry2 : node2.children[i2];
      if (node1.level > 0) {
        invariant(validDigest(child1));
        invariant(validDigest(child2));
      }

      if (key1 === key2) {
        if (node1.level > 0) {
          resultChildren.push(await this.merge(child1, child2, mergeFn));
        }
        resultItems.push(await this.#mergeItem(mergeFn, node1.items[i1], node2.items[i2]));
        carry1 = null;
        carry2 = null;
        i1++;
        i2++;
      } else if (key2 !== null && (key1 === null || key1 > key2)) {
        // Split first.
        invariant(key2 !== null);

        resultItems.push(await this.#mergeItem(mergeFn, null, node2.items[i2]));

        if (node1.level > 0) {
          const [left, right] = await this.#splitAtKey(child1, key2);
          resultChildren.push(await this.merge(left, child2, mergeFn));
          carry1 = right;
          carry2 = null;
        }
        i2++;
      } else {
        // Split second.
        invariant(key1 !== null);

        resultItems.push(await this.#mergeItem(mergeFn, node1.items[i1], null));

        if (node1.level > 0) {
          const [left, right] = await this.#splitAtKey(child2, key1);
          resultChildren.push(await this.merge(child1, left, mergeFn));
          carry1 = null;
          carry2 = right;
        }
        i1++;
      }
    }
    if (node1.level > 0) {
      const child1 = carry1 !== null ? carry1 : node1.children[node1.items.length];
      const child2 = carry2 !== null ? carry2 : node2.children[node2.items.length];
      resultChildren.push(await this.merge(child1, child2, mergeFn));
    }

    return await this.#makeNode(node1.level, resultItems, resultChildren);
  }

  async setBatch(root: DigestHex, pairs: Iterable<Pair>): Promise<DigestHex> {
    const newTree = await this.createTree(pairs);
    return await this.merge(root, newTree, async (key, value1, value2) => (value2 !== null ? value2 : value1!));
  }

  async set(root: DigestHex, key: Key, value: Uint8Array): Promise<DigestHex> {
    return this.setBatch(root, [[key, value]]);
  }

  *missingNodes(digest: DigestHex): Iterable<DigestHex> {
    const node = this.#nodes.get(digest);
    if (!node) {
      yield digest;
    } else {
      for (const child of node.children) {
        yield* this.missingNodes(child);
      }
    }
  }

  async insertNodes(nodes: Iterable<NodeData>): Promise<DigestHex[]> {
    const result: DigestHex[] = [];
    for (const node of nodes) {
      const items = await Promise.all(node.items.map((item) => makeItem(item.key, item.value)));
      // Validation.
      const { digest } = await makeNode(node.level, items, node.children);
      invariant(digest === node.digest);

      this.#nodes.set(node.digest, {
        level: node.level,
        digest: node.digest,
        items,
        children: node.children,
      });
      result.push(node.digest);
    }
    return result;
  }

  async getNodes(digests: Iterable<DigestHex>): Promise<NodeData[]> {
    const result: NodeData[] = [];

    for (const digest of digests) {
      const node = this.#nodes.get(digest);
      if (!node) {
        continue;
      }
      result.push({
        level: node.level,
        digest: node.digest,
        items: node.items.map((item) => ({
          key: item.key,
          value: item.value,
        })),
        children: node.children,
      });
    }

    return result;
  }

  treeMut(root: DigestHex): TreeMut {
    return new TreeMut(this, root);
  }

  formatToString(digest: DigestHex, { pad = 0 }: { pad?: number } = {}): string {
    const padStr = '  '.repeat(pad);

    const node = this.#nodes.get(digest);
    if (!node) {
      return `${padStr} o (${digest.slice(0, 8)}) NOT AVAILABLE`;
    }

    let string = `${padStr} o (${digest.slice(0, 8)}) level=${node.level} size=${node.items.length}\n`;
    for (let i = 0; i < node.items.length; i++) {
      if (node.level > 0) {
        string += this.formatToString(node.children[i], { pad: pad + 1 });
      }
      string += `${padStr}   - [${node.items[i].itemDigest.slice(0, 8)}] level=${node.items[i].level} ${node.items[i].key.slice(0, 10)} -> ${arrayToHex(node.items[i].value.slice(0, 10).buffer)} \n`;
    }
    if (node.level > 0) {
      string += this.formatToString(node.children[node.items.length], { pad: pad + 1 });
    }
    return string;
  }

  /**
   * Items iterator ordered by key.
   */
  *items(digest: DigestHex): Iterable<Item> {
    const node = this.#requireNode(digest);
    for (let i = 0; i < node.items.length; i++) {
      if (node.level > 0) {
        yield* this.items(node.children[i]);
      }
      yield node.items[i];
    }
    if (node.level > 0) {
      yield* this.items(node.children[node.items.length]);
    }
  }

  #requireNode(digest: DigestHex): Node {
    invariant(validDigest(digest));
    const node = this.#nodes.get(digest);
    if (!node) {
      throw new Error(`Node not available: ${digest}`);
    }
    return node;
  }

  async #mergeItem(mergeFn: MergeFn, item1: Item | null, item2: Item | null): Promise<Item> {
    invariant(item1 !== null || item2 !== null);
    const key = (item1?.key ?? item2?.key)!;

    if (item1 !== null && item2 !== null && arraysEqual(item1.value, item2.value)) {
      return item1;
    } else {
      const mergeResult = await mergeFn(key, item1?.value ?? null, item2?.value ?? null);
      // console.log(
      //   `mergeFn ${key.slice(0, 10)} ${String(item1 ? arrayToHex(item1.value).slice(0, 10) : null).padStart(10)} ${String(item2 ? arrayToHex(item2.value).slice(0, 10) : null).padStart(10)} -> ${arrayToHex(mergeResult).slice(0, 10)}`,
      // );

      if (item1 !== null && arraysEqual(item1.value, mergeResult)) {
        return item1;
      } else if (item2 !== null && arraysEqual(item2.value, mergeResult)) {
        return item2;
      } else {
        this.itemHashOps++;
        return await makeItem(key, mergeResult);
      }
    }
  }

  #emptyNodeCache?: Promise<Node> = undefined;
  async #makeNode(level: number, items: Item[], children: DigestHex[]): Promise<DigestHex> {
    invariant(level > 0 ? items.length + 1 === children.length : children.length === 0);

    let node: Node;
    if (level === 0 && items.length === 0) {
      node = await (this.#emptyNodeCache ??= makeNode(0, [], []));
    } else {
      node = await makeNode(level, items, children);
      this.nodeHashOps++;
    }
    if (!this.#nodes.has(node.digest)) {
      this.#nodes.set(node.digest, node);
    }
    return node.digest;
  }

  async #splitAtKey(digest: DigestHex, key: Key): Promise<[left: DigestHex, right: DigestHex]> {
    const node = this.#requireNode(digest);

    let splitIndex = node.items.length;
    for (let i = 0; i < node.items.length; i++) {
      if (node.items[i].key === key) {
        return [
          await this.#makeNode(node.level, node.items.slice(0, i), node.children.slice(0, i + 1)),
          await this.#makeNode(node.level, node.items.slice(i + 1), node.children.slice(i + 2)),
        ];
      }

      if (node.items[i].key > key) {
        splitIndex = i;
        break;
      }
    }

    if (node.level === 0) {
      if (splitIndex === 0) {
        return [await this.#makeNode(0, [], []), digest];
      } else if (splitIndex === node.items.length) {
        return [digest, await this.#makeNode(0, [], [])];
      }
      return [
        await this.#makeNode(node.level, node.items.slice(0, splitIndex), []),
        await this.#makeNode(node.level, node.items.slice(splitIndex), []),
      ];
    } else {
      const [left, right] = await this.#splitAtKey(node.children[splitIndex], key);

      return [
        await this.#makeNode(node.level, node.items.slice(0, splitIndex), [
          ...node.children.slice(0, splitIndex),
          left,
        ]),
        await this.#makeNode(node.level, node.items.slice(splitIndex), [right, ...node.children.slice(splitIndex + 1)]),
      ];
    }
  }
}

export class TreeMut {
  readonly #forest: Forest;
  #root: DigestHex;

  constructor(forest: Forest, root: DigestHex) {
    this.#forest = forest;
    this.#root = root;
  }

  get root() {
    return this.#root;
  }

  async get(key: string): Promise<GetResult<Uint8Array>> {
    return this.#forest.get(this.#root, key);
  }

  async setBatch(pairs: Iterable<Pair>): Promise<void> {
    this.#root = await this.#forest.setBatch(this.#root, pairs);
  }

  async set(key: Key, value: Uint8Array): Promise<void> {
    this.#root = await this.#forest.set(this.#root, key, value);
  }

  items(): Iterable<Item> {
    return this.#forest.items(this.root);
  }
}

export type Key = string;

export type DigestHex = string & { __digestHex: true };

export type Pair = readonly [key: Key, value: Uint8Array];

export type GetResult<T> =
  | {
      kind: 'present';
      value: T;
    }
  | {
      kind: 'missing';
    }
  | {
      kind: 'not-available';
    };

export type MergeFn = (key: string, value1: Uint8Array | null, value2: Uint8Array | null) => Promise<Uint8Array>;

export type NodeData = {
  readonly level: number;

  readonly digest: DigestHex;
  /**
   * Sorted by key
   */
  readonly items: readonly ItemData[];
  /**
   * {items.length + 1} child digests.
   */
  readonly children: readonly DigestHex[];
};

export type ItemData = {
  readonly key: string;
  readonly value: Uint8Array;
};

/**
 * A Merkle-Search Tree node.
 * Contains variable number of items (key-value pairs).
 * Contains {items.length + 1} child nodes.
 * All items, including the ones in interleaving child nodes, are ordered base on the key.
 *
 * Items   :     (0)     (1)      (3)
 * Children:  [0]    [1]     [2]       [3]
 */
type Node = {
  readonly level: number;

  readonly digest: DigestHex;

  /**
   * Sorted by key
   */
  readonly items: readonly Item[];
  /**
   * {items.length + 1} child digests.
   */
  readonly children: readonly DigestHex[];
};

const makeNode = async (level: number, items: readonly Item[], children: readonly DigestHex[]): Promise<Node> => {
  invariant(level > 0 ? items.length + 1 === children.length : children.length === 0);

  // TODO(dmaretskyi): Hashing spec.
  const nodeInputData = textEncoder.encode(items.map((item) => item.itemDigest).join('') + children.join(''));
  const digest = await crypto.subtle.digest({ name: 'SHA-256' }, nodeInputData);
  return {
    level,
    digest: formatDigest(new Uint8Array(digest)) as DigestHex,
    items,
    children,
  };
};

type Item = {
  readonly level: number;
  readonly key: string;
  readonly value: Uint8Array;
  readonly keyDigest: DigestHex;
  readonly itemDigest: DigestHex;
};

const makeItem = async (key: string, value: Uint8Array): Promise<Item> => {
  invariant(typeof key === 'string');
  invariant(value !== null);
  // TODO(dmaretskyi): Hashing spec.
  const keyBytes = textEncoder.encode(key);
  const keyDigest = await crypto.subtle.digest({ name: 'SHA-256' }, keyBytes);
  const keyDigestHex = formatDigest(new Uint8Array(keyDigest)) as DigestHex;

  const data = new Uint8Array(keyBytes.length + value.length);
  data.set(keyBytes, 0);
  data.set(value, keyBytes.length);
  const itemDigest = await crypto.subtle.digest({ name: 'SHA-256' }, data);
  return {
    level: getLevelHex(keyDigestHex),
    key,
    value,
    keyDigest: keyDigestHex,
    itemDigest: formatDigest(new Uint8Array(itemDigest)) as DigestHex,
  };
};

const getKeyLevel = async (key: string): Promise<number> => {
  const keyBytes = textEncoder.encode(key);
  const keyDigest = await crypto.subtle.digest({ name: 'SHA-256' }, keyBytes);

  const keyDigestHex = formatDigest(new Uint8Array(keyDigest)) as DigestHex;

  return getLevelHex(keyDigestHex);
};

const textEncoder = new TextEncoder();

const validDigest = (digest: DigestHex) => typeof digest === 'string' && digest.length > 0;
