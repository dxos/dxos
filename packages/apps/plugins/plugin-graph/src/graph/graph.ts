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
export class GraphStore {
  // TODO(burdon): Document.
  // TODO(wittjosiah): Should this support multiple paths to the same node?
  private readonly _index = deepSignal<{ [key: string]: string[] }>({});

  constructor(private readonly _root: Graph.Node) {}

  // TODO(burdon): Traverse.
  // toJSON() {}

  get root(): Graph.Node {
    return this._root;
  }

  getPath(id: string): string[] | undefined {
    return this._index[id];
  }

  findNode(id: string): Graph.Node | undefined {
    const path = this.getPath(id);
    if (!path) {
      return undefined;
    }

    return path.length > 0 ? get(this._root, path) : this._root;
  }

  traverse({ from = this._root, direction = 'down', predicate, onVisitNode }: Graph.TraverseOptions): void {
    if (!predicate || predicate(from)) {
      onVisitNode?.(from);
    }

    if (direction === 'down') {
      Object.values(from.children).forEach((child) => this.traverse({ from: child, predicate, onVisitNode }));
    } else if (direction === 'up' && from.parent) {
      this.traverse({ from: from.parent, direction, predicate, onVisitNode });
    }
  }
}
