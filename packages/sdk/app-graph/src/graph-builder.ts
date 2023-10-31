//
// Copyright 2023 DXOS.org
//

import { untracked } from '@preact/signals-react';
import { type RevertDeepSignal, deepSignal } from 'deepsignal/react';
import Mousetrap from 'mousetrap';

import { EventSubscriptions } from '@dxos/async';

import type { ActionArg, Action } from './action';
import { Graph } from './graph';
import type { NodeArg, Node, NodeBuilder } from './node';

/**
 * The builder...
 */
export class GraphBuilder {
  private readonly _nodeBuilders = new Map<string, NodeBuilder>();
  private readonly _unsubscribe = new Map<string, EventSubscriptions>();

  /**
   * Register a node builder which will be called in order to construct the graph.
   */
  addNodeBuilder(id: string, builder: NodeBuilder): GraphBuilder {
    this._nodeBuilders.set(id, builder);
    return this;
  }

  /**
   * Remove a node builder from the graph builder.
   */
  removeNodeBuilder(id: string): GraphBuilder {
    this._nodeBuilders.delete(id);
    return this;
  }

  /**
   * Construct the graph, starting by calling all registered node builders on the root node.
   * Node builders will be filtered out as they are used such that they are only used once on any given path.
   * @param previousGraph If provided, the graph will be updated in place.
   * @param startingPath If provided, the graph will be updated starting at the given path.
   */
  build(previousGraph?: Graph, startingPath: string[] = []): Graph {
    const graph: Graph = previousGraph ?? new Graph(this._createNode(() => graph, { id: 'root', label: 'Root' }));
    return this._build(graph, graph.root, startingPath);
  }

  /**
   * Called recursively.
   */
  private _build(graph: Graph, node: Node, path: string[] = [], ignoreBuilders: string[] = []): Graph {
    // TODO(wittjosiah): Should this support multiple paths to the same node?
    graph._setPath(node.id, path);

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
    getGraph: () => Graph,
    partial: NodeArg<TData, TProperties>,
    path: string[] = [],
    ignoreBuilders: string[] = [],
  ): Node<TData, TProperties> {
    // TODO(burdon): Document implications and rationale of deepSignal.
    const node: Node<TData, TProperties> = deepSignal({
      parent: null,
      data: null as TData, // TODO(burdon): Allow null property?
      properties: {} as TProperties,
      childrenMap: {},
      actionsMap: {},
      // TODO(burdon): Document.
      ...partial,

      get children() {
        return Object.values(node.childrenMap);
      },
      get actions() {
        return Object.values(node.actionsMap);
      },

      addProperty: (key, value) => {
        untracked(() => {
          (node.properties as Record<string, any>)[key] = value;
        });
      },
      removeProperty: (key) => {
        untracked(() => {
          delete (node.properties as Record<string, any>)[key];
        });
      },

      addNode: (builder, ...partials) => {
        return untracked(() => {
          return partials.map((partial) => {
            const builders = [...ignoreBuilders, builder];
            const childPath = [...path, 'childrenMap', partial.id];
            const child = this._createNode(getGraph, { ...partial, parent: node }, childPath, builders);
            node.childrenMap[child.id] = child;
            // TOOD(burdon): Defer triggering recursive updates until task has completed.
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
            if (action.keyBinding) {
              Mousetrap.bind(action.keyBinding, () => {
                action.invoke();
              });
            }

            node.actionsMap[action.id] = action;
            return action;
          });
        });
      },
      removeAction: (id) => {
        return untracked(() => {
          const action = node.actionsMap[id];
          if (action.keyBinding) {
            Mousetrap.unbind(action.keyBinding);
          }

          delete node.actionsMap[id];
          return action;
        });
      },
    }) as RevertDeepSignal<Node<TData, TProperties>>;

    // Only actions added at this stage are available to subsequent builders.
    // `addNode` immediately passes the new node to other builders.
    // As such, actions added later with `addAction` are not available to those builders.
    // Having actions available to subsequent builders is useful for building groups.
    partial.actions && partial.actions.forEach((action) => node.addAction(action));

    return node;
  }

  private _createAction<TProperties extends Record<string, any> = Record<string, any>>(
    partial: ActionArg<TProperties>,
  ): Action<TProperties> {
    const action: Action<TProperties> = deepSignal({
      properties: {} as TProperties,
      ...partial,
      actionsMap: {},
      get actions() {
        return Object.values(action.actionsMap);
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
          (action.properties as Record<string, any>)[key] = value;
        });
      },
      removeProperty: (key) => {
        return untracked(() => {
          delete (action.properties as Record<string, any>)[key];
        });
      },
    }) as RevertDeepSignal<Action<TProperties>>;

    partial.actions && partial.actions.forEach((subAction) => action.addAction(subAction));

    return action;
  }
}
