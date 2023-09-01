//
// Copyright 2023 DXOS.org
//

import type { IconProps } from '@phosphor-icons/react';
import { FC } from 'react';

import type { Intent } from '@braneframe/plugin-intent';
import type { UnsubscribeCallback } from '@dxos/async';

/**
 * Contract for UI affordances which present, organize and navigate over the graph of user knowledge.
 */
export interface Graph {
  /**
   * The root node of the graph which is the entry point for all knowledge.
   */
  get root(): Graph.Node;

  /**
   * Get the path through the graph from the root to the node with the given id.
   */
  getPath(id: string): string[] | undefined;

  /**
   * Find the node with the given id in the graph.
   */
  find(id: string): Graph.Node | undefined;

  /**
   * Traverse the graph from the given node.
   */
  traverse(options: Graph.TraverseOptions): void;

  /**
   * Register a node builder which will be called in order to construct the graph.
   */
  registerNodeBuilder(builder: Graph.NodeBuilder): void;

  /**
   * Remove a node builder from the graph.
   */
  removeNodeBuilder(builder: Graph.NodeBuilder): void;

  /**
   * Construct the graph, starting by calling all registered node builders on the root node.
   * Node builders will be filtered out as they are used such that they are only used once on any given path.
   */
  construct(): void;
}

export namespace Graph {
  /**
   * Called when a node is added to the graph, allowing other node builders to add children, actions or properties.
   */
  export type NodeBuilder = (parent: Node) => UnsubscribeCallback | void;

  export type TraverseOptions = {
    /**
     * The node to start traversing from. Defaults to the root node.
     */
    from?: Node;

    /**
     * The direction to traverse the graph. Defaults to 'down'.
     */
    direction?: 'up' | 'down';

    /**
     * A predicate to filter nodes which are passed to the `onVisitNode` callback.
     */
    predicate?: (node: Node) => boolean;

    /**
     * A callback which is called for each node visited during traversal.
     */
    onVisitNode?: (node: Node) => void;
  };

  /**
   * Represents a node in the graph.
   */
  export type Node<TData = any, TProperties extends { [key: string]: any } = { [key: string]: any }> = {
    /**
     * Globally unique ID.
     */
    id: string;

    /**
     * Parent node in the graph.
     */
    parent: Node | null;

    /**
     * Label to be used when displaying the node.
     * For default labels, use a translated string.
     *
     * @example 'My Node'
     * @example ['unknown node label, { ns: 'example-plugin' }]
     */
    // TODO(thure): `Parameters<TFunction>` causes typechecking issues because `TFunction` has so many signatures.
    label: string | [string, { ns: string; count?: number }];

    /**
     * Description to be used when displaying a detailed view of the node.
     * For default descriptions, use a translated string.
     */
    description?: string | [string, { ns: string; count?: number }];

    /**
     * Icon to be used when displaying the node.
     */
    icon?: FC<IconProps>;

    /**
     * Data the node represents.
     */
    data: TData;

    /**
     * Properties of the node relevant to displaying the node.
     *
     * @example { index: 'a1' }
     */
    properties: TProperties;

    /**
     * Children of the node stored by their id.
     */
    childrenMap: { [key: string]: Node };

    /**
     * Actions of the node stored by their id.
     */
    actionsMap: { [key: string]: Action };

    /**
     * Children of the node in default order.
     */
    get children(): Node[];

    /**
     * Actions of the node in default order.
     */
    get actions(): Action[];

    add<TChildData = null, TChildProperties extends { [key: string]: any } = { [key: string]: any }>(
      ...node: (Pick<Node, 'id' | 'label'> & Partial<Node<TChildData, TChildProperties>>)[]
    ): Node<TChildData, TChildProperties>[];
    remove(id: string): Node;
    addAction<TActionProperties extends { [key: string]: any } = { [key: string]: any }>(
      ...action: (Pick<Action, 'id' | 'label'> & Partial<Action<TActionProperties>>)[]
    ): Action<TActionProperties>[];
    removeAction(id: string): Action;
    addProperty(key: string, value: any): void;
    removeProperty(key: string): void;
  };

  /**
   * An action on a node in the graph which may be invoked by sending the associated intent.
   */
  export type Action<TProperties extends { [key: string]: any } = { [key: string]: any }> = {
    /**
     * Locally unique ID.
     */
    id: string;

    /**
     * Label to be used when displaying the node.
     * For default labels, use a translated string.
     *
     * @example 'My Action'
     * @example ['unknown action label, { ns: 'example-plugin' }]
     */
    label: string | [string, { ns: string; count?: number }];

    /**
     * Icon to be used when displaying the node.
     */
    icon?: FC<IconProps>;

    /**
     * Intent(s) to be invoked when the action is invoked.
     */
    intent?: Intent | Intent[];

    /**
     * Properties of the node relevant to displaying the action.
     *
     * @example { index: 'a1' }
     */
    properties: TProperties;

    /**
     * Sub-actions of the node stored by their id.
     */
    actionsMap: { [key: string]: Action };

    /**
     * Actions of the node in default order.
     */
    get actions(): Action[];

    invoke: () => Promise<any>;
    add<TActionProperties extends { [key: string]: any } = { [key: string]: any }>(
      ...action: (Pick<Action, 'id' | 'label'> & Partial<Action<TActionProperties>>)[]
    ): Action<TActionProperties>[];
    remove(id: string): Action;
    addProperty(key: string, value: any): void;
    removeProperty(key: string): void;
  };
}
