import { invariant } from '@dxos/invariant';
import { getLevel, makeItem, type Item } from './common';
import { Node } from './node';

export type Pair = readonly [key: string, value: Uint8Array];

/**
 * Not safe to mutate concurrently.
 */
export class Tree {
  static async build(pairs?: Iterable<Pair>): Promise<Tree> {
    const tree = new Tree();

    const itemPromises: Promise<Item>[] = [];
    if (pairs) {
      for (const pair of pairs) {
        itemPromises.push(makeItem(pair[0], pair[1]));
      }
    }
    for (const item of await Promise.all(itemPromises)) {
      tree.#set(item);
    }

    await tree.#root.calculateDigest();
    return tree;
  }

  #root = new Node(0);

  private constructor() {}

  get rootDigest(): Uint8Array {
    return this.#root.digest!;
  }

  get(key: string): Uint8Array | undefined {
    if (typeof key !== 'string') {
      throw new TypeError('key is not a string');
    }

    let node = this.#root;
    do {
      let found = false;
      for (let i = 0; i < node.size; i++) {
        if (key === node.items[i].key) {
          return node.items[i].value;
        } else if (key < node.items[i].key && node.level > 0) {
          node = node.children[i];
          found = true;
          break;
        }
      }
      if (!found && node.level > 0) {
        node = node.lastChild!;
      }
    } while (node.level > 0);
    return undefined;
  }

  async set(key: string, value: Uint8Array) {
    if (typeof key !== 'string') {
      throw new TypeError('key is not a string');
    }
    if (!(value instanceof Uint8Array)) {
      throw new TypeError('value is not a Uint8Array');
    }

    const item = await makeItem(key, value);
    this.#set(item);
    await this.#root.calculateDigest();
  }

  delete(key: string) {
    if (typeof key !== 'string') {
      throw new TypeError('key is not a string');
    }

    throw new Error('Not implemented');
  }

  *entries(): Generator<Pair> {
    yield* this.#root.entries();
  }

  formatToString() {
    return this.#root.formatToString({ pad: 0 });
  }

  #set(item: Item) {
    const level = getLevel(item.digest);

    if (level > this.#root.level) {
      // The new items requires us to make the tree taller.
      let left = this.#root;
      let right = left.splitAt(item.key);

      // Insert intermediate nodes if we are not at the right level yet.
      while (level > left.level + 1) {
        left = left.grow();
        right = right.grow();
      }

      this.#root = new Node(level);
      invariant(left.level === right.level);
      invariant(this.#root.level === left.level + 1);
      invariant(this.#root.level === level);
      this.#root.items.push(item);
      this.#root.children.push(left, right);
    } else {
      // The new items will be inserted in one of the existing pages.
      let node = this.#root;
      while (node.level > level) {
        // Mark nodes dirty along the way.
        node.dirty = true;
        node = node.getChild(item.key);
      }

      node.set(item);
    }
  }
}
