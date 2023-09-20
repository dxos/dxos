//
// Copyright 2023 DXOS.org
//

import { RevertDeepSignal, deepSignal } from 'deepsignal/react';
import get from 'lodash.get';

import { SendIntent } from '@braneframe/plugin-intent';
import { EventSubscriptions } from '@dxos/async';

import { Graph } from './types';

/**
 *
 */
export class GraphStore implements Graph {
  private readonly _nodeBuilders = new Set<Graph.NodeBuilder>();
  private readonly _unsubscribe = new Map<string, EventSubscriptions>();

  private readonly _root: Graph.Node = this._createNode({ id: 'root', label: 'Root' });
  // TODO(wittjosiah): Should this support multiple paths to the same node?
  private readonly _index = deepSignal<{ [key: string]: string[] }>({});

  private _sendIntent?: SendIntent;

  get root(): Graph.Node {
    return this._root;
  }

  getPath(id: string): string[] | undefined {
    return this._index[id];
  }

  find(id: string): Graph.Node | undefined {
    const path = this._index[id];
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

  registerNodeBuilder(builder: Graph.NodeBuilder): void {
    this._nodeBuilders.add(builder);
  }

  removeNodeBuilder(builder: Graph.NodeBuilder): void {
    this._nodeBuilders.delete(builder);
  }

  // TODO(burdon): Separate builder from Graph interface.
  construct(from = this._root as Graph.Node, path: string[] = [], ignoreBuilders: Graph.NodeBuilder[] = []): void {
    this._index[from.id] = path;
    const subscriptions = this._unsubscribe.get(from.id) ?? new EventSubscriptions();
    subscriptions.clear();
    Array.from(this._nodeBuilders.values())
      .filter((builder) => ignoreBuilders.findIndex((ignore) => ignore === builder) === -1)
      .forEach((builder) => {
        const unsubscribe = builder(this._filterBuilders(from, path, [...ignoreBuilders, builder]));
        unsubscribe && subscriptions.add(unsubscribe);
      });

    this._unsubscribe.set(from.id, subscriptions);
  }

  // Updates a Node's add method to filter out builders that have already been applied.
  private _filterBuilders(node: Graph.Node, path: string[], ignoreBuilders: Graph.NodeBuilder[]): Graph.Node {
    const builderNode = deepSignal({
      ...node,
      add: (...partials) => {
        return partials.map((partial) => {
          const childPath = [...path, 'childrenMap', partial.id];
          const child = this._createNode({ ...partial, parent: builderNode }, childPath, ignoreBuilders);
          builderNode.childrenMap[child.id] = child;
          this.construct(child, childPath, ignoreBuilders);
          return child;
        });
      },
    }) as RevertDeepSignal<Graph.Node>;

    return builderNode;
  }

  private _createNode<TData = null, TProperties extends { [key: string]: any } = { [key: string]: any }>(
    partial: Pick<Graph.Node, 'id' | 'label'> & Partial<Graph.Node<TData, TProperties>>,
    path: string[] = [],
    ignoreBuilders: Graph.NodeBuilder[] = [],
  ): Graph.Node<TData, TProperties> {
    const node: Graph.Node<TData, TProperties> = deepSignal({
      data: null as TData,
      parent: null,
      properties: {} as TProperties,
      childrenMap: {},
      actionsMap: {},
      ...partial,
      // TODO(wittjosiah): Default sort.
      get children() {
        return Object.values(node.childrenMap);
      },
      get actions() {
        return Object.values(node.actionsMap);
      },
      // TODO(burdon): Rename addNode (distinguish from addAction).
      add: (...partials) => {
        return partials.map((partial) => {
          const childPath = [...path, 'childrenMap', partial.id];
          const child = this._createNode({ ...partial, parent: node }, childPath, ignoreBuilders);
          node.childrenMap[child.id] = child;
          this.construct(child, childPath, ignoreBuilders);
          return child;
        });
      },
      remove: (id) => {
        const child = node.childrenMap[id];
        delete node.childrenMap[id];
        return child;
      },
      addAction: (...partials) => {
        return partials.map((partial) => {
          const action = this._createAction(partial);
          node.actionsMap[action.id] = action;
          return action;
        });
      },
      removeAction: (id) => {
        const action = node.actionsMap[id];
        delete node.actionsMap[id];
        return action;
      },
      addProperty: (key, value) => {
        (node.properties as { [key: string]: any })[key] = value;
      },
      removeProperty: (key) => {
        delete (node.properties as { [key: string]: any })[key];
      },
    }) as RevertDeepSignal<Graph.Node<TData, TProperties>>;

    return node;
  }

  private _createAction<TProperties extends { [key: string]: any } = { [key: string]: any }>(
    partial: Pick<Graph.Action, 'id' | 'label'> & Partial<Graph.Action<TProperties>>,
  ): Graph.Action<TProperties> {
    const action: Graph.Action<TProperties> = deepSignal({
      properties: {} as TProperties,
      actionsMap: {},
      ...partial,
      // TODO(wittjosiah): Default sort.
      get actions() {
        return Object.values(action.actionsMap);
      },
      invoke: async () => {
        if (Array.isArray(action.intent)) {
          return this._sendIntent?.(...action.intent);
        } else if (action.intent) {
          return this._sendIntent?.(action.intent);
        }
      },
      add: (...partials) => {
        return partials.map((partial) => {
          const subAction = this._createAction(partial);
          action.actionsMap[subAction.id] = subAction;
          return subAction;
        });
      },
      remove: (id) => {
        const subAction = action.actionsMap[id];
        delete action.actionsMap[id];
        return subAction;
      },
      addProperty: (key, value) => {
        (action.properties as { [key: string]: any })[key] = value;
      },
      removeProperty: (key) => {
        delete (action.properties as { [key: string]: any })[key];
      },
    }) as RevertDeepSignal<Graph.Action<TProperties>>;

    return action;
  }

  /**
   * @internal
   */
  _setSendIntent(sendIntent?: SendIntent) {
    this._sendIntent = sendIntent;
  }
}
