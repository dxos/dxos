//
// Copyright 2023 DXOS.org
//

import { type Signal, effect, signal } from '@preact/signals-core';
// import { yieldOrContinue } from 'main-thread-scheduling';

import { EventSubscriptions } from '@dxos/async';
import { create } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

import { Graph } from './graph';
import { type Relation, type NodeArg, type Node } from './node';

/**
 * Graph builder extension for adding nodes to the graph based on a connection to an existing node.
 *
 * @param params.node The existing node.
 * @param params.relation The relation the graph is being expanded from the existing node.
 * @param params.type If provided, all nodes returned are expected to have this type.
 */
export type ConnectorExtension = (params: {
  node: Node;
  relation: Relation;
  type?: string;
}) => NodeArg<any>[] | undefined;

/**
 * Graph builder extension for adding nodes to the graph based on just the node id and type.
 * This is useful for creating the first node in a graph or for hydrating cached nodes with data.
 *
 * @param params.id The id of the node.
 * @param params.type The type of the node.
 */
export type ResolverExtension = (params: { id: string; type?: string }) => NodeArg<any> | undefined;

export type BuilderExtension = {
  id: string;
  connector?: ConnectorExtension;
  resolver?: ResolverExtension;
};

/**
 * Create a graph builder extension.
 */
export const createExtension = (extension: BuilderExtension): BuilderExtension => extension;

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
      .flatMap((extension) => extension.connector?.({ node, relation }) ?? [])
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

  private _onInitialNode(nodeId: string, type?: string) {
    this._nodeChanged[nodeId] = this._nodeChanged[nodeId] ?? signal({});
    let initialized: NodeArg<any> | undefined;
    for (const { id, resolver } of Object.values(this._extensions)) {
      if (!resolver) {
        continue;
      }

      const unsubscribe = effect(() => {
        this._dispatcher.currentExtension = id;
        this._dispatcher.stateIndex = 0;
        BuilderInternal.currentDispatcher = this._dispatcher;
        const node = resolver({ id: nodeId, type });
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

  private _onInitialNodes(node: Node, relation: Relation, type?: string) {
    this._nodeChanged[node.id] = this._nodeChanged[node.id] ?? signal({});
    let initialized: NodeArg<any>[] | undefined;
    let previous: string[] = [];
    this._unsubscribe.add(
      effect(() => {
        // Subscribe to extensions being added.
        // TODO(wittjosiah): This is a record.
        this._extensions.length;
        // Subscribe to connected node changes.
        this._nodeChanged[node.id].value;

        // TODO(wittjosiah): Consider allowing extensions to collaborate on the same node by merging their results.
        const nodes: NodeArg<any>[] = [];
        for (const { id, connector } of Object.values(this._extensions)) {
          if (!connector) {
            continue;
          }

          this._dispatcher.currentExtension = id;
          this._dispatcher.stateIndex = 0;
          BuilderInternal.currentDispatcher = this._dispatcher;
          nodes.push(...(connector({ node, relation, type }) ?? []));
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
