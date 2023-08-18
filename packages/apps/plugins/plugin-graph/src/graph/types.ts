//
// Copyright 2023 DXOS.org
//

import type { IconProps } from '@phosphor-icons/react';
import { FC } from 'react';

import type { Intent } from '@braneframe/plugin-intent';
import type { UnsubscribeCallback } from '@dxos/async';

export interface Graph {
  get root(): Graph.Node;
  getPath(id: string): string[] | undefined;
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
    direction?: 'up' | 'down';
    predicate?: (node: Node) => boolean;
    onVisitNode?: (node: Node) => void;
  };

  export type Node<TData = any, TProperties extends { [key: string]: any } = { [key: string]: any }> = {
    id: string;
    // TODO(thure): `Parameters<TFunction>` causes typechecking issues because `TFunction` has so many signatures.
    label: string | [string, { ns: string; count?: number }];
    description?: string | [string, { ns: string; count?: number }];
    icon?: FC<IconProps>;
    data: TData;
    parent: Node | null;
    properties: TProperties;
    childrenMap: { [key: string]: Node };
    actionsMap: { [key: string]: Action };
    get children(): Node[];
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

  export type Action<TProperties extends { [key: string]: any } = { [key: string]: any }> = {
    id: string;
    label: string | [string, { ns: string; count?: number }];
    icon?: FC<IconProps>;
    intent?: Intent | Intent[];
    properties: TProperties;
    actionsMap: { [key: string]: Action };
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
