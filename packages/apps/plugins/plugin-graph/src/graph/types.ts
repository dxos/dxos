//
// Copyright 2023 DXOS.org
//

import type { Intent } from '@braneframe/plugin-intent';
import type { UnsubscribeCallback } from '@dxos/async';

export interface Graph {
  get root(): Graph.Node;
  find(id: string): Graph.Node | undefined;
  traverse(options: Graph.TraverseOptions): void;
  registerNodeBuilder(builder: Graph.NodeBuilder): void;
  removeNodeBuilder(builder: Graph.NodeBuilder): void;
  construct(): void;
}

export namespace Graph {
  export type NodeBuilder = (parent: Node) => UnsubscribeCallback | void;

  export type TraverseOptions = {
    from?: Node;
    predicate?: (node: Node) => boolean;
    onVisitNode?: (node: Node) => void;
  };

  export type Node<TData = any, TProperties extends { [key: string]: any } = { [key: string]: any }> = {
    id: string;
    data: TData;
    parent: Node | null;
    properties: TProperties;
    children: { [key: string]: Node };
    actions: { [key: string]: Action };
    add(node: Pick<Node, 'id'> & Partial<Node>): Node;
    remove(id: string): Node;
    addAction(action: Action): void;
    removeAction(id: string): void;
    addProperty(key: string, value: any): void;
    removeProperty(key: string): void;
  };

  export type Action = {
    id: string;
    intent: Intent | Intent[];
  };
}
