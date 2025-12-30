//
// Copyright 2023 DXOS.org
//

import { type MakeOptional, type MaybePromise } from '@dxos/util';

/**
 * Root node ID.
 */
export const RootId = 'root';

/**
 * Root node type.
 */
export const RootType = 'dxos.org/type/GraphRoot';

/**
 * Action node type.
 */
export const ActionType = 'dxos.org/type/GraphAction';

/**
 * Action group node type.
 */
export const ActionGroupType = 'dxos.org/type/GraphActionGroup';

/**
 * Represents a node in the graph.
 */
// TODO(wittjosiah): Use Effect Schema.
// TODO(burdon): Rename GraphNode. Node is already in the global namespace.
export type Node<TData = any, TProperties extends Record<string, any> = Record<string, any>> = Readonly<{
  /**
   * Globally unique ID.
   */
  // TODO(burdon): Allow string array, which is concatenated.
  id: string;

  /**
   * Typename of the data the node represents.
   */
  type: string;

  /**
   * Keys in of the properties which should be cached.
   * If defined, the node will be included in the cache.
   * If undefined, the node will not be included in the cache.
   */
  cacheable?: string[];

  /**
   * Properties of the node relevant to displaying the node.
   */
  properties: Readonly<TProperties>;

  /**
   * Data the node represents.
   */
  // TODO(burdon): Type system (e.g., minimally provide identifier string vs. TypedObject vs. Graph mixin type system)?
  //  type field would prevent convoluted sniffing of object properties. And allow direct pass-through for ECHO TypedObjects.
  data: TData;
}>;

export type NodeFilter<TData = any, TProperties extends Record<string, any> = Record<string, any>> = (
  node: Node<unknown, Record<string, any>>,
  connectedNode: Node,
) => node is Node<TData, TProperties>;

export type Relation = 'outbound' | 'inbound';

export const isGraphNode = (data: unknown): data is Node =>
  data && typeof data === 'object' && 'id' in data && 'properties' in data && data.properties
    ? typeof data.properties === 'object' && 'data' in data
    : false;

export type NodeArg<TData, TProperties extends Record<string, any> = Record<string, any>> = MakeOptional<
  Node<TData, TProperties>,
  'data' | 'properties' | 'cacheable'
> & {
  /** Will automatically add nodes with an edge from this node to each. */
  nodes?: NodeArg<unknown>[];

  /** Will automatically add specified edges. */
  edges?: [string, Relation][];
};

//
// Actions
//

export type InvokeProps = {
  /** Node the invoked action is connected to. */
  parent?: Node;

  caller?: string;
};

export type ActionData = (params?: InvokeProps) => MaybePromise<any>;

export type Action<TProperties extends Record<string, any> = Record<string, any>> = Readonly<
  Omit<Node<ActionData, TProperties>, 'properties'> & {
    properties: Readonly<TProperties>;
  }
>;

export const isAction = (data: unknown): data is Action =>
  isGraphNode(data) ? typeof data.data === 'function' && data.type === ActionType : false;

export const actionGroupSymbol = Symbol('ActionGroup');

export type ActionGroup<TProperties extends Record<string, any> = Record<string, any>> = Readonly<
  Omit<Node<typeof actionGroupSymbol, TProperties>, 'properties'> & {
    properties: Readonly<TProperties>;
  }
>;

export const isActionGroup = (data: unknown): data is ActionGroup =>
  isGraphNode(data) ? data.data === actionGroupSymbol && data.type === ActionGroupType : false;

export type ActionLike = Action | ActionGroup;

export const isActionLike = (data: unknown): data is Action | ActionGroup => isAction(data) || isActionGroup(data);
