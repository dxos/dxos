import { invariant } from '@dxos/invariant';
import { formatDigest, getLevel, type Item } from './common';
import type { Pair } from './tree';

/**
 * A Merkle-Search Tree node.
 * Contains variable number of items (key-value pairs).
 * Contains {items.length + 1} child nodes.
 * All items, including the ones in interleaving child nodes, are ordered base on the key.
 *
 * Items   :     (0)     (1)
 * Children:  [0]    [1]     [2]
 */
export class Node {
  /**
   * Level in the tree, 0 being the bottom most.
   */
  level: number;
  items: Item[] = [];
  /**
   * Contains {items.length + 1} child nodes.
   * Empty for level-0 nodes.
   */
  children: Node[] = [];

  /**
   * Node is initially dirty -- digest not calculated.
   */
  dirty = true;
  digest: Uint8Array | undefined = undefined;

  stub = false;

  constructor(level: number) {
    this.level = level;
  }

  get size() {
    return this.items.length;
  }

  /**
   * Right-most child node.
   */
  get lastChild(): Node | undefined {
    return this.children.at(-1);
  }

  insertionIndex(key: string) {
    for (let i = 0; i < this.size; i++) {
      if (this.items[i].key >= key) {
        return i;
      }
    }
    return this.items.length;
  }

  /**
   * Returns a child node with a range containing this key.
   * @param key
   */
  getChild(key: string): Node {
    for (let i = 0; i < this.size; i++) {
      if (key < this.items[i].key) {
        return this.children[i];
      }
    }
    return this.lastChild!;
  }

  *entries(): Generator<Pair> {
    for (let i = 0; i < this.size; i++) {
      if (this.level > 0) {
        yield* this.children[i].entries();
      }
      yield [this.items[i].key, this.items[i].value];
    }
    if (this.level > 0) {
      yield* this.lastChild!.entries();
    }
  }

  *traverse(): Generator<Node, undefined, undefined> {
    yield this;
    yield* this.children;
  }

  /**
   * Sets or inserts the item at the right location, potentially splitting child pages.
   *
   * Items   :     (0)   *1   (1)
   * Children:  [0]     [1]      [2]
   *
   * Items   :     (0)     (1*)    (1)
   * Children:  [0]     [1]    [1*]    [2]
   */
  set(item: Item) {
    const index = this.insertionIndex(item.key);
    if (index < this.items.length && this.items[index].key === item.key) {
      // Replace existing item.
      this.items[index] = item;
    } else {
      this.items.splice(index, 0, item);
      if (this.level > 0) {
        const newNode = this.children[index].splitAt(item.key);
        this.children.splice(index + 1, 0, newNode);
      }
    }
    this.dirty = true;
  }

  /**
   * Moves all items and children that are greater then `key` to a new node and returns it.
   *
   * Items   :     (0)   |   (1)
   * Children:  [0]     [1]      [2]
   *
   * Items   :     (0)     |    (1)
   * Children:  [0]      [1|1*]     [2]
   *
   * Items   :      (0)      |      (0)
   * Children:  [0]     [1]  |  [0]     [1]
   */
  splitAt(key: string): Node {
    const splitAt = this.insertionIndex(key);
    // Key we are splitting by cannot be located at this node -- would have to be located at a higher level.
    if (splitAt !== this.size) {
      invariant(this.items[splitAt].key !== key);
    }

    // Split items of the current node.
    const newNode = new Node(this.level);
    newNode.items = this.items.splice(splitAt, this.items.length - splitAt);

    // Recursively split the child node in the middle
    if (newNode.level > 0) {
      newNode.children = this.children.splice(splitAt, this.children.length - splitAt);

      invariant(newNode.children.length > 0);
      const left = newNode.children[0];
      const right = left.splitAt(key);

      this.children.push(left);
      newNode.children[0] = right;

      invariant(this.children.length == this.items.length + 1);
      invariant(newNode.children.length == newNode.items.length + 1);
    }

    this.dirty = true;
    newNode.dirty = true;

    if (this.size > 0) {
      invariant(this.items.at(-1)!.key < key);
    }
    if (newNode.size > 0) {
      invariant(key < newNode.items[0].key);
    }
    return newNode;
  }

  /**
   * Creates a new node one level higher then the current one with the sole child being this node.
   */
  grow(): Node {
    const newNode = new Node(this.level + 1);
    newNode.children.push(this);
    return newNode;
  }

  async calculateDigest() {
    if (!this.dirty) {
      return;
    }

    await Promise.all(this.children.map((child) => child.calculateDigest()));

    const dataLength =
      this.items.reduce((acc, item) => acc + item.digest.length, 0) +
      this.children.reduce((acc, child) => acc + child.digest!.length, 0);
    const data = new Uint8Array(dataLength);
    let pos = 0;
    for (const item of this.items) {
      data.set(item.digest!, pos);
      pos += item.digest!.length;
    }
    for (const child of this.children) {
      data.set(child.digest!, pos);
      pos += child.digest!.length;
    }

    const digest = await crypto.subtle.digest({ name: 'SHA-256' }, data);
    this.digest = new Uint8Array(digest);
    this.dirty = false;
  }

  formatToString({ pad }: { pad: number }) {
    const padStr = '  '.repeat(pad);
    let string = `${padStr} o (${formatDigest(this.digest!).slice(0, 8)}) level=${this.level} size=${this.size}\n`;
    for (let i = 0; i < this.size; i++) {
      if (this.level > 0) {
        string += this.children[i].formatToString({ pad: pad + 1 });
      }
      string += `${padStr}   - [${formatDigest(this.items[i].digest).slice(0, 8)}] ${this.items[i].key} level=${getLevel(this.items[i].digest)}\n`;
    }
    if (this.level > 0) {
      string += this.lastChild!.formatToString({ pad: pad + 1 });
    }
    return string;
  }
}
