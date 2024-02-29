//
// Copyright 2023 DXOS.org
//

import { type MaybePromise, type MakeOptional } from '@dxos/util';

/**
 * Represents a node in the graph.
 */
// TODO(wittjosiah): Use Effect Schema.
export type NodeBase<TData = any, TProperties extends Record<string, any> = Record<string, any>> = {
  /**
   * Globally unique ID.
   */
  id: string;

  /**
   * Properties of the node relevant to displaying the node.
   */
  properties: TProperties;

  /**
   * Data the node represents.
   */
  // TODO(burdon): Type system (e.g., minimally provide identifier string vs. TypedObject vs. Graph mixin type system)?
  //  type field would prevent convoluted sniffing of object properties. And allow direct pass-through for ECHO TypedObjects.
  data: TData;
};

export type NodeFilter<T = any, U extends Record<string, any> = Record<string, any>> = (
  node: Node<unknown, Record<string, any>>,
  connectedNode: Node,
) => node is Node<T, U>;

export type EdgeDirection = 'outbound' | 'inbound';

export type ConnectedNodes = {
  /**
   * Edges that this node is connected to in default order.
   */
  edges(params?: { direction?: EdgeDirection }): Readonly<string[]>;

  /**
   * Nodes that this node is connected to in default order.
   */
  nodes<T = any, U extends Record<string, any> = Record<string, any>>(params?: {
    direction?: EdgeDirection;
    filter?: NodeFilter<T, U>;
  }): Node<T>[];

  /**
   * Get a specific connected node by id.
   */
  node(id: string): Node | undefined;
};

export type ConnectedActions = {
  /**
   * Actions or action groups that this node is connected to in default order.
   */
  actions(): ActionLike[];
};

export type Node<TData = any, TProperties extends Record<string, any> = Record<string, any>> = Readonly<
  Omit<NodeBase<TData, TProperties>, 'properties'> & { properties: Readonly<TProperties> } & ConnectedNodes &
    ConnectedActions
>;

export const isGraphNode = (data: unknown): data is Node =>
  data && typeof data === 'object' && 'id' in data && 'properties' in data && data.properties
    ? typeof data.properties === 'object' && 'data' in data
    : false;

export type NodeArg<TData, TProperties extends Record<string, any> = Record<string, any>> = MakeOptional<
  NodeBase<TData, TProperties>,
  'data' | 'properties'
> & {
  /** Will automatically add nodes with an edge from this node to each. */
  nodes?: NodeArg<unknown>[];

  /** Will automatically add specified edges. */
  edges?: [string, EdgeDirection][];
};

//
// Actions
//

export type InvokeParams = {
  /** Node the invoked action is connected to. */
  node: Node;

  caller?: string;
};

export type ActionData = (params: InvokeParams) => MaybePromise<void>;

export type Action<TProperties extends Record<string, any> = Record<string, any>> = Readonly<
  Omit<NodeBase<ActionData, TProperties>, 'properties'> & {
    properties: Readonly<TProperties>;
  } & ConnectedNodes
>;

export const isAction = (data: unknown): data is Action =>
  isGraphNode(data) ? typeof data.data === 'function' : false;

export const actionGroupSymbol = Symbol('ActionGroup');

export type ActionGroup = Readonly<
  Omit<NodeBase<typeof actionGroupSymbol, Record<string, any>>, 'properties'> & {
    properties: Readonly<Record<string, any>>;
  } & ConnectedActions
>;

export const isActionGroup = (data: unknown): data is ActionGroup =>
  isGraphNode(data) ? data.data === actionGroupSymbol : false;

export type ActionLike = Action | ActionGroup;

export const isActionLike = (data: unknown): data is Action | ActionGroup => isAction(data) || isActionGroup(data);
