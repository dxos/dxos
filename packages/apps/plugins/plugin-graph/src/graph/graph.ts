//
// Copyright 2023 DXOS.org
//

import get from 'lodash.get';

import { Graph, GraphActionBuilder, GraphNode, GraphNodeActions, GraphNodeBuilder, GraphNodeChildren } from './types';

export class SessionGraph implements Graph {
  private readonly _root: GraphNode<null> = {
    id: 'root',
    data: null,
    parent: null,
    attributes: {},
    children: {},
    actions: {},
  };

  private readonly _nodeBuilders = new Map<string, GraphNodeBuilder>();
  private readonly _actionBuilders = new Map<string, GraphActionBuilder>();

  // TODO(wittjosiah): Should this support multiple paths to the same node?
  private readonly _index = new Map<string, string[]>();

  get root(): GraphNode<any> {
    return this._root;
  }

  find(id: string): GraphNode<any> | undefined {
    const path = this._index.get(id);
    if (!path) {
      return undefined;
    }

    return path.length > 0 ? get(this._root, path) : this._root;
  }

  registerNodeBuilder(id: string, builder: GraphNodeBuilder): void {
    this._nodeBuilders.set(id, builder);
  }

  registerActionBuilder(id: string, builder: GraphActionBuilder): void {
    this._actionBuilders.set(id, builder);
  }

  removeNodeBuilder(id: string): void {
    this._nodeBuilders.delete(id);
  }

  removeActionBuilder(id: string): void {
    this._actionBuilders.delete(id);
  }

  invalidate(id: string): void {
    const node = this.find(id);
    const path = this._index.get(id);
    this.construct(node, path);
  }

  construct(from = this._root, path: string[] = []): void {
    this._index.set(from.id, path);

    from.children = Array.from(this._nodeBuilders.entries()).reduce((acc, [id, builder]) => {
      const nodes = builder(from).reduce((acc, node) => {
        return { ...acc, [`${id}:${node.id}`]: node };
      }, {} as GraphNodeChildren);

      return { ...acc, ...nodes };
    }, {} as GraphNodeChildren);

    from.actions = Array.from(this._actionBuilders.entries()).reduce((acc, [id, builder]) => {
      const actions = builder(from).reduce((acc, action) => {
        return { ...acc, [`${id}:${action.id}`]: action };
      }, {} as GraphNodeActions);

      return { ...acc, ...actions };
    }, {} as GraphNodeActions);

    Object.entries(from.children).forEach(([id, node]) => {
      this.construct(node, [...path, 'children', id]);
    });
  }
}
