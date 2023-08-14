//
// Copyright 2023 DXOS.org
//

import { Intent } from '@braneframe/plugin-intent';

export type GraphNodeBuilder = (parent: GraphNode) => GraphNode[];
export type GraphActionBuilder = (parent: GraphNode) => GraphNodeAction[];

export interface Graph {
  get root(): GraphNode;
  find(id: string): GraphNode | undefined;
  registerNodeBuilder(id: string, builder: GraphNodeBuilder): void;
  registerActionBuilder(id: string, builder: GraphActionBuilder): void;
  removeNodeBuilder(id: string): void;
  removeActionBuilder(id: string): void;
  invalidate(id: string): void;
  construct(): void;
}

export type GraphNodeAttributes = { [key: string]: any };
export type GraphNodeChildren = { [key: string]: GraphNode };
export type GraphNodeActions = { [key: string]: GraphNodeAction };

export type GraphNode<TData = any> = {
  id: string;
  data: TData;
  parent: GraphNode | null;
  attributes: GraphNodeAttributes;
  children: GraphNodeChildren;
  actions: GraphNodeActions;
};

export type GraphNodeAction = {
  id: string;
  intent: Intent | Intent[];
};
