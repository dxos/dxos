//
// Copyright 2023 DXOS.org
//

import get from 'lodash.get';

import { Graph } from './types';

export class SessionGraph implements Graph {
  private readonly _root = this._createNode({ id: 'root' });
  private readonly _nodeBuilders = new Set<Graph.NodeBuilder>();
  // TODO(wittjosiah): Should this support multiple paths to the same node?
  private readonly _index = new Map<string, string[]>();

  get root(): Graph.Node {
    return this._root;
  }

  find(id: string): Graph.Node | undefined {
    const path = this._index.get(id);
    if (!path) {
      return undefined;
    }

    return path.length > 0 ? get(this._root, path) : this._root;
  }

  traverse({ from = this._root, predicate, onVisitNode }: Graph.TraverseOptions): void {
    if (!predicate || predicate(from)) {
      onVisitNode?.(from);
    }

    Object.values(from.children).forEach((child) => this.traverse({ from: child, predicate, onVisitNode }));
  }

  registerNodeBuilder(builder: Graph.NodeBuilder): void {
    this._nodeBuilders.add(builder);
  }

  removeNodeBuilder(builder: Graph.NodeBuilder): void {
    this._nodeBuilders.delete(builder);
  }

  construct(from = this._root as Graph.Node, path: string[] = [], ignoreBuilders: Graph.NodeBuilder[] = []): void {
    this._index.set(from.id, path);
    Array.from(this._nodeBuilders.values())
      .filter((builder) => ignoreBuilders.findIndex((ignore) => ignore === builder) === -1)
      .forEach((builder) => {
        (from as any).__currentBuilder = builder;
        builder(from);
      });
  }

  private _createNode<TData = null, TProperties extends { [key: string]: any } = { [key: string]: any }>(
    partial: Pick<Graph.Node, 'id'> & Partial<Graph.Node<TData, TProperties>>,
    path: string[] = [],
    ignoreBuilders: Graph.NodeBuilder[] = [],
  ): Graph.Node<TData, TProperties> {
    const node: Graph.Node<TData, TProperties> = {
      data: null as TData,
      parent: null,
      properties: {} as TProperties,
      children: {},
      actions: {},
      ...partial,
      add: (partial) => {
        const childPath = [...path, 'children', partial.id];
        // Track builders used through a graph path to limit how many times a builder can be used.
        // TODO(wittjosiah): Is there a better way to do this without degrading the api?
        const childBuilders = [...ignoreBuilders, (node as any).__currentBuilder];
        const child = this._createNode({ ...partial, parent: node }, childPath, childBuilders);
        node.children[child.id] = child;
        this.construct(child, childPath, childBuilders);
        return child;
      },
      remove: (id) => {
        const child = node.children[id];
        delete node.children[id];
        return child;
      },
      addAction: (action) => {
        node.actions[action.id] = action;
        return action;
      },
      removeAction: (id) => {
        const action = node.actions[id];
        delete node.actions[id];
        return action;
      },
      addProperty: (key, value) => {
        (node.properties as { [key: string]: any })[key] = value;
      },
      removeProperty: (key) => {
        delete (node.properties as { [key: string]: any })[key];
      },
    };

    return node;
  }
}
