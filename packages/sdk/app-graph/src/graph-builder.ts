//
// Copyright 2023 DXOS.org
//

import { effect, type Signal, signal, untracked } from '@preact/signals-core';

import { Trigger, type UnsubscribeCallback } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { create } from '@dxos/live-object';
import { log } from '@dxos/log';
import { byPosition, type Position, isNode, type MaybePromise, nonNullable } from '@dxos/util';

import { ACTION_GROUP_TYPE, ACTION_TYPE, Graph, ROOT_ID, type GraphParams } from './graph';
import { type ActionData, actionGroupSymbol, type Node, type NodeArg, type Relation } from './node';

const NODE_RESOLVER_TIMEOUT = 1_000;

/**
 * Graph builder extension for adding nodes to the graph based on just the node id.
 * This is useful for creating the first node in a graph or for hydrating cached nodes with data.
 *
 * @param params.id The id of the node to resolve.
 */
export type ResolverExtension = (params: { id: string }) => NodeArg<any> | false | undefined;

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
 * @param params.disposition Affects the order the extensions are processed in.
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
  position?: Position;
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
  const { id, position = 'static', resolver, connector, actions, actionGroups, ...rest } = extension;
  const getId = (key: string) => `${id}/${key}`;
  return [
    resolver ? { id: getId('resolver'), position, resolver } : undefined,
    connector ? { ...rest, id: getId('connector'), position, connector } : undefined,
    actionGroups
      ? ({
          ...rest,
          id: getId('actionGroups'),
          position,
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
          position,
          type: ACTION_TYPE,
          relation: 'outbound',
          connector: ({ node }) => actions({ node })?.map((arg) => ({ ...arg, type: ACTION_TYPE })),
        } satisfies BuilderExtension)
      : undefined,
  ].filter(nonNullable);
};

export type GraphBuilderTraverseOptions = {
  visitor: (node: Node, path: string[]) => MaybePromise<boolean | void>;
  node?: Node;
  relation?: Relation;
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

export type BuilderExtension = Readonly<{
  id: string;
  position: Position;
  resolver?: ResolverExtension;
  connector?: ConnectorExtension;
  // Only for connector.
  relation?: Relation;
  type?: string;
  filter?: (node: Node) => boolean;
}>;

type ExtensionArg = BuilderExtension | BuilderExtension[] | ExtensionArg[];

export const flattenExtensions = (extension: ExtensionArg, acc: BuilderExtension[] = []): BuilderExtension[] => {
  if (Array.isArray(extension)) {
    return [...acc, ...extension.flatMap((ext) => flattenExtensions(ext, acc))];
  } else {
    return [...acc, extension];
  }
};

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
  private readonly _initialized: Record<string, Trigger> = {};
  private _graph: Graph;

  constructor(params: Pick<GraphParams, 'nodes' | 'edges'> = {}) {
    this._graph = new Graph({
      ...params,
      onInitialNode: async (id) => this._onInitialNode(id),
      onInitialNodes: async (node, relation, type) => this._onInitialNodes(node, relation, type),
      onRemoveNode: (id) => this._onRemoveNode(id),
    });
  }

  static from(pickle?: string) {
    if (!pickle) {
      return new GraphBuilder();
    }

    const { nodes, edges } = JSON.parse(pickle);
    return new GraphBuilder({ nodes, edges });
  }

  /**
   * If graph is being restored from a pickle, the data will be null.
   * Initialize the data of each node by calling resolvers.
   * Wait until all of the initial nodes have resolved.
   */
  async initialize() {
    Object.keys(this._graph._nodes)
      .filter((id) => id !== ROOT_ID)
      .forEach((id) => (this._initialized[id] = new Trigger()));
    Object.keys(this._graph._nodes).forEach((id) => this._onInitialNode(id));
    await Promise.all(
      Object.entries(this._initialized).map(async ([id, trigger]) => {
        try {
          await trigger.wait({ timeout: NODE_RESOLVER_TIMEOUT });
        } catch {
          log.error('node resolver timeout', { id });
          this.graph._removeNodes([id]);
        }
      }),
    );
  }

  get graph() {
    return this._graph;
  }

  /**
   * @reactive
   */
  get extensions() {
    return Object.values(this._extensions);
  }

  /**
   * Register a node builder which will be called in order to construct the graph.
   */
  addExtension(extension: ExtensionArg): GraphBuilder {
    const extensions = flattenExtensions(extension);
    untracked(() => {
      extensions.forEach((extension) => {
        this._dispatcher.state[extension.id] = [];
        this._extensions[extension.id] = extension;
      });
    });
    return this;
  }

  /**
   * Remove a node builder from the graph builder.
   */
  removeExtension(id: string): GraphBuilder {
    untracked(() => {
      delete this._extensions[id];
    });
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
   * A graph traversal using just the connector extensions, without subscribing to any signals or persisting any nodes.
   */
  async explore(
    { node = this._graph.root, relation = 'outbound', visitor }: GraphBuilderTraverseOptions,
    path: string[] = [],
  ) {
    // Break cycles.
    if (path.includes(node.id)) {
      return;
    }

    // TODO(wittjosiah): This is a workaround for esm not working in the test runner.
    //   Switching to vitest is blocked by having node esm versions of echo-schema & echo-signals.
    if (!isNode()) {
      const { yieldOrContinue } = await import('main-thread-scheduling');
      await yieldOrContinue('idle');
    }
    const shouldContinue = await visitor(node, [...path, node.id]);
    if (shouldContinue === false) {
      return;
    }

    const nodes = Object.values(this._extensions)
      .filter((extension) => relation === (extension.relation ?? 'outbound'))
      .filter((extension) => !extension.filter || extension.filter(node))
      .flatMap((extension) => {
        this._dispatcher.currentExtension = extension.id;
        this._dispatcher.stateIndex = 0;
        BuilderInternal.currentDispatcher = this._dispatcher;
        const result = extension.connector?.({ node }) ?? [];
        BuilderInternal.currentDispatcher = undefined;
        return result;
      })
      .map(
        (arg): Node => ({
          id: arg.id,
          type: arg.type,
          cacheable: arg.cacheable,
          data: arg.data ?? null,
          properties: arg.properties ?? {},
        }),
      );

    await Promise.all(nodes.map((n) => this.explore({ node: n, relation, visitor }, [...path, node.id])));
  }

  private _onInitialNode(nodeId: string) {
    this._nodeChanged[nodeId] = this._nodeChanged[nodeId] ?? signal({});
    this._resolverSubscriptions.set(
      nodeId,
      effect(() => {
        const extensions = Object.values(this._extensions).toSorted(byPosition);
        for (const { id, resolver } of extensions) {
          if (!resolver) {
            continue;
          }

          this._dispatcher.currentExtension = id;
          this._dispatcher.stateIndex = 0;
          BuilderInternal.currentDispatcher = this._dispatcher;
          let node: NodeArg<any> | false | undefined;
          try {
            node = resolver({ id: nodeId });
          } catch (err) {
            log.catch(err, { extension: id });
            log.error(`Previous error occurred in extension: ${id}`);
          } finally {
            BuilderInternal.currentDispatcher = undefined;
          }

          const trigger = this._initialized[nodeId];
          if (node) {
            this.graph._addNodes([node]);
            trigger?.wake();
            if (this._nodeChanged[node.id]) {
              this._nodeChanged[node.id].value = {};
            }
            break;
          } else if (node === false) {
            this.graph._removeNodes([nodeId]);
            trigger?.wake();
            break;
          }
        }
      }),
    );
  }

  private _onInitialNodes(node: Node, nodesRelation: Relation, nodesType?: string) {
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
        const extensions = Object.values(this._extensions).toSorted(byPosition);
        for (const { id, connector, filter, type, relation = 'outbound' } of extensions) {
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
          try {
            nodes.push(...(connector({ node }) ?? []));
          } catch (err) {
            log.catch(err, { extension: id });
            log.error(`Previous error occurred in extension: ${id}`);
          } finally {
            BuilderInternal.currentDispatcher = undefined;
          }
        }

        const ids = nodes.map((n) => n.id);
        const removed = previous.filter((id) => !ids.includes(id));
        previous = ids;

        // Remove edges and only remove nodes that are orphaned.
        this.graph._removeEdges(
          removed.map((target) => ({ source: node.id, target })),
          true,
        );
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
