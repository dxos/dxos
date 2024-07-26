//
// Copyright 2023 DXOS.org
//

import { type Signal, effect, signal } from '@preact/signals-core';
// import { yieldOrContinue } from 'main-thread-scheduling';

import { type UnsubscribeCallback } from '@dxos/async';
import { create } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { nonNullable } from '@dxos/util';

import { ACTION_GROUP_TYPE, ACTION_TYPE, Graph } from './graph';
import { type Relation, type NodeArg, type Node, type ActionData, actionGroupSymbol } from './node';

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
}) => Omit<NodeArg<ActionData>, 'type' | 'nodes' | 'edges'>[] | undefined;

/**
 * Constrained case of the connector extension for more easily adding action groups to the graph.
 */
export type ActionGroupsExtension<T = any> = (params: {
  node: Node<T>;
}) => Omit<NodeArg<typeof actionGroupSymbol>, 'type' | 'data' | 'nodes' | 'edges'>[] | undefined;

type GuardedNodeType<T> = T extends (value: any) => value is infer N ? (N extends Node<infer D> ? D : unknown) : never;

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
export type CreateExtensionOptions<T = any> = {
  id: string;
  relation?: Relation;
  type?: string;
  filter?: (node: Node) => node is Node<T>;
  resolver?: ResolverExtension;
  connector?: ConnectorExtension<GuardedNodeType<CreateExtensionOptions<T>['filter']>>;
  actions?: ActionsExtension<GuardedNodeType<CreateExtensionOptions<T>['filter']>>;
  actionGroups?: ActionGroupsExtension<GuardedNodeType<CreateExtensionOptions<T>['filter']>>;
};

/**
 * Create a graph builder extension.
 */
export const createExtension = <T = any>(extension: CreateExtensionOptions<T>): BuilderExtension[] => {
  const { id, resolver, connector, actions, actionGroups, ...rest } = extension;
  const getId = (key: string) => `${id}/${key}`;
  return [
    resolver ? { id: getId('resolver'), resolver } : undefined,
    connector ? { ...rest, id: getId('connector'), connector } : undefined,
    actionGroups
      ? ({
          ...rest,
          id: getId('actionGroups'),
          type: ACTION_GROUP_TYPE,
          relation: 'outbound',
          connector: ({ node }) =>
            actionGroups({ node })?.map((arg) => ({ ...arg, data: actionGroupSymbol, type: ACTION_GROUP_TYPE })),
        } satisfies BuilderExtension)
      : undefined,
    actions
      ? ({
          ...rest,
          id: getId('actions'),
          type: ACTION_TYPE,
          relation: 'outbound',
          connector: ({ node }) => actions({ node })?.map((arg) => ({ ...arg, type: ACTION_TYPE })),
        } satisfies BuilderExtension)
      : undefined,
  ].filter(nonNullable);
};

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
export const toSignal = <T>(
  subscribe: (onChange: () => void) => () => void,
  get: () => T | undefined,
  key?: string,
) => {
  const thisSignal = memoize(() => {
    return signal(get());
  }, key);
  const unsubscribe = memoize(() => {
    return subscribe(() => (thisSignal.value = get()));
  }, key);
  cleanup(() => {
    unsubscribe();
  });
  return thisSignal.value;
};

export type BuilderExtension = {
  id: string;
  resolver?: ResolverExtension;
  connector?: ConnectorExtension;
  // Only for connector.
  relation?: Relation;
  type?: string;
  filter?: (node: Node) => boolean;
};

type ExtensionArg = BuilderExtension | BuilderExtension[] | ExtensionArg[];

/**
 * The builder provides an extensible way to compose the construction of the graph.
 */
// TODO(wittjosiah): Add api for setting subscription set and/or radius.
//   Should unsubscribe from nodes that are not in the set/radius.
//   Should track LRU nodes that are not in the set/radius and remove them beyond a certain threshold.
export class GraphBuilder {
  private readonly _dispatcher = new Dispatcher();
  private readonly _extensions = create<Record<string, BuilderExtension>>({});
  private readonly _resolverSubscriptions = new Map<string, UnsubscribeCallback>();
  private readonly _connectorSubscriptions = new Map<string, UnsubscribeCallback>();
  private readonly _nodeChanged: Record<string, Signal<{}>> = {};
  private _graph: Graph;

  constructor() {
    this._graph = new Graph({
      onInitialNode: (id) => this._onInitialNode(id),
      onInitialNodes: (node, relation, type) => this._onInitialNodes(node, relation, type),
      onRemoveNode: (id) => this._onRemoveNode(id),
    });
  }

  get graph() {
    return this._graph;
  }

  /**
   * Register a node builder which will be called in order to construct the graph.
   */
  addExtension(extension: ExtensionArg): GraphBuilder {
    if (Array.isArray(extension)) {
      extension.forEach((ext) => this.addExtension(ext));
      return this;
    }

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
    this._resolverSubscriptions.forEach((unsubscribe) => unsubscribe());
    this._connectorSubscriptions.forEach((unsubscribe) => unsubscribe());
    this._resolverSubscriptions.clear();
    this._connectorSubscriptions.clear();
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

  private async _onInitialNode(nodeId: string) {
    this._nodeChanged[nodeId] = this._nodeChanged[nodeId] ?? signal({});
    let resolved = false;
    for (const { id, resolver } of Object.values(this._extensions)) {
      if (resolved || !resolver) {
        continue;
      }

      const unsubscribe = effect(() => {
        this._dispatcher.currentExtension = id;
        this._dispatcher.stateIndex = 0;
        BuilderInternal.currentDispatcher = this._dispatcher;
        const node = resolver({ id: nodeId });
        BuilderInternal.currentDispatcher = undefined;
        if (node) {
          resolved = true;
          this.graph._addNodes([node]);
          if (this._nodeChanged[node.id]) {
            this._nodeChanged[node.id].value = {};
          }
        }
      });

      if (resolved) {
        this._resolverSubscriptions.get(nodeId)?.();
        this._resolverSubscriptions.set(nodeId, unsubscribe);
        break;
      } else {
        unsubscribe();
      }
    }
  }

  private async _onInitialNodes(node: Node, nodesRelation: Relation, nodesType?: string) {
    this._nodeChanged[node.id] = this._nodeChanged[node.id] ?? signal({});
    let first = true;
    let previous: string[] = [];
    this._connectorSubscriptions.set(
      node.id,
      effect(() => {
        // TODO(wittjosiah): This is a workaround for a race between the node removal and the effect re-running.
        //   To cause this case to happen, remove a collection and then undo the removal.
        if (!first && !this._connectorSubscriptions.has(node.id)) {
          return;
        }
        first = false;

        // Subscribe to extensions being added.
        Object.keys(this._extensions);
        // Subscribe to connected node changes.
        this._nodeChanged[node.id].value;

        // TODO(wittjosiah): Consider allowing extensions to collaborate on the same node by merging their results.
        const nodes: NodeArg<any>[] = [];
        for (const { id, connector, filter, type, relation = 'outbound' } of Object.values(this._extensions)) {
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

        this.graph._removeNodes(removed, true);
        this.graph._addNodes(nodes);
        this.graph._addEdges(
          nodes.map(({ id }) =>
            nodesRelation === 'outbound' ? { source: node.id, target: id } : { source: id, target: node.id },
          ),
        );
        this.graph._sortEdges(
          node.id,
          nodesRelation,
          nodes.map(({ id }) => id),
        );
        nodes.forEach((n) => {
          if (this._nodeChanged[n.id]) {
            this._nodeChanged[n.id].value = {};
          }
        });
      }),
    );
  }

  private async _onRemoveNode(nodeId: string) {
    this._resolverSubscriptions.get(nodeId)?.();
    this._connectorSubscriptions.get(nodeId)?.();
    this._resolverSubscriptions.delete(nodeId);
    this._connectorSubscriptions.delete(nodeId);
  }
}
