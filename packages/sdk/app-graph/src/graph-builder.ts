//
// Copyright 2023 DXOS.org
//

import { type Signal, effect, signal } from '@preact/signals-core';
// import { yieldOrContinue } from 'main-thread-scheduling';

import { EventSubscriptions } from '@dxos/async';
import { create } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

import { ACTION_GROUP_TYPE, ACTION_TYPE, Graph } from './graph';
import { type Relation, type NodeArg, type Node, type ActionData, type actionGroupSymbol } from './node';

/**
 * Graph builder extension for adding nodes to the graph based on just the node id.
 * This is useful for creating the first node in a graph or for hydrating cached nodes with data.
 *
 * @param params.id The id of the node to resolve.
 */
export type ResolverExtension = (params: { id: string }) => NodeArg<any> | undefined;

/**
 * Graph builder extension for adding nodes to the graph based on a connection to an existing node.
 *
 * @param params.node The existing node the returned nodes will be connected to.
 */
export type ConnectorExtension<T = any> = (params: { node: Node<T> }) => NodeArg<any>[] | undefined;

/**
 * Constrained case of the connector extension for more easily adding actions to the graph.
 */
export type ActionsExtension<T = any> = (params: {
  node: Node<T>;
}) => Omit<NodeArg<ActionData>, 'nodes' | 'edges'>[] | undefined;

/**
 * Constrained case of the connector extension for more easily adding action groups to the graph.
 */
export type ActionGroupsExtension<T = any> = (params: {
  node: Node<T>;
}) => Omit<NodeArg<typeof actionGroupSymbol>, 'data' | 'nodes' | 'edges'>[] | undefined;

/**
 * A graph builder extension is used to add nodes to the graph.
 *
 * @param params.id The unique id of the extension.
 * @param params.relation The relation the graph is being expanded from the existing node.
 * @param params.type If provided, all nodes returned are expected to have this type.
 * @param params.filter A filter function to determine if an extension should act on a node.
 * @param params.resolver A function to add nodes to the graph based on just the node id.
 * @param params.connector A function to add nodes to the graph based on a connection to an existing node.
 * @param params.actions A function to add actions to the graph based on a connection to an existing node.
 * @param params.actionGroups A function to add action groups to the graph based on a connection to an existing node.
 */
export type BuilderExtension<T = any> = {
  id: string;
  relation?: Relation;
  type?: string;
  filter?: (node: Node) => boolean;
  resolver?: ResolverExtension;
  connector?: ConnectorExtension<T>;
  actions?: ActionsExtension<T>;
  actionGroups?: ActionGroupsExtension<T>;
};

/**
 * Create a graph builder extension.
 */
export const createExtension = <T = any>(extension: BuilderExtension<T>): BuilderExtension<T> => extension;

export type GraphBuilderTraverseOptions = {
  node: Node;
  relation?: Relation;
  visitor: (node: Node, path: string[]) => void;
};

/**
 * The dispatcher is used to keep track of the current extension and state when memoizing functions.
 */
class Dispatcher {
  currentExtension?: string;
  stateIndex = 0;
  state: Record<string, any[]> = {};
  cleanup: (() => void)[] = [];
}

class BuilderInternal {
  // This must be static to avoid passing the dispatcher instance to every memoized function.
  // If the dispatcher is not set that means that the memoized function is being called outside of the graph builder.
  static currentDispatcher?: Dispatcher;
}

/**
 * Allows code to be memoized within the context of a graph builder extension.
 * This is useful for creating instances which should be subscribed to rather than recreated.
 */
export const memoize = <T>(fn: () => T, key = 'result'): T => {
  const dispatcher = BuilderInternal.currentDispatcher;
  invariant(dispatcher?.currentExtension, 'memoize must be called within an extension');
  const all = dispatcher.state[dispatcher.currentExtension][dispatcher.stateIndex] ?? {};
  const current = all[key];
  const result = current ? current.result : fn();
  dispatcher.state[dispatcher.currentExtension][dispatcher.stateIndex] = { ...all, [key]: { result } };
  dispatcher.stateIndex++;
  return result;
};

/**
 * Register a cleanup function to be called when the graph builder is destroyed.
 */
export const cleanup = (fn: () => void): void => {
  memoize(() => {
    const dispatcher = BuilderInternal.currentDispatcher;
    invariant(dispatcher, 'cleanup must be called within an extension');
    dispatcher.cleanup.push(fn);
  });
};

/**
 * Convert a subscribe/get pair into a signal.
 */
export const toSignal = <T>(subscribe: (onChange: () => void) => () => void, get: () => T | undefined) => {
  const thisSignal = memoize(() => {
    return signal(get());
  });
  const unsubscribe = memoize(() => {
    return subscribe(() => (thisSignal.value = get()));
  });
  cleanup(() => {
    unsubscribe();
  });
  return thisSignal.value;
};

/**
 * The builder provides an extensible way to compose the construction of the graph.
 */
export class GraphBuilder {
  private readonly _dispatcher = new Dispatcher();
  private readonly _extensions = create<Record<string, BuilderExtension>>({});
  private readonly _unsubscribe = new EventSubscriptions();
  private readonly _nodeChanged: Record<string, Signal<{}>> = {};
  private _graph: Graph;

  constructor() {
    // TODO(wittjosiah): Handle more granular unsubscribing.
    //   - unsubscribe from removed nodes
    //   - add api for setting subscription set and/or radius.
    this._graph = new Graph({
      onInitialNode: (id, type) => this._onInitialNode(id, type),
      onInitialNodes: (node, relation, type) => this._onInitialNodes(node, relation, type),
    });
  }

  get graph() {
    return this._graph;
  }

  /**
   * Register a node builder which will be called in order to construct the graph.
   */
  addExtension(extension: BuilderExtension): GraphBuilder {
    this._dispatcher.state[extension.id] = [];
    this._extensions[extension.id] = extension;
    return this;
  }

  /**
   * Remove a node builder from the graph builder.
   */
  removeExtension(id: string): GraphBuilder {
    delete this._extensions[id];
    return this;
  }

  destroy() {
    this._dispatcher.cleanup.forEach((fn) => fn());
    this._unsubscribe.clear();
  }

  /**
   * Traverse a graph using just the connector extensions, without subscribing to any signals or persisting any nodes.
   */
  // TODO(wittjosiah): Rename? This is not traversing the graph proper.
  async traverse({ node, relation = 'outbound', visitor }: GraphBuilderTraverseOptions, path: string[] = []) {
    // Break cycles.
    if (path.includes(node.id)) {
      return;
    }

    // TODO(wittjosiah): Failed in test environment. ESM only?
    // await yieldOrContinue('idle');
    visitor(node, [...path, node.id]);

    const nodes = Object.values(this._extensions)
      .filter((extension) => relation === (extension.relation ?? 'outbound'))
      .flatMap((extension) => extension.connector?.({ node }) ?? [])
      .map(
        (arg): Node => ({
          id: arg.id,
          type: arg.type,
          data: arg.data ?? null,
          properties: arg.properties ?? {},
        }),
      );

    await Promise.all(nodes.map((n) => this.traverse({ node: n, relation, visitor }, [...path, node.id])));
  }

  private _onInitialNode(nodeId: string, nodeType?: string) {
    this._nodeChanged[nodeId] = this._nodeChanged[nodeId] ?? signal({});
    let initialized: NodeArg<any> | undefined;
    for (const { id, type, resolver } of Object.values(this._extensions)) {
      if (!resolver || (nodeType && type !== nodeType)) {
        continue;
      }

      const unsubscribe = effect(() => {
        this._dispatcher.currentExtension = id;
        this._dispatcher.stateIndex = 0;
        BuilderInternal.currentDispatcher = this._dispatcher;
        const node = resolver({ id: nodeId });
        BuilderInternal.currentDispatcher = undefined;
        if (node && initialized) {
          this.graph._addNodes([node]);
          if (this._nodeChanged[initialized.id]) {
            this._nodeChanged[initialized.id].value = {};
          }
        } else if (node) {
          initialized = node;
        }
      });

      if (initialized) {
        this._unsubscribe.add(unsubscribe);
        break;
      } else {
        unsubscribe();
      }
    }

    return initialized;
  }

  private _onInitialNodes(node: Node, nodesRelation: Relation, nodesType?: string) {
    this._nodeChanged[node.id] = this._nodeChanged[node.id] ?? signal({});
    let initialized: NodeArg<any>[] | undefined;
    let previous: string[] = [];
    this._unsubscribe.add(
      effect(() => {
        // Subscribe to extensions being added.
        Object.keys(this._extensions);
        // Subscribe to connected node changes.
        this._nodeChanged[node.id].value;

        // TODO(wittjosiah): Consider allowing extensions to collaborate on the same node by merging their results.
        const nodes: NodeArg<any>[] = [];
        for (const extension of Object.values(this._extensions)) {
          const { id, filter } = extension;
          const connector = extension.actions ?? extension.actionGroups ?? extension.connector;
          const type = extension.actions ? ACTION_TYPE : extension.actionGroups ? ACTION_GROUP_TYPE : extension.type;
          const relation = extension.actions || extension.actionGroups ? 'outbound' : extension.relation ?? 'outbound';
          if (
            !connector ||
            relation !== nodesRelation ||
            (nodesType && type !== nodesType) ||
            (filter && !filter(node))
          ) {
            continue;
          }

          this._dispatcher.currentExtension = id;
          this._dispatcher.stateIndex = 0;
          BuilderInternal.currentDispatcher = this._dispatcher;
          nodes.push(...(connector({ node }) ?? []));
          BuilderInternal.currentDispatcher = undefined;
        }
        const ids = nodes.map((n) => n.id);
        const removed = previous.filter((id) => !ids.includes(id));
        previous = ids;

        if (initialized) {
          this.graph._removeNodes(removed, true);
          this.graph._addNodes(nodes);
          this.graph._addEdges(nodes.map(({ id }) => ({ source: node.id, target: id })));
          this.graph._sortEdges(
            node.id,
            'outbound',
            nodes.map(({ id }) => id),
          );
          nodes.forEach((n) => {
            if (this._nodeChanged[n.id]) {
              this._nodeChanged[n.id].value = {};
            }
          });
        } else {
          initialized = nodes;
        }
      }),
    );

    return initialized;
  }
}
