//
// Copyright 2023 DXOS.org
//

import { RevertDeepSignal, deepSignal } from 'deepsignal/react';

import { SendIntent } from '@braneframe/plugin-intent';
import { EventSubscriptions } from '@dxos/async';

import { GraphStore } from './graph';
import { Graph } from './types';

/**
 * The builder...
 */
export class GraphBuilder {
  private readonly _nodeBuilders = new Set<Graph.NodeBuilder>();
  private readonly _unsubscribe = new Map<string, EventSubscriptions>();

  private _sendIntent?: SendIntent;

  addNodeBuilder(builder: Graph.NodeBuilder): void {
    this._nodeBuilders.add(builder);
  }

  removeNodeBuilder(builder: Graph.NodeBuilder): void {
    this._nodeBuilders.delete(builder);
  }

  /**
   * Constructs a new Graph object.
   * @param root
   * @param path
   * @param ignoreBuilders
   */
  // TODO(burdon): Document ignoreBuilders.
  build(root?: Graph.Node, path: string[] = [], ignoreBuilders: Graph.NodeBuilder[] = []): GraphStore {
    const graph = new GraphStore(root ?? this._createNode({ id: 'root', label: 'Root' }));
    return this._build(graph, graph.root, path, ignoreBuilders);
  }

  /**
   * Called recursively.
   */
  private _build(
    graph: GraphStore,
    node: Graph.Node,
    path: string[] = [],
    ignoreBuilders: Graph.NodeBuilder[] = [],
  ): GraphStore {
    // TODO(wittjosiah): Should this support multiple paths to the same node?
    graph.setPath(node.id, path);

    // TODO(burdon): Document.
    const subscriptions = this._unsubscribe.get(node.id) ?? new EventSubscriptions();
    subscriptions.clear();

    Array.from(this._nodeBuilders.values())
      .filter((builder) => ignoreBuilders.findIndex((ignore) => ignore === builder) === -1)
      .forEach((builder) => {
        const unsubscribe = builder(this._filterBuilders(graph, node, path, [...ignoreBuilders, builder]));
        unsubscribe && subscriptions.add(unsubscribe);
      });

    this._unsubscribe.set(node.id, subscriptions);

    return graph;
  }

  /**
   * Updates the Node's add method to filter out builders that have already been applied.
   */
  // TODO(burdon): Explain why this is needed.
  private _filterBuilders(
    graph: GraphStore,
    node: Graph.Node,
    path: string[],
    ignoreBuilders: Graph.NodeBuilder[],
  ): Graph.Node {
    const builderNode = deepSignal({
      ...node,
      addNode: (...partials) => {
        return partials.map((partial) => {
          const childPath = [...path, 'childrenMap', partial.id];
          const child = this._createNode({ ...partial, parent: builderNode }, childPath, ignoreBuilders);
          builderNode.childrenMap[child.id] = child;
          this._build(graph, child, childPath, ignoreBuilders);
          return child;
        });
      },
    }) as RevertDeepSignal<Graph.Node>;

    return builderNode;
  }

  private _createNode<TData = null, TProperties extends Record<string, any> = {}>(
    partial: Pick<Graph.Node, 'id' | 'label'> & Partial<Graph.Node<TData, TProperties>>,
    path: string[] = [],
    ignoreBuilders: Graph.NodeBuilder[] = [],
  ): Graph.Node<TData, TProperties> {
    // TODO(burdon): Document implications and rationale of deepSignal.
    const node: Graph.Node<TData, TProperties> = deepSignal({
      parent: null,
      data: null as TData, // TODO(burdon): Allow null property?
      properties: {} as TProperties,
      childrenMap: {},
      actionsMap: {},
      // TODO(burdon): Document.
      ...partial,

      // TODO(wittjosiah): Default sort.
      get children() {
        return Object.values(node.childrenMap);
      },
      get actions() {
        return Object.values(node.actionsMap);
      },

      addProperty: (key, value) => {
        (node.properties as { [key: string]: any })[key] = value;
      },
      removeProperty: (key) => {
        delete (node.properties as { [key: string]: any })[key];
      },

      addNode: (...partials) => {
        return partials.map((partial) => {
          const childPath = [...path, 'childrenMap', partial.id];
          const child = this._createNode({ ...partial, parent: node }, childPath, ignoreBuilders);
          node.childrenMap[child.id] = child;
          this.build(child, childPath, ignoreBuilders);
          return child;
        });
      },
      removeNode: (id) => {
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
  // TODO(burdon): Document.
  _setSendIntent(sendIntent?: SendIntent) {
    this._sendIntent = sendIntent;
  }
}
