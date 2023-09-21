//
// Copyright 2023 DXOS.org
//

import { deepSignal } from 'deepsignal/react';
import get from 'lodash.get';

import { Graph } from './types';

/**
 * The Graph represents...
 */
// TODO(burdon): Rename Graph (remove interface).
export class GraphImpl {
  // TODO(burdon): Document.
  // TODO(wittjosiah): Should this support multiple paths to the same node?
  private readonly _index = deepSignal<{ [key: string]: string[] }>({});

  constructor(private readonly _root: Graph.Node) {}

  // TODO(burdon): Traverse.
  toJSON() {
    const toJSON = (node: Graph.Node): any => {
      return {
        // TODO(burdon): Standardize ids on type/id/x/y (use slashes).
        id: node.id.slice(0, 16),
        label: node.label,
        children: node.children.length ? node.children.map((node) => toJSON(node)) : undefined,
        actions: node.actions.length
          ? node.actions.map(({ id, label }) => ({
              id,
              label,
            }))
          : undefined,
      };
    };

    return toJSON(this._root);
  }

  get root(): Graph.Node {
    return this._root;
  }

  getPath(id: string): string[] | undefined {
    return this._index[id];
  }

  setPath(id: string, path: string[]) {
    this._index[id] = path;
  }

  findNode(id: string): Graph.Node | undefined {
    const path = this.getPath(id);
    if (!path) {
      return undefined;
    }

    return path.length > 0 ? get(this._root, path) : this._root;
  }

  /**
   * Recursive breadth-first traversal.
   */
  traverse({ node = this._root, direction = 'down', filter, visitor }: Graph.TraversalOptions, depth = 0): void {
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
