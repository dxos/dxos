//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Key, Obj, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

// TODO(burdon): Reconcile with @dxos/graph (i.e., common types).

export const TreeNodeType = Schema.Struct({
  id: Key.ObjectId,
  children: Schema.mutable(Schema.Array(Key.ObjectId)),
  data: Schema.mutable(Schema.Record({ key: Schema.String, value: Schema.Any })),
  ref: Schema.optional(Type.Ref(Type.Expando)),
}).pipe(Schema.mutable);

export interface TreeNodeType extends Schema.Schema.Type<typeof TreeNodeType> {}

export const TreeType = Schema.Struct({
  root: Key.ObjectId,
  nodes: Schema.mutable(Schema.Record({ key: Key.ObjectId, value: TreeNodeType })),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Tree',
    version: '0.1.0',
  }),
);

export interface TreeType extends Schema.Schema.Type<typeof TreeType> {}

/**
 * Wrapper object for tree.
 */
export class Tree {
  static create = (): TreeType => {
    const id = Key.ObjectId.random();
    return Obj.make(TreeType, {
      root: id,
      nodes: {
        [id]: {
          id,
          children: [],
          data: { text: '' }, // TODO(burdon): Generic.
        },
      },
    });
  };

  private _tree: TreeType;

  constructor(tree?: TreeType) {
    this._tree = tree ?? Tree.create();
  }

  get tree() {
    return this._tree;
  }

  // TODO(burdon): Make reactive.
  get size() {
    return Object.keys(this._tree.nodes).length;
  }

  get root() {
    return this.getNode(this._tree.root);
  }

  //
  // Traversal
  //

  /**
   * Recursively traverse the tree until the callback returns a value.
   */
  tranverse<T>(
    callback: (node: TreeNodeType, depth: number) => T | void,
    root: Key.ObjectId = this._tree.root,
    depth = 0,
  ): T | void {
    const node = this._tree.nodes[root];
    const result = callback(node, depth);
    if (result !== undefined) {
      return result;
    }

    for (const childId of node.children) {
      const result = this.tranverse(callback, childId, depth + 1);
      if (result !== undefined) {
        return result;
      }
    }
  }

  getNode(id: Key.ObjectId): TreeNodeType {
    const node = this._tree.nodes[id];
    invariant(node);
    return node;
  }

  /**
   * Get the children of a node.
   */
  getChildNodes(node: TreeNodeType): Array<TreeNodeType> {
    return node.children.map((id) => this.getNode(id));
  }

  /**
   * Get the parent of a node.
   */
  getParent(node: TreeNodeType): TreeNodeType | null {
    const parent = this.tranverse((n) => {
      if (n.children.includes(node.id)) {
        return n;
      }
    });

    return parent ?? null;
  }

  /**
   * Get the next node in the tree.
   */
  getNext(node: TreeNodeType, hierarchical = true): TreeNodeType | undefined {
    if (hierarchical && node.children.length) {
      // First child.
      return this.getChildNodes(node)[0];
    } else {
      const parent = this.getParent(node);
      if (parent) {
        const idx = this.getChildNodes(parent).findIndex(({ id }) => id === node.id);
        if (idx < parent.children.length - 1) {
          // Next sibling.
          return this.getNode(parent.children[idx + 1]);
        } else {
          // Get parent's next sibling.
          return this.getNext(parent, false);
        }
      }
    }
  }

  /**
   * Get the previous node in the tree.
   */
  getPrevious(node: TreeNodeType, hierarchical = true): TreeNodeType | undefined {
    const parent = this.getParent(node)!;
    const idx = this.getChildNodes(parent).findIndex(({ id }) => id === node.id);
    if (idx === 0) {
      if (hierarchical) {
        return parent;
      }
    } else {
      const previous = this.getNode(parent.children[idx - 1]);
      if (hierarchical && previous.children.length) {
        return this.getLastDescendent(previous);
      }

      return previous;
    }
  }

  /**
   * Get the last descendent of a node.
   */
  getLastDescendent(node: TreeNodeType): TreeNodeType | undefined {
    const children = this.getChildNodes(node);
    const last = children.length ? children[children.length - 1] : undefined;
    if (last) {
      return this.getLastDescendent(last);
    }

    return node;
  }

  //
  // Mutations
  //

  /**
   * Clear tree.
   */
  clear(): void {
    const root = this._tree.nodes[this._tree.root];
    root.children.length = 0;
    this._tree.nodes = {
      [root.id]: root,
    };
  }

  /**
   * Add node.
   */
  addNode(parent: TreeNodeType, node?: TreeNodeType, index?: number): TreeNodeType {
    if (!node) {
      const id = Key.ObjectId.random();
      node = { id, children: [], data: { text: '' } }; // TODO(burdon): Generic.
    }

    this._tree.nodes[node.id] = node;
    parent.children.splice(index ?? parent.children.length, 0, node.id);
    return node;
  }

  /**
   * Delete node.
   */
  deleteNode(parent: TreeNodeType, id: Key.ObjectId): TreeNodeType | undefined {
    const node = this._tree.nodes[id];
    if (!node) {
      return undefined;
    }

    delete this._tree.nodes[node.id];
    const idx = parent.children.findIndex((child) => child === id);
    if (idx !== -1) {
      parent.children.splice(idx, 1);
    }

    return node;
  }

  /**
   * Move child node.
   */
  moveNode(node: TreeNodeType, from: number, to: number): TreeNodeType | null {
    invariant(from >= 0 && from < node.children.length);
    invariant(to >= 0 && to < node.children.length);
    if (from === to) {
      return null;
    }

    const child = node.children[from];
    node.children.splice(from, 1);
    node.children.splice(to, 0, child);
    return this.getNode(child);
  }

  /**
   * Indent node.
   */
  indentNode(node: TreeNodeType): void {
    const parent = this.getParent(node);
    if (!parent) {
      return;
    }

    const idx = parent.children.findIndex((child) => child === node.id);
    if (idx < 1 || idx >= parent.children.length) {
      return;
    }

    const previous = this.getNode(parent.children[idx - 1]);
    parent.children.splice(idx, 1);
    previous.children.push(node.id);
  }

  /**
   * Unindent node.
   */
  unindentNode(node: TreeNodeType): void {
    const parent = this.getParent(node);
    if (!parent) {
      return;
    }

    const ancestor = this.getParent(parent);
    if (!ancestor) {
      return;
    }

    // Remove node from parent.
    const nodeIdx = parent.children.findIndex((id) => id === node.id);
    const [_, ...rest] = parent.children.splice(nodeIdx, parent.children.length - nodeIdx);
    parent.children.splice(nodeIdx, parent.children.length - nodeIdx);

    // Add to ancestor.
    const parentIdx = this.getChildNodes(ancestor).findIndex((n) => n.id === parent.id);
    ancestor.children.splice(parentIdx + 1, 0, node.id);

    // Transplant following siblings to current node.
    node.children.push(...rest);
  }
}
