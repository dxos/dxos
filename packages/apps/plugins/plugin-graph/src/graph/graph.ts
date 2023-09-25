//
// Copyright 2023 DXOS.org
//

import { deepSignal } from 'deepsignal/react';
import get from 'lodash.get';

import { Label, Node, TraversalOptions } from './types';

/**
 * The Graph represents...
 */
export class Graph {
  // TODO(burdon): Document.
  // TODO(wittjosiah): Should this support multiple paths to the same node?
  private readonly _index = deepSignal<{ [key: string]: string[] }>({});

  constructor(private readonly _root: Node) {}

  // TODO(burdon): Traverse.
  toJSON() {
    const toLabel = (label: Label) => (Array.isArray(label) ? `${label[1].ns}[${label[0]}]` : label);
    const toJSON = (node: Node): any => {
      return {
        // TODO(burdon): Standardize ids on type/id/x/y (use slashes).
        id: node.id.slice(0, 16),
        label: toLabel(node.label),
        children: node.children.length ? node.children.map((node) => toJSON(node)) : undefined,
        actions: node.actions.length
          ? node.actions.map(({ id, label, intent }) => ({
              id,
              label: toLabel(label),
              intent: Array.isArray(intent) ? intent.map(({ action }) => ({ action })) : intent?.action,
            }))
          : undefined,
      };
    };

    return toJSON(this._root);
  }

  /**
   * The root node of the graph which is the entry point for all knowledge.
   */
  get root(): Node {
    return this._root;
  }

  /**
   * Get the path through the graph from the root to the node with the given id.
   */
  getPath(id: string): string[] | undefined {
    return this._index[id];
  }

  /**
   * @internal
   */
  _setPath(id: string, path: string[]) {
    this._index[id] = path;
  }

  /**
   * Find the node with the given id in the graph.
   */
  findNode(id: string): Node | undefined {
    const path = this.getPath(id);
    if (!path) {
      return undefined;
    }

    return path.length > 0 ? get(this._root, path) : this._root;
  }

  /**
   * Recursive breadth-first traversal.
   */
  traverse({ node = this._root, direction = 'down', filter, visitor }: TraversalOptions, depth = 0): void {
    if (!filter || filter(node)) {
      visitor?.(node);
    }

    if (direction === 'down') {
      Object.values(node.children).forEach((child) => this.traverse({ node: child, filter, visitor }));
    } else if (direction === 'up' && node.parent) {
      this.traverse({ node: node.parent, direction, filter, visitor }, depth + 1);
    }
  }
}
