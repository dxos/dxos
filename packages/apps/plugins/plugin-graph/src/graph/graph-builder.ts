//
// Copyright 2023 DXOS.org
//

import { untracked } from '@preact/signals-react';
import { RevertDeepSignal, deepSignal } from 'deepsignal/react';

import { SendIntent } from '@braneframe/plugin-intent';
import { EventSubscriptions } from '@dxos/async';

import { GraphImpl } from './graph';
import { Graph } from './types';

/**
 * The builder...
 */
export class GraphBuilder {
  private readonly _nodeBuilders = new Map<string, Graph.NodeBuilder>();
  private readonly _unsubscribe = new Map<string, EventSubscriptions>();

  private _sendIntent?: SendIntent;

  addNodeBuilder(id: string, builder: Graph.NodeBuilder): void {
    this._nodeBuilders.set(id, builder);
  }

  removeNodeBuilder(id: string): void {
    this._nodeBuilders.delete(id);
  }

  /**
   * Constructs a new Graph object.
   * @param root
   * @param path
   * @param ignoreBuilders
   */
  // TODO(burdon): Document ignoreBuilders.
  build(root?: Graph.Node, path: string[] = [], ignoreBuilders: string[] = []): GraphImpl {
    const graph: GraphImpl = new GraphImpl(root ?? this._createNode(() => graph, { id: 'root', label: 'Root' }));
    return this._build(graph, graph.root, path, ignoreBuilders);
  }

  /**
   * Called recursively.
   */
  private _build(graph: GraphImpl, node: Graph.Node, path: string[] = [], ignoreBuilders: string[] = []): GraphImpl {
    // TODO(wittjosiah): Should this support multiple paths to the same node?
    graph.setPath(node.id, path);

    // TODO(burdon): Document.
    const subscriptions = this._unsubscribe.get(node.id) ?? new EventSubscriptions();
    subscriptions.clear();

    Array.from(this._nodeBuilders.entries())
      .filter(([id]) => ignoreBuilders.findIndex((ignore) => ignore === id) === -1)
      .forEach(([_, builder]) => {
        const unsubscribe = builder(node);
        unsubscribe && subscriptions.add(unsubscribe);
      });

    this._unsubscribe.set(node.id, subscriptions);

    return graph;
  }

  private _createNode<TData = null, TProperties extends Record<string, any> = Record<string, any>>(
    getGraph: () => GraphImpl,
    partial: Pick<Graph.Node, 'id' | 'label'> & Partial<Graph.Node<TData, TProperties>>,
    path: string[] = [],
    ignoreBuilders: string[] = [],
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
        untracked(() => {
          (node.properties as { [key: string]: any })[key] = value;
        });
      },
      removeProperty: (key) => {
        untracked(() => {
          delete (node.properties as { [key: string]: any })[key];
        });
      },

      addNode: (builder, ...partials) => {
        return untracked(() => {
          return partials.map((partial) => {
            const builders = [...ignoreBuilders, builder];
            const childPath = [...path, 'childrenMap', partial.id];
            const child = this._createNode(getGraph, { ...partial, parent: node }, childPath, builders);
            node.childrenMap[child.id] = child;
            this._build(getGraph(), child, childPath, builders);
            return child;
          });
        });
      },
      removeNode: (id) => {
        return untracked(() => {
          const child = node.childrenMap[id];
          delete node.childrenMap[id];
          return child;
        });
      },

      addAction: (...partials) => {
        return untracked(() => {
          return partials.map((partial) => {
            const action = this._createAction(partial);
            node.actionsMap[action.id] = action;
            return action;
          });
        });
      },
      removeAction: (id) => {
        return untracked(() => {
          const action = node.actionsMap[id];
          delete node.actionsMap[id];
          return action;
        });
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
      addAction: (...partials) => {
        return untracked(() => {
          return partials.map((partial) => {
            const subAction = this._createAction(partial);
            action.actionsMap[subAction.id] = subAction;
            return subAction;
          });
        });
      },
      removeAction: (id) => {
        return untracked(() => {
          const subAction = action.actionsMap[id];
          delete action.actionsMap[id];
          return subAction;
        });
      },
      addProperty: (key, value) => {
        return untracked(() => {
          (action.properties as { [key: string]: any })[key] = value;
        });
      },
      removeProperty: (key) => {
        return untracked(() => {
          delete (action.properties as { [key: string]: any })[key];
        });
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
