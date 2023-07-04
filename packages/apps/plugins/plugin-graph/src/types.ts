//
// Copyright 2023 DXOS.org
//

import type { IconProps } from '@phosphor-icons/react';
import type { DeepSignal } from 'deepsignal';
import type { UIEvent, FC } from 'react';

import type { TFunction } from '@dxos/aurora';
import type { Plugin } from '@dxos/react-surface';

export type MaybePromise<T> = T | Promise<T>;

export type GraphNode<TDatum = any> = {
  id: string;
  label: string | [string, { ns: string; count?: number }];
  description?: string;
  icon?: FC;
  data?: TDatum; // nit about naming this
  attributes?: { [key: string]: any };
  parent?: GraphNode;
  pluginChildren?: { [key: string]: GraphNode[] };
  pluginActions?: { [key: string]: GraphNodeAction[] };
  readonly children?: GraphNode[];
  readonly actions?: GraphNodeAction[];
};

export type GraphNodeAction = {
  id: string;
  testId?: string;
  // todo(thure): `Parameters<TFunction>` causes typechecking issues because `TFunction` has so many signatures
  label: string | [string, { ns: string; count?: number }];
  icon?: FC<IconProps>;
  invoke: (t: TFunction, event: UIEvent) => MaybePromise<void>;
};

export type GraphContextValue = {
  roots: { [key: string]: GraphNode[] };
  actions: { [key: string]: GraphNodeAction[] };
};

export type GraphProvides = {
  graph: {
    nodes?: (parent: GraphNode, emit: (node?: GraphNode) => void, plugins: Plugin[]) => GraphNode[];
    actions?: (parent: GraphNode, emit: () => void, plugins: Plugin[]) => GraphNodeAction[];
  };
};

export type GraphPluginProvides = {
  graph: DeepSignal<GraphNode>;
};
