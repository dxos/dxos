//
// Copyright 2023 DXOS.org
//

import type { IconProps } from '@phosphor-icons/react';
import type { getIndices } from '@tldraw/indices';
import type { DeepSignal } from 'deepsignal';
import type { FC } from 'react';

import type { Intent } from '@braneframe/plugin-intent';
import type { Plugin } from '@dxos/react-surface';

type Index = ReturnType<typeof getIndices>[number];

export type MaybePromise<T> = T | Promise<T>;

export type GraphNode<TDatum = any> = {
  id: string;
  index: Index;
  label: string | [string, { ns: string; count?: number }];
  description?: string;
  icon?: FC;
  data?: TDatum; // nit about naming this
  parent?: GraphNode;
  onChildrenRearrange?: (child: GraphNode, nextIndex: Index) => void;
  onMoveNode?: (source: GraphNode, target: GraphNode, child: GraphNode, nextIndex: Index) => void;
  attributes?: { [key: string]: any };
  pluginChildren?: { [key: string]: GraphNode[] };
  pluginActions?: { [key: string]: GraphNodeAction[] };
  // TODO(wittjosiah): https://github.com/luisherranz/deepsignal/issues/32
  // readonly children?: GraphNode[];
  // readonly actions?: GraphNodeAction[];
};

export type GraphNodeAction = {
  id: string;
  index: Index;
  testId?: string;
  // todo(thure): `Parameters<TFunction>` causes typechecking issues because `TFunction` has so many signatures
  label: string | [string, { ns: string; count?: number }];
  icon?: FC<IconProps>;
  disposition?: 'menu' | 'toolbar';
  intent: Intent | Intent[];
};

export type GraphContextValue = {
  graph: DeepSignal<GraphNode>;
  invokeAction: (action: GraphNodeAction) => Promise<void>;
};

export type GraphProvides = {
  graph: {
    nodes?: (parent: GraphNode, invalidate: (node?: GraphNode) => void, plugins: Plugin[]) => GraphNode[];
    actions?: (parent: GraphNode, invalidate: () => void) => GraphNodeAction[];
  };
};

export type GraphPluginProvides = {
  graph: DeepSignal<GraphNode>;
};
